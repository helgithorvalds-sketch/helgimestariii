/**
 * In-memory implementation of VildApi, seeded from ./seed and persisted to
 * localStorage (key "vild-mock"). Behaves like the real backend: credit is
 * computed by the same rule engine, the ledger keeps running balances, and
 * every call resolves asynchronously with a small delay so loading states
 * are real.
 */
import { ApiError, type Session, type VildApi } from './api';
import {
  DEMO_MERCHANT_ID,
  DEMO_USER_ID,
  MOCK_NOW,
  WELCOME_CREDIT,
  buildSettlements,
  buildStats,
  creditFor,
  locations as seedLocations,
  merchantUsers as seedMerchantUsers,
  merchants as seedMerchants,
  offers as seedOffers,
  productsAt,
  rewardRules as seedRules,
  sectors as seedSectors,
} from './seed';
import type { LedgerEntry, Location, Merchant, MerchantUser, Pocket, Product, Profile, RewardRule, WalletPass } from '../lib/types';

const STORAGE_KEY = 'vild-mock';
const SESSION_KEY = 'vild-mock-session';
const LATENCY_MS = 180;

type State = {
  profile: Profile;
  ledger: LedgerEntry[];
  rules: RewardRule[];
  locations: Location[];
  merchants: Merchant[];
  merchantUsers: MerchantUser[];
};

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function demoProfile(memberSince: string): Profile {
  return {
    id: DEMO_USER_ID,
    name: 'Helgi',
    legalName: 'Helgi Már Þorvaldsson',
    kennitalaMasked: null,
    phone: '+3546661234',
    email: 'helgi@example.is',
    eidVerifiedAt: null,
    memberSince,
    walletToken: 'VILD-DEMO-7F3A',
    avatarUrl: null,
    marketingOptIn: true,
    notificationsEnabled: true,
  };
}

/**
 * Six weeks of plausible history for the demo user, ending with a balance in the low thousands.
 * Same visits as vild_seed_demo_history() in supabase-vild/seed/seed.sql: lunch at 12:xx, dinner
 * at 19:xx (inside every venue's opening hours).
 */
const DEMO_VISITS: { daysAgo: number; hour: 12 | 19; loc: string; items: [string, number][]; spend?: number }[] = [
  { daysAgo: 41, hour: 12, loc: 'l_laugavegur', items: [['p_margherita', 1], ['p_soda', 1]] },
  { daysAgo: 38, hour: 19, loc: 'l_kringlan', items: [['p_luna_burger', 2], ['p_fries', 1], ['p_cola', 2]] },
  { daysAgo: 33, hour: 12, loc: 'l_laugavegur', items: [['p_chicken_salad', 1]] },
  { daysAgo: 30, hour: 19, loc: 'l_grandi', items: [['p_pepperoni', 1], ['p_cake', 1]], spend: 1500 },
  { daysAgo: 24, hour: 12, loc: 'l_smaralind', items: [['p_margherita', 1], ['p_coffee', 1]] },
  { daysAgo: 20, hour: 19, loc: 'l_laugavegur', items: [['p_sveppa', 1], ['p_parma', 1]], spend: 2000 },
  { daysAgo: 15, hour: 12, loc: 'l_kringlan', items: [['p_luna_burger', 1], ['p_fries', 1]] },
  { daysAgo: 11, hour: 12, loc: 'l_grandi', items: [['p_greek', 1], ['p_soda', 1]] },
  { daysAgo: 7, hour: 19, loc: 'l_fjordur', items: [['p_pepperoni', 2], ['p_garlic', 1]], spend: 1800 },
  { daysAgo: 3, hour: 12, loc: 'l_laugavegur', items: [['p_margherita', 1], ['p_cola', 1]] },
  { daysAgo: 1, hour: 19, loc: 'l_smaralind', items: [['p_chicken_salad', 1], ['p_cake', 1]] },
];

/** The demo member signed up (and got the welcome credit) the day before the first visit. */
function demoSignup(now: Date = new Date()): Date {
  const signup = new Date(now);
  signup.setDate(signup.getDate() - (Math.max(...DEMO_VISITS.map((v) => v.daysAgo)) + 1));
  signup.setHours(10, 12, 0, 0);
  return signup;
}

function demoLedger(products: Product[], rules: RewardRule[], signup: Date): LedgerEntry[] {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const visits = DEMO_VISITS;
  const now = new Date();
  const out: LedgerEntry[] = [];
  let balance = 0;
  const push = (e: Omit<LedgerEntry, 'id' | 'userId' | 'merchantId' | 'balanceAfter'>) => {
    balance += e.amount;
    out.push({ id: uid(), userId: DEMO_USER_ID, merchantId: DEMO_MERCHANT_ID, balanceAfter: balance, ...e });
  };
  // welcome credit on signup
  push({ locationId: null, kind: 'welcome', amount: WELCOME_CREDIT, purchaseTotal: null, description: 'Velkomin í VILD', items: null, createdAt: signup.toISOString(), receiptNo: null });
  let receipt = 48210;
  for (const v of visits) {
    const at = new Date(now);
    at.setDate(at.getDate() - v.daysAgo);
    at.setHours(v.hour, 12 + (v.daysAgo % 40), 0, 0);
    const items = v.items.map(([id, qty]) => {
      const p = byId[id];
      const c = creditFor(p, rules, at);
      return { name: p.name, qty, price: p.price, credit: c.amount * qty };
    });
    const total = items.reduce((a, i) => a + i.price * i.qty, 0);
    const credit = items.reduce((a, i) => a + i.credit, 0);
    const spend = Math.min(v.spend ?? 0, balance);
    receipt += 1 + (v.daysAgo % 7);
    if (spend > 0) {
      push({ locationId: v.loc, kind: 'spend', amount: -spend, purchaseTotal: total, description: 'Inneign nýtt', items: null, createdAt: new Date(at.getTime() - 1000).toISOString(), receiptNo: String(receipt) });
    }
    push({ locationId: v.loc, kind: 'earn', amount: credit, purchaseTotal: total, description: items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(', '), items, createdAt: at.toISOString(), receiptNo: String(receipt) });
  }
  return out;
}

function freshState(): State {
  const rules = seedRules.map((r) => ({ ...r }));
  const signup = demoSignup();
  return {
    profile: demoProfile(signup.toISOString()),
    ledger: demoLedger(productsAt(), rules, signup),
    rules,
    locations: seedLocations.map((l) => ({ ...l })),
    merchants: seedMerchants.map((m) => ({ ...m })),
    merchantUsers: seedMerchantUsers.map((u) => ({ ...u })),
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State & { v?: number };
      if (parsed && parsed.ledger && parsed.rules && parsed.v === 3) return parsed;
    }
  } catch {
    /* fall through */
  }
  return freshState();
}

export class MockApi implements VildApi {
  private state: State;
  private session: Session | null;
  private listeners = new Set<(s: Session | null) => void>();

  constructor(opts: { persist?: boolean; latency?: number } = {}) {
    this.persist = opts.persist ?? typeof localStorage !== 'undefined';
    this.latency = opts.latency ?? LATENCY_MS;
    this.state = this.persist ? load() : freshState();
    this.session = this.persist ? this.loadSession() : null;
  }
  private persist: boolean;
  private latency: number;

  /** Forget everything (profile menu → "Endurstilla prufugögn"). */
  reset(): void {
    this.state = freshState();
    this.save();
  }

  private save() {
    if (!this.persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...this.state, v: 3 }));
    } catch {
      /* quota: ignore */
    }
  }
  private loadSession(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
  private setSession(s: Session | null) {
    this.session = s;
    if (this.persist) {
      try {
        if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        else localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
    this.listeners.forEach((l) => l(s));
  }
  private async wait<T>(v: T): Promise<T> {
    if (this.latency) await sleep(this.latency);
    return v;
  }
  private products(at = new Date()): Product[] {
    return productsAt(at).map((p) => {
      const c = creditFor(p, this.state.rules, at);
      return { ...p, creditAmount: c.amount, creditPct: c.pct };
    });
  }

  // ---- session -----------------------------------------------------------
  async getSession() {
    return this.wait(this.session);
  }
  onSessionChange(cb: (s: Session | null) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  async startPhoneLogin(phone: string) {
    const digits = phone.replace(/\D/g, '').replace(/^354/, '');
    if (digits.length !== 7) throw new ApiError('INVALID_PHONE');
    await this.wait(null);
  }
  async verifyPhoneLogin(phone: string, code: string) {
    await this.wait(null);
    if (code.replace(/\D/g, '') !== '123456') throw new ApiError('INVALID_CODE');
    const s: Session = { userId: DEMO_USER_ID, kind: 'consumer' };
    this.state.profile.phone = `+354${phone.replace(/\D/g, '').replace(/^354/, '')}`;
    this.save();
    this.setSession(s);
    return s;
  }
  async startEidLogin() {
    await this.wait(null);
    await sleep(900); // "opening the Auðkenni app"
    this.state.profile.eidVerifiedAt = new Date().toISOString();
    this.state.profile.kennitalaMasked = '010190-xxxx';
    this.state.profile.legalName = 'Helgi Már Þorvaldsson';
    this.save();
    const s: Session = { userId: DEMO_USER_ID, kind: 'consumer' };
    this.setSession(s);
    return { url: null, session: s };
  }
  async merchantLogin(email: string, password: string) {
    await this.wait(null);
    const user = this.state.merchantUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.length < 4) throw new ApiError('INVALID_LOGIN');
    const s: Session = { userId: user.id, kind: 'merchant', merchantId: user.merchantId };
    this.setSession(s);
    return s;
  }
  async signOut() {
    await this.wait(null);
    this.setSession(null);
  }

  // ---- catalogue ---------------------------------------------------------
  async getSectors() {
    return this.wait(seedSectors);
  }
  async getMerchants() {
    return this.wait(this.state.merchants);
  }
  async getMerchant(slug: string) {
    return this.wait(this.state.merchants.find((m) => m.slug === slug || m.id === slug) ?? null);
  }
  async getLocations(merchantId?: string) {
    return this.wait(this.state.locations.filter((l) => !merchantId || l.merchantId === merchantId));
  }
  async getLocation(id: string) {
    return this.wait(this.state.locations.find((l) => l.id === id) ?? null);
  }
  async getProducts(merchantId: string) {
    return this.wait(this.products().filter((p) => p.merchantId === merchantId));
  }
  async getProduct(id: string) {
    return this.wait(this.products().find((p) => p.id === id) ?? null);
  }
  async getOffers(merchantId?: string) {
    return this.wait(seedOffers.filter((o) => !merchantId || o.merchantId === merchantId));
  }
  async getOffer(id: string) {
    return this.wait(seedOffers.find((o) => o.id === id) ?? null);
  }

  // ---- wallet ------------------------------------------------------------
  private requireConsumer(): string {
    if (!this.session || this.session.kind !== 'consumer') throw new ApiError('AUTH_REQUIRED');
    return this.session.userId;
  }
  async getProfile() {
    if (!this.session || this.session.kind !== 'consumer') return this.wait(null);
    return this.wait(this.state.profile);
  }
  async updateProfile(patch: Partial<Pick<Profile, 'name' | 'email' | 'marketingOptIn' | 'notificationsEnabled'>>) {
    this.requireConsumer();
    this.state.profile = { ...this.state.profile, ...patch };
    this.save();
    return this.wait(this.state.profile);
  }
  private computePockets(): Pocket[] {
    const userId = this.requireConsumer();
    const byMerchant = new Map<string, LedgerEntry[]>();
    for (const e of this.state.ledger) {
      if (e.userId !== userId) continue;
      byMerchant.set(e.merchantId, [...(byMerchant.get(e.merchantId) ?? []), e]);
    }
    return this.state.merchants.map((m) => {
      const entries = byMerchant.get(m.id) ?? [];
      const balance = entries.reduce((a, e) => a + e.amount, 0);
      const earnedTotal = entries.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0);
      const spentTotal = -entries.filter((e) => e.kind === 'spend').reduce((a, e) => a + e.amount, 0);
      const last = entries.map((e) => e.createdAt).sort().at(-1) ?? null;
      // credit expires 24 months after it was earned (same as Takk): the oldest earn still "inside" the balance
      const oldestEarn = entries.filter((e) => e.amount > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      const expiring = oldestEarn && balance > 0 ? { amount: Math.min(balance, oldestEarn.amount), at: new Date(new Date(oldestEarn.createdAt).getTime() + 730 * 86400000).toISOString() } : null;
      return { merchantId: m.id, sector: m.sector, balance, earnedTotal, spentTotal, lastActivityAt: last, expiring };
    });
  }
  async getPockets() {
    return this.wait(this.computePockets());
  }
  async getLedger(opts: { merchantId?: string; limit?: number } = {}) {
    const userId = this.requireConsumer();
    const rows = this.state.ledger
      .filter((e) => e.userId === userId && (!opts.merchantId || e.merchantId === opts.merchantId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.wait(opts.limit ? rows.slice(0, opts.limit) : rows);
  }
  async getLedgerEntry(id: string) {
    const userId = this.requireConsumer();
    return this.wait(this.state.ledger.find((e) => e.id === id && e.userId === userId) ?? null);
  }
  async getWalletPass(): Promise<WalletPass> {
    this.requireConsumer();
    const issued = new Date();
    const token = `${this.state.profile.walletToken}-${Math.floor(issued.getTime() / 60000).toString(36).toUpperCase()}`;
    return this.wait({ token, issuedAt: issued.toISOString(), expiresAt: new Date(issued.getTime() + 60_000).toISOString() });
  }
  async redeemQuote(merchantId: string, purchaseTotal: number, useCredit: boolean) {
    const pocket = this.computePockets().find((p) => p.merchantId === merchantId);
    const available = pocket?.balance ?? 0;
    const applied = useCredit ? Math.min(available, purchaseTotal) : 0;
    const merchant = this.state.merchants.find((m) => m.id === merchantId);
    const willEarn = Math.round(((purchaseTotal - applied) * (merchant?.defaultRatePct ?? 0)) / 100);
    return this.wait({ merchantId, purchaseTotal, available, applied, toPay: purchaseTotal - applied, willEarn });
  }
  async recordPurchase(input: { merchantId: string; locationId: string; items: { productId: string; qty: number }[]; useCredit: boolean }) {
    const userId = this.requireConsumer();
    const at = new Date();
    const products = this.products(at);
    const items = input.items.map(({ productId, qty }) => {
      const p = products.find((x) => x.id === productId);
      if (!p) throw new ApiError('NOT_FOUND');
      return { name: p.name, qty, price: p.price, credit: p.creditAmount * qty };
    });
    const total = items.reduce((a, i) => a + i.price * i.qty, 0);
    const pocket = this.computePockets().find((p) => p.merchantId === input.merchantId);
    let balance = pocket?.balance ?? 0;
    const receiptNo = String(50000 + this.state.ledger.length);
    const created: LedgerEntry[] = [];
    const spend = input.useCredit ? Math.min(balance, total) : 0;
    if (spend > 0) {
      balance -= spend;
      created.push({ id: uid(), userId, merchantId: input.merchantId, locationId: input.locationId, kind: 'spend', amount: -spend, purchaseTotal: total, description: 'Inneign nýtt', items: null, createdAt: new Date(at.getTime() - 500).toISOString(), receiptNo, balanceAfter: balance });
    }
    // credit is earned on the part paid with money, proportionally
    const paidShare = total > 0 ? (total - spend) / total : 0;
    const credit = Math.round(items.reduce((a, i) => a + i.credit, 0) * paidShare);
    balance += credit;
    created.push({ id: uid(), userId, merchantId: input.merchantId, locationId: input.locationId, kind: 'earn', amount: credit, purchaseTotal: total, description: items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(', '), items, createdAt: at.toISOString(), receiptNo, balanceAfter: balance });
    this.state.ledger.push(...created);
    this.save();
    return this.wait(created);
  }

  // ---- merchant portal ---------------------------------------------------
  async getMerchantStats(_merchantId: string, periodDays: number) {
    return this.wait(buildStats(periodDays, MOCK_NOW, this.state.rules));
  }
  async getRewardRules(merchantId: string) {
    return this.wait(this.state.rules.filter((r) => r.merchantId === merchantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async saveRewardRule(rule: Omit<RewardRule, 'id' | 'createdAt'> & { id?: string }) {
    const existing = rule.id ? this.state.rules.find((r) => r.id === rule.id) : undefined;
    const saved: RewardRule = existing ? { ...existing, ...rule, id: existing.id } : { ...rule, id: `r_${uid().slice(0, 8)}`, createdAt: new Date().toISOString() };
    this.state.rules = existing ? this.state.rules.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...this.state.rules];
    this.save();
    return this.wait(saved);
  }
  async deleteRewardRule(id: string) {
    this.state.rules = this.state.rules.filter((r) => r.id !== id);
    this.save();
    await this.wait(null);
  }
  async updateLocation(id: string, patch: Partial<Pick<Location, 'openingHours' | 'phone' | 'acceptsRedemption' | 'posVendor' | 'posStatus'>>) {
    const loc = this.state.locations.find((l) => l.id === id);
    if (!loc) throw new ApiError('NOT_FOUND');
    Object.assign(loc, patch);
    this.save();
    return this.wait(loc);
  }
  async getSettlements(merchantId: string) {
    return this.wait(buildSettlements(MOCK_NOW, this.state.rules).filter((s) => s.merchantId === merchantId));
  }
  async getMerchantUsers(merchantId: string) {
    return this.wait(this.state.merchantUsers.filter((u) => u.merchantId === merchantId));
  }
  async inviteMerchantUser(input: Omit<MerchantUser, 'id'>) {
    const user: MerchantUser = { ...input, id: `mu_${uid().slice(0, 8)}` };
    this.state.merchantUsers.push(user);
    this.save();
    return this.wait(user);
  }
  async removeMerchantUser(id: string) {
    this.state.merchantUsers = this.state.merchantUsers.filter((u) => u.id !== id);
    this.save();
    await this.wait(null);
  }
  async updateMerchant(id: string, patch: Partial<Pick<Merchant, 'description' | 'defaultRatePct' | 'website'>>) {
    const m = this.state.merchants.find((x) => x.id === id);
    if (!m) throw new ApiError('NOT_FOUND');
    Object.assign(m, patch);
    if (patch.defaultRatePct != null) {
      const base = this.state.rules.find((r) => r.scope === 'merchant' && r.merchantId === id && !r.weekdays && !r.hoursFrom);
      if (base) base.ratePct = patch.defaultRatePct;
    }
    this.save();
    return this.wait(m);
  }

  // ---- till (cashier) --------------------------------------------------
  private tillPocket(merchantId: string): { balance: number } {
    const entries = this.state.ledger.filter((e) => e.userId === DEMO_USER_ID && e.merchantId === merchantId);
    return { balance: entries.reduce((a, e) => a + e.amount, 0) };
  }
  async tillLookup(token: string) {
    const merchantId = this.session?.kind === 'merchant' ? this.session.merchantId : DEMO_MERCHANT_ID;
    if (!token.trim().toUpperCase().startsWith('VILD-DEMO')) return this.wait(null);
    const firstName = this.state.profile.name.split(/\s+/)[0];
    return this.wait({ firstName, balance: this.tillPocket(merchantId).balance, merchantId });
  }
  async tillCharge(input: { token: string; locationId: string; amount: number; useCredit: boolean }) {
    const found = await this.tillLookup(input.token);
    if (!found) throw new ApiError('NOT_FOUND');
    const merchant = this.state.merchants.find((m) => m.id === found.merchantId);
    const total = Math.max(0, Math.round(input.amount));
    let balance = found.balance;
    const at = new Date();
    const receiptNo = String(50000 + this.state.ledger.length);
    const applied = input.useCredit ? Math.min(balance, total) : 0;
    if (applied > 0) {
      balance -= applied;
      this.state.ledger.push({ id: uid(), userId: DEMO_USER_ID, merchantId: found.merchantId, locationId: input.locationId, kind: 'spend', amount: -applied, purchaseTotal: total, description: 'Inneign nýtt', items: null, createdAt: new Date(at.getTime() - 500).toISOString(), receiptNo, balanceAfter: balance });
    }
    const toPay = total - applied;
    const earned = Math.round((toPay * (merchant?.defaultRatePct ?? 0)) / 100);
    balance += earned;
    this.state.ledger.push({ id: uid(), userId: DEMO_USER_ID, merchantId: found.merchantId, locationId: input.locationId, kind: 'earn', amount: earned, purchaseTotal: total, description: 'Kaup við kassa', items: null, createdAt: at.toISOString(), receiptNo, balanceAfter: balance });
    this.save();
    return this.wait({ applied, toPay, earned, balanceAfter: balance });
  }
}
