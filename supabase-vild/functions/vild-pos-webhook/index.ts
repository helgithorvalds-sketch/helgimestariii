// vild-pos-webhook — a POS (or a chain's middleware) posts every identified receipt here.
//
//   POST /vild-pos-webhook[?vendor=noona]
//     headers  x-vild-api-key:    the key from vild_set_pos_connection (identifies the connection)
//              x-vild-signature:  sha256=<hex HMAC-SHA256(webhook_secret, raw body)>   (or "t=<unix>,v1=<hex>" over "<t>.<body>")
//              content-type:      application/json
//     body     the generic VILD receipt (receipt.ts) — or a Noona HQ sale event when the connection's
//              vendor is "noona" / ?vendor=noona (adapters/noona.ts maps it, assumptions documented there)
//     → 200 { purchase_id, applied, earned, balance_after, receipt_no, duplicate: false }
//       applied = credit used on this receipt, earned = new credit, balance_after = the guest's new
//       balance at this chain; print these on the receipt.
//     → 200 { duplicate: true, … }   same external_id and same body delivered again (idempotent replay)
//     → 202 { ignored: true }        a vendor event we do not process (e.g. Noona customer.created)
//     → 401 { code: 'UNAUTHORIZED' } unknown / revoked key or bad signature
//     → 409 { code: 'CONFLICT' }     same external_id with a different body
//     → 422 { code: 'INVALID_RECEIPT' | 'TOKEN_INVALID' | 'CUSTOMER_UNKNOWN' | 'LOCATION_UNKNOWN' | … , detail }
//
// Deploy with verify_jwt = false: the POS has no Supabase JWT; the API key + HMAC are the auth.
// Idempotency: vild_pos_events is unique on (connection, external_id) and keeps a body hash;
// vild_record_purchase is itself idempotent on (merchant, external_id).
// Logs never contain tokens, names or phone numbers (see _shared/edge.ts log()).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { json, log, parseJson, preflight, purchaseSummary, readRawBody, rpcError, serviceClient, sha256Hex, verifySignature } from '../_shared/edge.ts';
import { normaliseReceipt, redactReceipt, type Receipt } from './receipt.ts';
import { isNoonaPayload, noonaToReceipt } from './adapters/noona.ts';

const FN = 'vild-pos-webhook';

type Connection = { id: string; merchant_id: string; location_id: string | null; vendor: string; status: string; webhook_secret: string };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ code: 'NOT_FOUND' }, 404);
  const admin = serviceClient();
  const url = new URL(req.url);

  try {
    // 1. who is calling: api key → connection (hash lookup, never the key itself)
    const apiKey = req.headers.get('x-vild-api-key')?.trim();
    if (!apiKey || apiKey.length > 200) return json({ code: 'UNAUTHORIZED' }, 401);
    const keyHash = await sha256Hex(apiKey);
    const { data: conn } = await admin
      .from('vild_pos_connections')
      .select('id, merchant_id, location_id, vendor, status, webhook_secret')
      .eq('api_key_hash', keyHash)
      .maybeSingle();
    const connection = conn as Connection | null;
    if (!connection || connection.status !== 'active') {
      log(FN, 'warn', 'unknown or inactive api key');
      return json({ code: 'UNAUTHORIZED' }, 401);
    }

    // 2. the body must be signed with the connection's secret
    const raw = await readRawBody(req);
    if (raw instanceof Response) return raw;
    if (!(await verifySignature(connection.webhook_secret, raw, req.headers.get('x-vild-signature')))) {
      log(FN, 'warn', 'bad signature', { connection: connection.id });
      return json({ code: 'UNAUTHORIZED', detail: 'signature' }, 401);
    }
    const body = parseJson(raw);
    if (body === undefined) return json({ code: 'INVALID_RECEIPT', detail: 'json' }, 422);

    // 3. vendor adapter → generic receipt
    const vendor = (url.searchParams.get('vendor') ?? connection.vendor).toLowerCase();
    let candidate: unknown = body;
    if (vendor === 'noona' || isNoonaPayload(body)) {
      let mapped: Receipt | null;
      try {
        mapped = noonaToReceipt(body);
      } catch (err) {
        return json({ code: 'INVALID_RECEIPT', detail: err instanceof Error ? err.message : 'noona' }, 422);
      }
      if (!mapped) return json({ ignored: true }, 202);
      candidate = mapped;
    }
    const normalised = normaliseReceipt(candidate);
    if (!normalised.ok) return json({ code: 'INVALID_RECEIPT', detail: normalised.error }, 422);
    const receipt = normalised.receipt;
    const bodyHash = await sha256Hex(raw);

    // 4. idempotency: one row per (connection, external_id)
    const { data: existing } = await admin
      .from('vild_pos_events')
      .select('id, body_hash, status, purchase_id, error')
      .eq('connection_id', connection.id)
      .eq('external_id', receipt.external_id)
      .maybeSingle();
    if (existing) {
      if (existing.body_hash !== bodyHash) {
        log(FN, 'warn', 'conflicting redelivery', { connection: connection.id });
        return json({ code: 'CONFLICT', detail: 'external_id already used with a different body' }, 409);
      }
      if (existing.purchase_id) {
        const { data: rows } = await admin.from('vild_ledger').select('kind, amount, balance_after, purchase_id').eq('purchase_id', existing.purchase_id).order('created_at');
        const { data: p } = await admin.from('vild_purchases').select('receipt_no').eq('id', existing.purchase_id).maybeSingle();
        return json({ ...purchaseSummary((rows ?? []) as never), receipt_no: p?.receipt_no ?? null, duplicate: true });
      }
      // rejected before → same answer again (the POS should fix the receipt and use a new id)
      return json({ code: 'INVALID_RECEIPT', detail: existing.error ?? 'rejected earlier', duplicate: true }, 422);
    }
    const { data: event, error: eventError } = await admin
      .from('vild_pos_events')
      .insert({ connection_id: connection.id, external_id: receipt.external_id, body_hash: bodyHash, payload: { vendor, receipt: redactReceipt(receipt) }, status: 'received' })
      .select('id')
      .single();
    if (eventError || !event) {
      // a concurrent delivery won the race: tell the POS to retry, which then hits the replay branch
      if (eventError?.code === '23505') return json({ code: 'CONFLICT', detail: 'concurrent delivery, retry' }, 409);
      throw new Error(`event insert failed: ${eventError?.message}`);
    }
    const reject = async (code: string, detail: string, status = 422) => {
      await admin.from('vild_pos_events').update({ status: 'rejected', error: `${code}: ${detail}` }).eq('id', event.id);
      log(FN, 'warn', 'rejected', { connection: connection.id, code });
      return json({ code, detail }, status);
    };

    // 5. venue
    let locationId: string | null = null;
    if (receipt.location_id) {
      const { data: loc } = await admin.from('vild_locations').select('id').eq('id', receipt.location_id).eq('merchant_id', connection.merchant_id).maybeSingle();
      if (!loc) return await reject('LOCATION_UNKNOWN', `location_id ${receipt.location_id} is not a venue of this chain`);
      locationId = loc.id;
    } else if (receipt.location_external_id) {
      const { data: loc } = await admin.from('vild_locations').select('id').eq('pos_external_id', receipt.location_external_id).eq('merchant_id', connection.merchant_id).maybeSingle();
      if (!loc) return await reject('LOCATION_UNKNOWN', `no venue has pos_external_id ${receipt.location_external_id}`);
      locationId = loc.id;
    } else {
      locationId = connection.location_id;
    }

    // 6. customer: the QR token is consumed (one charge per token); the pass token is reusable
    let userId: string;
    if (receipt.customer.wallet_token) {
      const { data, error } = await admin.rpc('vild_consume_wallet_token', { p_token: receipt.customer.wallet_token });
      if (error || !data) return await reject('TOKEN_INVALID', 'expired, used or unknown wallet token');
      userId = data as string;
    } else {
      const { data } = await admin.from('vild_profiles').select('id').eq('id', receipt.customer.vild_customer_id as string).is('deleted_at', null).maybeSingle();
      if (!data) return await reject('CUSTOMER_UNKNOWN', 'vild_customer_id not found');
      userId = data.id;
    }

    // 7. the purchase
    const { data: rows, error } = await admin.rpc('vild_record_purchase', {
      p_merchant: connection.merchant_id,
      p_location: locationId,
      p_user: userId,
      p_items: receipt.items,
      p_use_credit: receipt.tender.credit_requested,
      p_source: 'pos_webhook',
      p_external_id: receipt.external_id,
      p_occurred_at: receipt.occurred_at ?? new Date().toISOString(),
      p_raw: { vendor, connection_id: connection.id, receipt_no: receipt.receipt_no ?? null },
    });
    if (error) {
      const e = rpcError(error.message);
      return await reject(e.code, e.detail ?? 'purchase rejected', e.status === 500 ? 500 : 422);
    }
    const summary = purchaseSummary((rows ?? []) as never);
    await admin.from('vild_pos_events').update({ status: 'processed', purchase_id: summary.purchase_id }).eq('id', event.id);
    await admin.from('vild_pos_connections').update({ last_event_at: new Date().toISOString() }).eq('id', connection.id);
    const { data: p } = summary.purchase_id ? await admin.from('vild_purchases').select('receipt_no').eq('id', summary.purchase_id).maybeSingle() : { data: null };
    log(FN, 'info', 'processed', { connection: connection.id, location: locationId, applied: summary.applied, earned: summary.earned });
    return json({ ...summary, receipt_no: p?.receipt_no ?? receipt.receipt_no ?? null, duplicate: false });
  } catch (err) {
    log(FN, 'error', 'unhandled', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'UNKNOWN' }, 500);
  }
});
