// Noona HQ → generic VILD receipt.
//
// STATUS: UNVERIFIED against the live API. docs.noona.is documents an OAuth 2.0
// HQ API with Companies, Customers, Sales, Transactions, Products, Payments,
// Vouchers, Credit wallets and Webhooks (research doc §A.1), but the exact
// webhook event names and the sale payload field names are behind the
// developer login. Everything below is the shape we *expect*; each guess is
// marked. Replace with the real contract after the Noona developer call and
// keep noona_test.mjs green.
//
// Assumed delivery (ask Noona):
//   POST <our webhook URL>  with  x-vild-api-key / x-vild-signature set by us in
//   the Noona app's webhook configuration (if Noona signs with its own header,
//   add a branch in index.ts that verifies that header instead).
//   {
//     "event": "sale.completed",                 // [unverified] also seen as "sale.created" in similar APIs
//     "company_id": "cmp_…",
//     "location_id": "loc_…",                    // [unverified] mapped via vild_locations.pos_external_id
//     "data": {
//       "id": "sale_…",                           // → external_id
//       "number": 1042,                           // [unverified] printed receipt number
//       "completed_at" | "created_at": ISO,
//       "customer": { "id": "…", "name": "…", "phone": "…" },   // dropped (PII); a Noona customer id is NOT a VILD id
//       "lines": [ { "product_id": "prd_…", "sku": "…", "title": "Margherita", "quantity": 1, "unit_price": 2990, "total": 2990 } ],
//                                                 // [unverified] "lines" vs "items", "title" vs "name"; amounts assumed whole ISK, not aurar
//       "total": 3970,
//       "currency": "ISK",
//       "note": "VILD-7F3A-9Q2K",                 // [assumption] the cashier scans the QR into the sale note or a custom field
//       "custom_fields": { "vild_token": "VILD-…", "vild_use_credit": true },
//       "payments": [ { "method": "card", "amount": 3970 }, { "method": "voucher", "name": "VILD inneign", "amount": 500 } ]
//                                                 // [assumption] a payment line whose method/name mentions VILD or inneign means credit was requested
//     }
//   }
import type { Receipt } from '../receipt.ts';
import { TOKEN_RE } from '../receipt.ts';

type Dict = Record<string, unknown>;

const TOKEN_SCAN = /(?<![A-Z2-9-])VILDP?-[A-Z2-9]{4,20}(?:-[A-Z2-9]{4})?(?![A-Z2-9-])/i;

function dict(v: unknown): Dict {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Dict) : {};
}

/** Find a VILD token anywhere a cashier could have put it. */
export function findToken(data: Dict): string | undefined {
  const custom = dict(data.custom_fields);
  const meta = dict(data.metadata);
  const candidates = [custom.vild_token, meta.vild_token, data.vild_token, data.note, data.notes, data.reference, data.comment, custom.note, dict(data.customer).external_id];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const m = TOKEN_SCAN.exec(c.toUpperCase());
    if (m && TOKEN_RE.test(m[0])) return m[0];
  }
  return undefined;
}

/** Was VILD credit requested? Looks at an explicit custom field, then at the payment lines. */
export function creditRequested(data: Dict): boolean {
  const custom = dict(data.custom_fields);
  if (custom.vild_use_credit === true || custom.vild_use_credit === 'true') return true;
  const payments = Array.isArray(data.payments) ? data.payments : [];
  return payments.some((p) => {
    const d = dict(p);
    const text = `${d.method ?? ''} ${d.name ?? ''} ${d.type ?? ''}`.toLowerCase();
    return text.includes('vild') || text.includes('inneign');
  });
}

export function isNoonaPayload(body: unknown): boolean {
  const b = dict(body);
  return typeof b.event === 'string' && /^sale\./.test(b.event) && typeof b.data === 'object';
}

/**
 * Map a Noona sale webhook to the generic receipt. Returns null for events we
 * ignore (anything that is not a completed sale). Throws on a malformed sale.
 */
export function noonaToReceipt(body: unknown): Receipt | null {
  const b = dict(body);
  const event = typeof b.event === 'string' ? b.event : '';
  if (!/^sale\.(completed|created|paid)$/.test(event)) return null; // [unverified] event names
  const data = dict(b.data);
  const id = data.id ?? data.sale_id;
  if (typeof id !== 'string' || !id) throw new Error('noona: data.id missing');

  const linesRaw = Array.isArray(data.lines) ? data.lines : Array.isArray(data.items) ? data.items : [];
  const items = linesRaw.map((l) => {
    const d = dict(l);
    const qty = Number(d.quantity ?? d.qty ?? 1);
    const unit = d.unit_price ?? (typeof d.total === 'number' && qty > 0 ? Number(d.total) / qty : undefined);
    return {
      sku: typeof d.sku === 'string' && d.sku ? d.sku : typeof d.product_id === 'string' ? d.product_id : undefined,
      name: typeof d.title === 'string' ? d.title : typeof d.name === 'string' ? d.name : undefined,
      qty: Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 1,
      unit_price: typeof unit === 'number' ? Math.round(unit) : undefined,
    };
  });
  if (items.length === 0) throw new Error('noona: sale has no lines');

  const token = findToken(data);
  const occurred = data.completed_at ?? data.created_at ?? b.created_at;
  const receipt: Receipt = {
    external_id: `noona:${id}`,
    customer: token ? { wallet_token: token } : {},
    items,
    tender: { credit_requested: creditRequested(data) },
  };
  const loc = b.location_id ?? data.location_id ?? dict(data.location).id;
  if (typeof loc === 'string' && loc) receipt.location_external_id = loc;
  if (typeof occurred === 'string') receipt.occurred_at = occurred;
  if (typeof data.number === 'number' || typeof data.number === 'string') receipt.receipt_no = String(data.number);
  if (typeof data.total === 'number') receipt.total = Math.round(data.total);
  return receipt;
}
