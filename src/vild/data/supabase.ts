/**
 * Supabase implementation of VildApi against the schema in supabase-vild/.
 *
 *   env  VITE_VILD_DATA=supabase
 *        VITE_VILD_SUPABASE_URL=https://<ref>.supabase.co
 *        VITE_VILD_SUPABASE_PUBLISHABLE_KEY=sb_publishable_… (or the anon key)
 *
 * Session model
 *   - consumers sign in with phone OTP (Supabase Auth, Twilio); the trigger in
 *     0001 creates vild_profiles + the welcome credit;
 *   - rafræn skilríki is a *verification* of the signed-in account (vild-eid
 *     /start returns the provider URL; the callback comes back to /vild/app/eg?eid=ok);
 *   - merchant users sign in with e-mail + password; the account must match an
 *     accepted invite in vild_merchant_users (vild_my_merchants decides).
 *   The chosen kind is remembered in localStorage ('vild-session-kind') because
 *   one auth user may be both a member and a merchant user.
 *
 * Writes: consumers only ever update their own profile and ask for tokens; every
 * money movement goes through vild_record_purchase (service role) — the demo
 * flow calls vild-till/demo, which production disables with
 * vild_settings.demo_purchases_enabled = false.
 */
import { createClient, type SupabaseClient, type AuthError, type PostgrestError } from '@supabase/supabase-js';
import { ApiError, type Session, type VildApi } from './api';
import type { Database, Tables, Views } from './database.types';
import type {
  LedgerEntry,
  Location,
  Merchant,
  MerchantStats,
  MerchantUser,
  Offer,
  Pocket,
  Product,
  Profile,
  RedeemQuote,
  RewardRule,
  Sector,
  Settlement,
  WalletPass,
} from '../lib/types';

const KIND_KEY = 'vild-session-kind';

/** The seeded demo member (supabase-vild/seed/test_users.sql). Only works while demo_purchases_enabled is true. */
const DEMO_PHONE = '+3546661234';
const DEMO_CODE = '123456';
const DEMO_EMAIL = 'helgi@demo.vild.is';
const DEMO_PASSWORD = (import.meta.env.VITE_VILD_DEMO_PASSWORD as string | undefined) ?? 'vild-demo-2026';

type Kind = 'consumer' | 'merchant';

// ---- row → frontend type -----------------------------------------------------
const toSector = (r: Tables<'vild_sectors'>): Sector => ({ slug: r.slug as Sector['slug'], name: r.name, pocketName: r.pocket_name, tagline: r.tagline, status: r.status, icon: r.icon });

const toMerchant = (r: Views<'vild_merchant_public'> & { legal_name?: string }): Merchant => ({
  id: r.id,
  slug: r.slug,
  sector: r.sector_slug as Merchant['sector'],
  name: r.name,
  legalName: r.legal_name ?? '',
  description: r.description,
  logoText: r.logo_text,
  brandColor: r.brand_color,
  heroImage: r.hero_image,
  defaultRatePct: Number(r.default_rate_pct),
  website: r.website,
  status: r.status,
});

const toLocation = (r: Tables<'vild_locations'>): Location => ({
  id: r.id,
  merchantId: r.merchant_id,
  name: r.name,
  address: r.address,
  city: r.city,
  lat: r.lat,
  lng: r.lng,
  openingHours: r.opening_hours,
  phone: r.phone,
  acceptsRedemption: r.accepts_redemption,
  posVendor: (r.pos_vendor as Location['posVendor']) ?? null,
  posStatus: r.pos_status,
});

const toProduct = (r: Views<'vild_products_public'>): Product => ({
  id: r.id,
  merchantId: r.merchant_id,
  name: r.name,
  category: r.category as Product['category'],
  price: r.price,
  image: r.image,
  description: r.description,
  creditAmount: Number(r.credit_amount),
  creditPct: Number(r.credit_pct),
  featured: r.featured,
});

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

const toRule = (r: Tables<'vild_reward_rules'>): RewardRule => ({
  id: r.id,
  merchantId: r.merchant_id,
  scope: r.scope,
  categoryId: (r.category as RewardRule['categoryId']) ?? null,
  productId: r.product_id,
  ratePct: r.rate_pct === null ? null : Number(r.rate_pct),
  fixedAmount: r.fixed_amount,
  name: r.name,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  weekdays: r.weekdays,
  hoursFrom: hhmm(r.hours_from),
  hoursTo: hhmm(r.hours_to),
  active: r.active,
  createdAt: r.created_at,
});

const toOffer = (r: Tables<'vild_offers'>): Offer => ({
  id: r.id,
  merchantId: r.merchant_id,
  title: r.title,
  body: r.body,
  image: r.image,
  creditAmount: r.credit_amount,
  creditPct: r.credit_pct === null ? null : Number(r.credit_pct),
  validUntil: r.valid_until,
  productIds: r.product_ids ?? [],
  tag: r.tag,
});

const toEntry = (r: Views<'vild_ledger_entries'>): LedgerEntry => ({
  id: r.id,
  userId: r.user_id,
  merchantId: r.merchant_id,
  locationId: r.location_id,
  kind: r.kind,
  amount: r.amount,
  purchaseTotal: r.purchase_total,
  description: r.description,
  items: r.items,
  createdAt: r.created_at,
  receiptNo: r.receipt_no,
  balanceAfter: r.balance_after,
});

const toMerchantUser = (r: Tables<'vild_merchant_users'>): MerchantUser => ({ id: r.id, merchantId: r.merchant_id, name: r.name, email: r.email, role: r.role, locationIds: r.location_ids });

const toSettlement = (r: Tables<'vild_settlements'>): Settlement => ({
  id: r.id,
  merchantId: r.merchant_id,
  periodFrom: r.period_from,
  periodTo: r.period_to,
  creditIssued: r.credit_issued,
  creditRedeemed: r.credit_redeemed,
  platformFee: r.platform_fee,
  status: r.status,
});

// ---- errors ------------------------------------------------------------------
/** The SQL functions raise 'CODE' or 'CODE: detail'; auth errors have fixed English messages. */
function fail(err: PostgrestError | AuthError | Error | null | undefined, fallback = 'UNKNOWN'): never {
  const msg = err?.message ?? '';
  const m = /^([A-Z_]{3,})(?::|$)/.exec(msg);
  if (m) throw new ApiError(m[1], msg);
  if (/invalid login credentials/i.test(msg)) throw new ApiError('INVALID_LOGIN', msg);
  if (/token has expired|invalid|otp/i.test(msg) && /otp|token/i.test(msg)) throw new ApiError('INVALID_CODE', msg);
  if (/fetch|network/i.test(msg)) throw new ApiError('NETWORK', msg);
  if (/not found|PGRST116/i.test(msg)) throw new ApiError('NOT_FOUND', msg);
  throw new ApiError(fallback, msg || fallback);
}

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^354/, '');
  if (digits.length !== 7) throw new ApiError('INVALID_PHONE');
  return `+354${digits}`;
}

function readKind(): Kind | null {
  try {
    const v = localStorage.getItem(KIND_KEY);
    return v === 'merchant' || v === 'consumer' ? v : null;
  } catch {
    return null;
  }
}
function writeKind(kind: Kind | null) {
  try {
    if (kind) localStorage.setItem(KIND_KEY, kind);
    else localStorage.removeItem(KIND_KEY);
  } catch {
    /* ignore */
  }
}

export class SupabaseApi implements VildApi {
  readonly client: SupabaseClient<Database>;
  private listeners = new Set<(s: Session | null) => void>();
  private lastSessionKey: string | null = null;

  constructor(opts: { url?: string; key?: string } = {}) {
    const url = opts.url ?? (import.meta.env.VITE_VILD_SUPABASE_URL as string | undefined);
    const key = opts.key ?? (import.meta.env.VITE_VILD_SUPABASE_PUBLISHABLE_KEY as string | undefined);
    if (!url || !key) throw new Error('VITE_VILD_SUPABASE_URL / VITE_VILD_SUPABASE_PUBLISHABLE_KEY are not set');
    this.client = createClient<Database>(url, key, {
      auth: { storageKey: 'vild-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    this.client.auth.onAuthStateChange((_event, s) => {
      void this.resolveSession(s?.user.id ?? null).then((session) => {
        const k = session ? `${session.kind}:${session.userId}` : null;
        if (k === this.lastSessionKey) return;
        this.lastSessionKey = k;
        this.listeners.forEach((l) => l(session));
      });
    });
  }

  private async resolveSession(userId: string | null): Promise<Session | null> {
    if (!userId) return null;
    if (readKind() === 'merchant') {
      const { data } = await this.client.rpc('vild_my_merchants');
      const first = data?.[0];
      if (first) return { userId, kind: 'merchant', merchantId: first.merchant_id };
    }
    return { userId, kind: 'consumer' };
  }

  private async userId(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new ApiError('AUTH_REQUIRED');
    return id;
  }

  private functionsUrl(path: string): string {
    const base = (import.meta.env.VITE_VILD_SUPABASE_URL as string).replace(/\/+$/, '');
    return `${base}/functions/v1/${path}`;
  }

  /** POST to an edge function with the user's JWT; non-2xx → ApiError(code from the body). */
  private async invoke<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.functions.invoke<T & { code?: string }>(path, { body });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const parsed = ctx ? ((await ctx.json().catch(() => ({}))) as { code?: string }) : {};
      if (ctx?.status === 401) throw new ApiError('AUTH_REQUIRED', error.message);
      throw new ApiError(parsed.code ?? (ctx ? 'UNKNOWN' : 'NETWORK'), error.message);
    }
    if (!data) throw new ApiError('UNKNOWN');
    return data;
  }

  // ---- session -----------------------------------------------------------
  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    const s = await this.resolveSession(data.session?.user.id ?? null);
    this.lastSessionKey = s ? `${s.kind}:${s.userId}` : null;
    return s;
  }
  onSessionChange(cb: (s: Session | null) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  /**
   * Demo account: the number 666 1234 with code 123456 signs in the seeded demo
   * member with a password (no SMS needed) while vild_settings.demo_purchases_enabled
   * is true. Every other number goes through Supabase phone OTP (needs an SMS provider).
   */
  private async demoLoginEnabled(): Promise<boolean> {
    const { data } = await this.client.from('vild_public_settings').select('value').eq('key', 'demo_purchases_enabled').maybeSingle();
    return data?.value === true;
  }
  async startPhoneLogin(phone: string) {
    const e164 = normalisePhone(phone);
    if (e164 === DEMO_PHONE && (await this.demoLoginEnabled())) return;
    const { error } = await this.client.auth.signInWithOtp({ phone: e164, options: { channel: 'sms' } });
    if (error) fail(error, 'INVALID_PHONE');
  }
  async verifyPhoneLogin(phone: string, code: string): Promise<Session> {
    const e164 = normalisePhone(phone);
    const digits = code.replace(/\D/g, '');
    let userId: string | undefined;
    if (e164 === DEMO_PHONE && (await this.demoLoginEnabled())) {
      if (digits !== DEMO_CODE) throw new ApiError('INVALID_CODE');
      const { data, error } = await this.client.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (error || !data.user) fail(error, 'INVALID_CODE');
      userId = data.user!.id;
    } else {
      const { data, error } = await this.client.auth.verifyOtp({ phone: e164, token: digits, type: 'sms' });
      if (error || !data.user) fail(error, 'INVALID_CODE');
      userId = data.user!.id;
    }
    writeKind('consumer');
    const s: Session = { userId: userId!, kind: 'consumer' };
    this.lastSessionKey = `consumer:${s.userId}`;
    this.listeners.forEach((l) => l(s));
    return s;
  }
  /** Returns the provider URL to open; the browser comes back to /vild/app/eg?eid=ok|error. Needs a phone session first. */
  async startEidLogin(next?: string): Promise<{ url: string | null; session: Session | null }> {
    const { data } = await this.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiError('AUTH_REQUIRED', 'Skráðu þig fyrst inn með símanúmeri; rafræn skilríki staðfesta aðganginn.');
    const url = new URL(this.functionsUrl('vild-eid/start'));
    if (next) url.searchParams.set('next', next);
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new ApiError('NETWORK');
    }
    const body = (await res.json().catch(() => ({}))) as { url?: string; code?: string };
    if (res.status === 503) throw new ApiError('EID_NOT_CONFIGURED');
    if (!res.ok || !body.url) throw new ApiError(body.code ?? 'EID_FAILED');
    return { url: body.url, session: null };
  }
  async merchantLogin(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) fail(error, 'INVALID_LOGIN');
    const { data: merchants } = await this.client.rpc('vild_my_merchants');
    const first = merchants?.[0];
    if (!first) {
      await this.client.auth.signOut();
      throw new ApiError('INVALID_LOGIN', 'Þetta netfang er ekki skráð hjá neinni keðju.');
    }
    writeKind('merchant');
    const s: Session = { userId: data.user!.id, kind: 'merchant', merchantId: first.merchant_id };
    this.lastSessionKey = `merchant:${s.userId}`;
    this.listeners.forEach((l) => l(s));
    return s;
  }
  async signOut() {
    writeKind(null);
    await this.client.auth.signOut();
  }

  // ---- catalogue ---------------------------------------------------------
  async getSectors(): Promise<Sector[]> {
    const { data, error } = await this.client.from('vild_sectors').select('*').order('sort');
    if (error) fail(error);
    return (data ?? []).map(toSector);
  }
  async getMerchants(): Promise<Merchant[]> {
    const { data, error } = await this.client.from('vild_merchant_public').select('*').order('name');
    if (error) fail(error);
    return (data ?? []).map(toMerchant);
  }
  async getMerchant(slug: string): Promise<Merchant | null> {
    const { data, error } = await this.client.from('vild_merchant_public').select('*').or(`slug.eq.${slug},id.eq.${slug}`).maybeSingle();
    if (error) fail(error);
    return data ? toMerchant(data) : null;
  }
  async getLocations(merchantId?: string): Promise<Location[]> {
    let q = this.client.from('vild_locations').select('*').order('name');
    if (merchantId) q = q.eq('merchant_id', merchantId);
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toLocation);
  }
  async getLocation(id: string): Promise<Location | null> {
    const { data, error } = await this.client.from('vild_locations').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toLocation(data) : null;
  }
  async getProducts(merchantId: string): Promise<Product[]> {
    const { data, error } = await this.client.from('vild_products_public').select('*').eq('merchant_id', merchantId).order('featured', { ascending: false }).order('name');
    if (error) fail(error);
    return (data ?? []).map(toProduct);
  }
  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await this.client.from('vild_products_public').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toProduct(data) : null;
  }
  async getOffers(merchantId?: string): Promise<Offer[]> {
    let q = this.client.from('vild_offers').select('*').eq('active', true).order('sort');
    if (merchantId) q = q.eq('merchant_id', merchantId);
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toOffer);
  }
  async getOffer(id: string): Promise<Offer | null> {
    const { data, error } = await this.client.from('vild_offers').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toOffer(data) : null;
  }

  // ---- wallet ------------------------------------------------------------
  async getProfile(): Promise<Profile | null> {
    const { data: auth } = await this.client.auth.getSession();
    const id = auth.session?.user.id;
    if (!id) return null;
    const { data, error } = await this.client.from('vild_profiles').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      legalName: data.legal_name,
      kennitalaMasked: data.kennitala ? `${data.kennitala.slice(0, 6)}-xxxx` : null,
      phone: data.phone,
      email: data.email,
      eidVerifiedAt: data.eid_verified_at,
      memberSince: data.member_since,
      // cosmetic card number; the QR itself comes from getWalletPass() (60 s tokens)
      walletToken: `VILD-${data.id.slice(0, 4).toUpperCase()}`,
      avatarUrl: data.avatar_url,
      marketingOptIn: data.marketing_opt_in,
      notificationsEnabled: data.notifications_enabled,
    };
  }
  async updateProfile(patch: Partial<Pick<Profile, 'name' | 'email' | 'marketingOptIn' | 'notificationsEnabled'>>): Promise<Profile> {
    const id = await this.userId();
    const row: Database['public']['Tables']['vild_profiles']['Update'] = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.marketingOptIn !== undefined) row.marketing_opt_in = patch.marketingOptIn;
    if (patch.notificationsEnabled !== undefined) row.notifications_enabled = patch.notificationsEnabled;
    const { error } = await this.client.from('vild_profiles').update(row).eq('id', id);
    if (error) fail(error);
    const profile = await this.getProfile();
    if (!profile) throw new ApiError('NOT_FOUND');
    return profile;
  }
  async getPockets(): Promise<Pocket[]> {
    const id = await this.userId();
    const [{ data: pockets, error }, merchants] = await Promise.all([this.client.from('vild_pockets').select('*').eq('user_id', id), this.getMerchants()]);
    if (error) fail(error);
    const byMerchant = new Map((pockets ?? []).map((p) => [p.merchant_id, p]));
    return merchants.map((m) => {
      const p = byMerchant.get(m.id);
      return {
        merchantId: m.id,
        sector: m.sector,
        balance: p?.balance ?? 0,
        earnedTotal: p?.earned_total ?? 0,
        spentTotal: p?.spent_total ?? 0,
        lastActivityAt: p?.last_activity_at ?? null,
        expiring: p?.next_expiry_at && p.next_expiry_amount ? { amount: p.next_expiry_amount, at: p.next_expiry_at } : null,
      };
    });
  }
  async getLedger(opts: { merchantId?: string; limit?: number } = {}): Promise<LedgerEntry[]> {
    const id = await this.userId();
    let q = this.client.from('vild_ledger_entries').select('*').eq('user_id', id).order('created_at', { ascending: false });
    if (opts.merchantId) q = q.eq('merchant_id', opts.merchantId);
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) fail(error);
    return (data ?? []).map(toEntry);
  }
  async getLedgerEntry(id: string): Promise<LedgerEntry | null> {
    const uid = await this.userId();
    const { data, error } = await this.client.from('vild_ledger_entries').select('*').eq('id', id).eq('user_id', uid).maybeSingle();
    if (error) fail(error);
    return data ? toEntry(data) : null;
  }
  async getWalletPass(): Promise<WalletPass> {
    const id = await this.userId();
    const { data, error } = await this.client.rpc('vild_issue_wallet_token', { p_user: id });
    const row = data?.[0];
    if (error || !row) fail(error);
    return { token: row!.token, issuedAt: row!.issued_at, expiresAt: row!.expires_at };
  }
  async redeemQuote(merchantId: string, purchaseTotal: number, useCredit: boolean): Promise<RedeemQuote> {
    const id = await this.userId();
    const { data, error } = await this.client.rpc('vild_redeem_quote', { p_user: id, p_merchant: merchantId, p_total: Math.round(purchaseTotal), p_use_credit: useCredit });
    const row = data?.[0];
    if (error || !row) fail(error);
    return { merchantId, purchaseTotal, available: row!.available, applied: row!.applied, toPay: row!.to_pay, willEarn: row!.will_earn };
  }
  /** Demo only: vild-till/demo records the purchase with the user's own JWT while vild_settings.demo_purchases_enabled is true. */
  async recordPurchase(input: { merchantId: string; locationId: string; items: { productId: string; qty: number }[]; useCredit: boolean }): Promise<LedgerEntry[]> {
    await this.userId();
    const data = await this.invoke<{ purchase_id: string | null }>('vild-till/demo', {
      merchant_id: input.merchantId,
      location_id: input.locationId,
      items: input.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
      use_credit: input.useCredit,
    });
    if (!data.purchase_id) throw new ApiError('UNKNOWN');
    const { data: rows, error: readError } = await this.client.from('vild_ledger_entries').select('*').eq('purchase_id', data.purchase_id).order('created_at');
    if (readError) fail(readError);
    return (rows ?? []).map(toEntry);
  }

  // ---- till (cashier) ----------------------------------------------------
  /** vild-till/lookup with the merchant user's JWT: first name + balance at this chain; null for an unknown/expired code. */
  async tillLookup(token: string): Promise<{ firstName: string; balance: number; merchantId: string } | null> {
    const session = await this.getSession();
    if (!session) throw new ApiError('AUTH_REQUIRED');
    const merchantId = session.kind === 'merchant' ? session.merchantId : undefined;
    try {
      const data = await this.invoke<{ customer: { first_name: string }; balance: number; merchant_id: string | null }>('vild-till/lookup', {
        token: token.trim().toUpperCase(),
        merchant_id: merchantId,
      });
      return { firstName: data.customer.first_name, balance: data.balance, merchantId: data.merchant_id ?? merchantId ?? '' };
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'TOKEN_INVALID' || err.code === 'NOT_FOUND')) return null;
      throw err;
    }
  }
  /** vild-till/charge: consumes the code, spends credit if asked, earns at the chain rate on the money part. */
  async tillCharge(input: { token: string; locationId: string; amount: number; useCredit: boolean }): Promise<{ applied: number; toPay: number; earned: number; balanceAfter: number }> {
    const total = Math.max(0, Math.round(input.amount));
    const data = await this.invoke<{ applied: number; earned: number; balance_after: number; to_pay: number | null }>('vild-till/charge', {
      token: input.token.trim().toUpperCase(),
      location_id: input.locationId,
      amount: total,
      use_credit: input.useCredit,
      idempotency_key: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    });
    return { applied: data.applied, toPay: data.to_pay ?? total - data.applied, earned: data.earned, balanceAfter: data.balance_after };
  }

  // ---- merchant portal ---------------------------------------------------
  async getMerchantStats(merchantId: string, periodDays: number): Promise<MerchantStats> {
    const { data, error } = await this.client.rpc('vild_merchant_stats', { p_merchant: merchantId, p_days: periodDays });
    if (error || !data) fail(error);
    return data as unknown as MerchantStats;
  }
  async getRewardRules(merchantId: string): Promise<RewardRule[]> {
    const { data, error } = await this.client.from('vild_reward_rules').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toRule);
  }
  async saveRewardRule(rule: Omit<RewardRule, 'id' | 'createdAt'> & { id?: string }): Promise<RewardRule> {
    const row = {
      merchant_id: rule.merchantId,
      scope: rule.scope,
      category: rule.scope === 'category' ? rule.categoryId : null,
      product_id: rule.scope === 'product' ? rule.productId : null,
      rate_pct: rule.fixedAmount != null ? null : rule.ratePct ?? 0,
      fixed_amount: rule.fixedAmount ?? null,
      name: rule.name,
      starts_at: rule.startsAt,
      ends_at: rule.endsAt,
      weekdays: rule.weekdays && rule.weekdays.length ? rule.weekdays : null,
      hours_from: rule.hoursFrom || null,
      hours_to: rule.hoursTo || null,
      active: rule.active,
    };
    const q = rule.id
      ? this.client.from('vild_reward_rules').update(row).eq('id', rule.id).select('*').single()
      : this.client.from('vild_reward_rules').insert(row).select('*').single();
    const { data, error } = await q;
    if (error || !data) fail(error);
    return toRule(data!);
  }
  async deleteRewardRule(id: string): Promise<void> {
    const { error } = await this.client.from('vild_reward_rules').delete().eq('id', id);
    if (error) fail(error);
  }
  async updateLocation(id: string, patch: Partial<Pick<Location, 'openingHours' | 'phone' | 'acceptsRedemption' | 'posVendor' | 'posStatus'>>): Promise<Location> {
    const row: Database['public']['Tables']['vild_locations']['Update'] = {};
    if (patch.openingHours !== undefined) row.opening_hours = patch.openingHours;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.acceptsRedemption !== undefined) row.accepts_redemption = patch.acceptsRedemption;
    if (patch.posVendor !== undefined) row.pos_vendor = patch.posVendor;
    if (patch.posStatus !== undefined) row.pos_status = patch.posStatus;
    const { data, error } = await this.client.from('vild_locations').update(row).eq('id', id).select('*').single();
    if (error || !data) fail(error, 'NOT_FOUND');
    return toLocation(data!);
  }
  async getSettlements(merchantId: string): Promise<Settlement[]> {
    const { data, error } = await this.client.from('vild_settlements').select('*').eq('merchant_id', merchantId).order('period_from', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toSettlement);
  }
  async getMerchantUsers(merchantId: string): Promise<MerchantUser[]> {
    const { data, error } = await this.client.from('vild_merchant_users').select('*').eq('merchant_id', merchantId).order('invited_at');
    if (error) fail(error);
    return (data ?? []).map(toMerchantUser);
  }
  async inviteMerchantUser(input: Omit<MerchantUser, 'id'>): Promise<MerchantUser> {
    const { data, error } = await this.client.rpc('vild_invite_merchant_user', {
      p_merchant: input.merchantId,
      p_name: input.name,
      p_email: input.email,
      p_role: input.role,
      p_location_ids: input.locationIds,
    });
    if (error || !data) fail(error);
    return toMerchantUser(data!);
  }
  async removeMerchantUser(id: string): Promise<void> {
    const { error } = await this.client.from('vild_merchant_users').delete().eq('id', id);
    if (error) fail(error);
  }
  async updateMerchant(id: string, patch: Partial<Pick<Merchant, 'description' | 'defaultRatePct' | 'website'>>): Promise<Merchant> {
    const row: Database['public']['Tables']['vild_merchants']['Update'] = {};
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.defaultRatePct !== undefined) row.default_rate_pct = patch.defaultRatePct;
    if (patch.website !== undefined) row.website = patch.website;
    const { error } = await this.client.from('vild_merchants').update(row).eq('id', id);
    if (error) fail(error);
    if (patch.defaultRatePct != null) {
      // keep the always-on merchant rule in step with the chain rate (same as the mock)
      await this.client.from('vild_reward_rules').update({ rate_pct: patch.defaultRatePct }).eq('merchant_id', id).eq('scope', 'merchant').is('weekdays', null).is('hours_from', null);
    }
    const m = await this.getMerchant(id);
    if (!m) throw new ApiError('NOT_FOUND');
    return m;
  }
}

let instance: SupabaseApi | null = null;
export function getSupabaseApi(): SupabaseApi {
  if (!instance) instance = new SupabaseApi();
  return instance;
}
