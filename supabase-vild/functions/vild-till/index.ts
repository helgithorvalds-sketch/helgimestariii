// vild-till — the scan path for cashiers (merchant app "Prufukassi" / cashier phone) and the
// in-app demo purchase.
//
//   POST /vild-till/lookup   { token }                                  merchant user (staff+)
//        → 200 { customer: { first_name }, token_kind, balance, merchant_id }
//   POST /vild-till/charge   { token, location_id, amount?, items?, use_credit, idempotency_key? }
//                                                                       merchant user (staff+) of the venue's chain
//        → 200 { purchase_id, applied, earned, balance_after, total, to_pay }
//        items: [{ product_id | sku | name, qty, unit_price? }]; without items one line
//        "Kaup" at `amount` is recorded (chain default rate).
//   POST /vild-till/demo     { merchant_id, location_id, items, use_credit }  consumer (own account)
//        → same shape as /charge. Only while vild_settings.demo_purchases_enabled = true.
//        Production turns it off: real purchases come from the POS or a cashier.
//
// Auth: Supabase JWT in Authorization (verify_jwt may stay on for this function).
// The merchant check is the same rule as public.vild_is_merchant_user, evaluated
// here against vild_merchant_users and the optional per-venue restriction.
// Errors: 401 AUTH_REQUIRED, 403 FORBIDDEN, 404 NOT_FOUND, 409 (idempotency conflict /
// INSUFFICIENT_CREDIT), 422 TOKEN_INVALID | INVALID_INPUT, 503 DEMO_DISABLED.
// The cashier never sees a kennitala, phone number or full name: only the first name.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { isMerchantUser, json, log, merchantMemberships, parseJson, preflight, purchaseSummary, readRawBody, requireUser, rpcError, serviceClient } from '../_shared/edge.ts';

const FN = 'vild-till';

type Item = { product_id?: string; sku?: string; name?: string; qty: number; unit_price?: number };

function cleanItems(raw: unknown): Item[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 100) return null;
  const items: Item[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') return null;
    const r = x as Record<string, unknown>;
    const qty = Number(r.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) return null;
    const item: Item = { qty };
    if (typeof r.product_id === 'string' && r.product_id) item.product_id = r.product_id;
    if (typeof r.sku === 'string' && r.sku) item.sku = r.sku;
    if (typeof r.name === 'string' && r.name.trim()) item.name = r.name.trim().slice(0, 120);
    if (r.unit_price !== undefined && r.unit_price !== null) {
      const up = Number(r.unit_price);
      if (!Number.isInteger(up) || up < 0 || up > 10_000_000) return null;
      item.unit_price = up;
    }
    if (!item.product_id && !item.sku && !item.name) return null;
    items.push(item);
  }
  return items;
}

async function lookup(body: Record<string, unknown>, merchantId: string | null) {
  const admin = serviceClient();
  const { data, error } = await admin.rpc('vild_resolve_wallet_token', { p_token: String(body.token ?? '') });
  if (error) {
    const e = rpcError(error.message);
    return json({ code: e.code }, e.status);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return json({ code: 'TOKEN_INVALID' }, 422);
  const pockets = (row.pockets ?? []) as { merchant_id: string; balance: number }[];
  const pocket = merchantId ? pockets.find((p) => p.merchant_id === merchantId) : undefined;
  return json({
    customer: { first_name: row.first_name },
    token_kind: row.token_kind,
    used: row.used,
    merchant_id: merchantId,
    balance: pocket?.balance ?? 0,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ code: 'NOT_FOUND' }, 404);
  const url = new URL(req.url);
  const route = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const admin = serviceClient();

  try {
    const user = await requireUser(req, admin);
    if (user instanceof Response) return user;
    const raw = await readRawBody(req, 64_000);
    if (raw instanceof Response) return raw;
    const body = parseJson(raw) as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') return json({ code: 'INVALID_INPUT', detail: 'json body' }, 422);

    // ---- consumer demo purchase ------------------------------------------------
    if (route === 'demo') {
      const { data: setting } = await admin.from('vild_settings').select('value').eq('key', 'demo_purchases_enabled').maybeSingle();
      if (setting?.value !== true) return json({ code: 'DEMO_DISABLED' }, 503);
      const items = cleanItems(body.items);
      if (!items || typeof body.merchant_id !== 'string' || typeof body.location_id !== 'string') return json({ code: 'INVALID_INPUT' }, 422);
      const { data, error } = await admin.rpc('vild_record_purchase', {
        p_merchant: body.merchant_id,
        p_location: body.location_id,
        p_user: user.userId,
        p_items: items,
        p_use_credit: Boolean(body.use_credit),
        p_source: 'demo',
        p_external_id: null,
        p_occurred_at: new Date().toISOString(),
        p_raw: null,
      });
      if (error) {
        const e = rpcError(error.message);
        return json({ code: e.code, detail: e.detail }, e.status);
      }
      const rows = (data ?? []) as Parameters<typeof purchaseSummary>[0];
      log(FN, 'info', 'demo purchase', { merchant: body.merchant_id, rows: rows.length });
      return json({ ...purchaseSummary(rows), entries: rows });
    }

    // ---- cashier routes ------------------------------------------------------
    const memberships = await merchantMemberships(admin, user.userId);
    if (memberships.length === 0) return json({ code: 'FORBIDDEN' }, 403);

    if (route === 'lookup') {
      const merchantId = typeof body.merchant_id === 'string' ? body.merchant_id : memberships.length === 1 ? memberships[0].merchantId : null;
      if (merchantId && !isMerchantUser(memberships, merchantId, 'staff')) return json({ code: 'FORBIDDEN' }, 403);
      return await lookup(body, merchantId);
    }

    if (route === 'charge') {
      const locationId = typeof body.location_id === 'string' ? body.location_id : '';
      const { data: loc } = await admin.from('vild_locations').select('id, merchant_id, accepts_redemption').eq('id', locationId).maybeSingle();
      if (!loc) return json({ code: 'NOT_FOUND', detail: 'location' }, 404);
      if (!isMerchantUser(memberships, loc.merchant_id, 'staff', loc.id)) return json({ code: 'FORBIDDEN' }, 403);

      let items = cleanItems(body.items);
      if (!items) {
        const amount = Number(body.amount);
        if (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000) return json({ code: 'INVALID_INPUT', detail: 'amount or items' }, 422);
        items = [{ name: 'Kaup', qty: 1, unit_price: amount }];
      }
      const idem = typeof body.idempotency_key === 'string' && body.idempotency_key ? body.idempotency_key.slice(0, 120) : crypto.randomUUID();

      // the token is consumed first: a QR token can be charged once
      const { data: userId, error: tokenError } = await admin.rpc('vild_consume_wallet_token', { p_token: String(body.token ?? '') });
      if (tokenError || !userId) return json({ code: 'TOKEN_INVALID' }, 422);

      const { data, error } = await admin.rpc('vild_record_purchase', {
        p_merchant: loc.merchant_id,
        p_location: loc.id,
        p_user: userId,
        p_items: items,
        p_use_credit: Boolean(body.use_credit),
        p_source: 'till',
        p_external_id: `till:${idem}`,
        p_occurred_at: new Date().toISOString(),
        p_raw: { cashier: user.userId, idempotency_key: idem },
      });
      if (error) {
        const e = rpcError(error.message);
        log(FN, 'warn', 'charge failed', { code: e.code, location: loc.id });
        return json({ code: e.code, detail: e.detail }, e.status);
      }
      const rows = (data ?? []) as Parameters<typeof purchaseSummary>[0];
      const summary = purchaseSummary(rows);
      const total = items.reduce((a, i) => a + (i.unit_price ?? 0) * i.qty, 0);
      log(FN, 'info', 'charge', { location: loc.id, applied: summary.applied, earned: summary.earned });
      return json({ ...summary, total: total || null, to_pay: total ? total - summary.applied : null });
    }

    return json({ code: 'NOT_FOUND' }, 404);
  } catch (err) {
    log(FN, 'error', 'unhandled', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'UNKNOWN' }, 500);
  }
});
