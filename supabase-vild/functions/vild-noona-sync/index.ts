// vild-noona-sync — pulls the product catalogue of a chain from Noona HQ and upserts
// vild_products with external_sku = the Noona product id, so webhook lines map by sku.
//
//   POST /vild-noona-sync  { connection_id }      merchant owner/manager of that chain, or cron secret
//     → 200 { fetched, upserted, skipped }
//
// STATUS: STUB, UNVERIFIED against the live API. What is known (research §A.1):
// docs.noona.is describes an OAuth 2.0 "HQ API" with a Products resource and an
// app marketplace. What is assumed here and must be confirmed with Noona:
//   * token endpoint  POST https://api.noona.is/oauth/token  grant_type=client_credentials  [unverified]
//   * products        GET  https://api.noona.is/v1/hq/companies/{company_id}/products?page=N  [unverified]
//   * product shape   { id, title, sku?, price (whole ISK?), category?, image_url?, archived? }  [unverified]
// The connection's config jsonb holds { client_id, client_secret, company_id, base_url? }
// (written through vild_set_pos_connection by the owner). Secrets never reach the logs.
//
// Mapping (vild_products): external_sku = product.id; name = title; price = round(price);
// category = a keyword guess from the title (pizza/burger/salad/drink/dessert/side/coffee/other);
// image = image_url or ''; featured stays as set in VILD; active = !archived. The VILD id for a
// new product is 'p_' + a slug of the title (unique per chain), so the app keeps readable ids.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { hasValidCronSecret, isMerchantUser, json, log, merchantMemberships, parseJson, preflight, readRawBody, requireUser, serviceClient } from '../_shared/edge.ts';

const FN = 'vild-noona-sync';
const DEFAULT_BASE = 'https://api.noona.is'; // [unverified]

type NoonaProduct = { id: string; title?: string; name?: string; sku?: string; price?: number; category?: string; image_url?: string; archived?: boolean };

export function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (/pizz|píts|pits/.test(t)) return 'pizza';
  if (/borgar|burger/.test(t)) return 'burger';
  if (/salat|salad/.test(t)) return 'salad';
  if (/kaffi|coffee|latte|espresso|cappuccino/.test(t)) return 'coffee';
  if (/kók|cola|gos|vatn|safi|drykk|soda|bjór|vín/.test(t)) return 'drink';
  if (/kaka|ís|eftirrétt|dessert|brownie/.test(t)) return 'dessert';
  if (/fransk|brauð|sósa|meðlæti|fries|side/.test(t)) return 'side';
  return 'other';
}

export function slugId(title: string, taken: Set<string>): string {
  const base =
    'p_' +
    title
      .toLowerCase()
      .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/ý/g, 'y')
      .replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'vara';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  taken.add(id);
  return id;
}

async function accessToken(cfg: Record<string, unknown>): Promise<string> {
  const base = typeof cfg.base_url === 'string' ? cfg.base_url.replace(/\/+$/, '') : DEFAULT_BASE;
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: String(cfg.client_id ?? ''), client_secret: String(cfg.client_secret ?? ''), scope: 'products:read' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`noona token HTTP ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('noona token response without access_token');
  return data.access_token;
}

async function* products(cfg: Record<string, unknown>, token: string): AsyncGenerator<NoonaProduct> {
  const base = typeof cfg.base_url === 'string' ? cfg.base_url.replace(/\/+$/, '') : DEFAULT_BASE;
  for (let page = 1; page < 100; page++) {
    const res = await fetch(`${base}/v1/hq/companies/${encodeURIComponent(String(cfg.company_id ?? ''))}/products?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`noona products HTTP ${res.status}`);
    const data = (await res.json()) as NoonaProduct[] | { data?: NoonaProduct[] };
    const list = Array.isArray(data) ? data : (data.data ?? []);
    for (const p of list) yield p;
    if (list.length < 100) return;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ code: 'NOT_FOUND' }, 404);
  const admin = serviceClient();
  try {
    const raw = await readRawBody(req, 16_000);
    if (raw instanceof Response) return raw;
    const body = (parseJson(raw) ?? {}) as Record<string, unknown>;
    const connectionId = typeof body.connection_id === 'string' ? body.connection_id : '';
    if (!connectionId) return json({ code: 'INVALID_INPUT', detail: 'connection_id' }, 422);

    const { data: conn } = await admin.from('vild_pos_connections').select('id, merchant_id, vendor, status, config').eq('id', connectionId).maybeSingle();
    if (!conn || conn.status !== 'active') return json({ code: 'NOT_FOUND' }, 404);
    if (conn.vendor !== 'noona') return json({ code: 'INVALID_INPUT', detail: 'not a noona connection' }, 422);

    if (!(await hasValidCronSecret(req, admin))) {
      const user = await requireUser(req, admin);
      if (user instanceof Response) return user;
      const memberships = await merchantMemberships(admin, user.userId);
      if (!isMerchantUser(memberships, conn.merchant_id, 'manager')) return json({ code: 'FORBIDDEN' }, 403);
    }

    const cfg = (conn.config ?? {}) as Record<string, unknown>;
    if (!cfg.client_id || !cfg.client_secret || !cfg.company_id) return json({ code: 'NOONA_NOT_CONFIGURED', detail: 'config needs client_id, client_secret, company_id' }, 503);

    const token = await accessToken(cfg);
    const { data: existing } = await admin.from('vild_products').select('id, external_sku').eq('merchant_id', conn.merchant_id);
    const taken = new Set((existing ?? []).map((p) => p.id as string));
    const bySku = new Map((existing ?? []).filter((p) => p.external_sku).map((p) => [p.external_sku as string, p.id as string]));

    let fetched = 0;
    let upserted = 0;
    let skipped = 0;
    for await (const p of products(cfg, token)) {
      fetched++;
      const title = (p.title ?? p.name ?? '').trim();
      if (!p.id || !title || typeof p.price !== 'number') { skipped++; continue; }
      const id = bySku.get(p.id) ?? slugId(title, taken);
      const row = {
        id,
        merchant_id: conn.merchant_id,
        external_sku: p.id,
        name: title.slice(0, 120),
        price: Math.max(0, Math.round(p.price)),
        category: guessCategory(title),
        image: typeof p.image_url === 'string' && /^https:\/\//.test(p.image_url) ? p.image_url : '',
        active: !p.archived,
      };
      const { error } = await admin.from('vild_products').upsert(row, { onConflict: 'id' });
      if (error) { skipped++; log(FN, 'warn', 'upsert failed', { code: error.code }); continue; }
      bySku.set(p.id, id);
      upserted++;
    }
    log(FN, 'info', 'synced', { merchant: conn.merchant_id, fetched, upserted, skipped });
    return json({ fetched, upserted, skipped });
  } catch (err) {
    log(FN, 'error', 'sync failed', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'NOONA_SYNC_FAILED' }, 502);
  }
});
