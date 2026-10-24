// The generic VILD receipt: what every POS integration is normalised to before
// vild_record_purchase runs. Runtime-agnostic (tested under Node).
//
// {
//   "external_id": "R-2026-10-23-1042",          // the POS receipt id, unique per chain → idempotency
//   "location_id": "l_laugavegur",               // our venue id …
//   "location_external_id": "noona-loc-7",       // … or the vendor's (vild_locations.pos_external_id)
//   "occurred_at": "2026-10-23T12:31:00Z",       // optional, defaults to now
//   "receipt_no": "1042",                        // optional, printed receipt number
//   "customer": { "wallet_token": "VILD-7F3A-9Q2K" }   // or { "vild_customer_id": "<uuid>" }
//   "items": [ { "sku": "MARG", "qty": 1, "unit_price": 2990 },
//              { "product_id": "p_cola", "qty": 2 },
//              { "name": "Dagsins", "qty": 1, "unit_price": 1890 } ],
//   "total": 3970,                               // optional; must equal Σ qty × unit_price when given
//   "tender": { "credit_requested": true }       // the guest asked to pay with inneign
// }
// Amounts are whole ISK. Card data, phone numbers and names of the customer are
// never part of this format; adapters drop them.

export type ReceiptItem = { product_id?: string; sku?: string; name?: string; qty: number; unit_price?: number };

export type Receipt = {
  external_id: string;
  location_id?: string;
  location_external_id?: string;
  occurred_at?: string;
  receipt_no?: string;
  customer: { wallet_token?: string; vild_customer_id?: string };
  items: ReceiptItem[];
  total?: number;
  tender: { credit_requested: boolean };
};

export type Normalised = { ok: true; receipt: Receipt } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_RE = /^(VILD-[A-Z2-9]{4}-[A-Z2-9]{4}|VILDP-[A-Z2-9]{20})$/;

function str(v: unknown, max = 200): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function int(v: unknown): number | undefined {
  if (typeof v === 'string' && v.trim()) v = Number(v);
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.round(v);
}

/** Validate and clean a generic receipt. Unknown keys are dropped; nothing from `customer` beyond the two identifiers survives. */
export function normaliseReceipt(input: unknown): Normalised {
  if (!input || typeof input !== 'object') return { ok: false, error: 'body must be a JSON object' };
  const r = input as Record<string, unknown>;
  const external_id = str(r.external_id, 120);
  if (!external_id) return { ok: false, error: 'external_id is required' };

  const customerRaw = (r.customer && typeof r.customer === 'object' ? r.customer : {}) as Record<string, unknown>;
  const token = str(customerRaw.wallet_token, 40)?.toUpperCase();
  const customerId = str(customerRaw.vild_customer_id, 40);
  if (token && !TOKEN_RE.test(token)) return { ok: false, error: 'customer.wallet_token has the wrong format' };
  if (customerId && !UUID.test(customerId)) return { ok: false, error: 'customer.vild_customer_id must be a uuid' };
  if (!token && !customerId) return { ok: false, error: 'customer.wallet_token or customer.vild_customer_id is required' };

  if (!Array.isArray(r.items) || r.items.length === 0) return { ok: false, error: 'items must be a non-empty array' };
  if (r.items.length > 200) return { ok: false, error: 'too many items' };
  const items: ReceiptItem[] = [];
  for (const raw of r.items) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'item must be an object' };
    const x = raw as Record<string, unknown>;
    const qty = int(x.qty ?? x.quantity ?? 1);
    if (qty === undefined || qty < 1 || qty > 999) return { ok: false, error: 'item.qty must be 1–999' };
    const item: ReceiptItem = { qty };
    const product_id = str(x.product_id, 60);
    const sku = str(x.sku, 120);
    const name = str(x.name, 120);
    if (product_id) item.product_id = product_id;
    if (sku) item.sku = sku;
    if (name) item.name = name;
    const unit_price = x.unit_price === undefined || x.unit_price === null ? undefined : int(x.unit_price);
    if (x.unit_price !== undefined && x.unit_price !== null && (unit_price === undefined || unit_price < 0 || unit_price > 10_000_000)) {
      return { ok: false, error: 'item.unit_price must be a non-negative integer (ISK)' };
    }
    if (unit_price !== undefined) item.unit_price = unit_price;
    if (!product_id && !sku && !name) return { ok: false, error: 'item needs product_id, sku or name' };
    if (!product_id && !sku && unit_price === undefined) return { ok: false, error: 'a free-text item needs unit_price' };
    items.push(item);
  }

  const total = r.total === undefined || r.total === null ? undefined : int(r.total);
  if (r.total !== undefined && r.total !== null && (total === undefined || total < 0)) return { ok: false, error: 'total must be a non-negative integer' };
  if (total !== undefined && items.every((i) => i.unit_price !== undefined)) {
    const sum = items.reduce((a, i) => a + (i.unit_price as number) * i.qty, 0);
    if (sum !== total) return { ok: false, error: `total ${total} does not equal the sum of the lines ${sum}` };
  }

  const occurred_at = str(r.occurred_at, 40);
  if (occurred_at && Number.isNaN(Date.parse(occurred_at))) return { ok: false, error: 'occurred_at must be an ISO-8601 timestamp' };

  const tenderRaw = (r.tender && typeof r.tender === 'object' ? r.tender : {}) as Record<string, unknown>;
  const credit_requested = tenderRaw.credit_requested === true || tenderRaw.credit_requested === 'true' || r.use_credit === true;

  const receipt: Receipt = {
    external_id,
    customer: token ? { wallet_token: token } : { vild_customer_id: customerId },
    items,
    tender: { credit_requested },
  };
  const location_id = str(r.location_id, 60);
  const location_external_id = str(r.location_external_id, 120);
  const receipt_no = str(r.receipt_no, 60);
  if (location_id) receipt.location_id = location_id;
  if (location_external_id) receipt.location_external_id = location_external_id;
  if (occurred_at) receipt.occurred_at = new Date(occurred_at).toISOString();
  if (receipt_no) receipt.receipt_no = receipt_no;
  if (total !== undefined) receipt.total = total;
  return { ok: true, receipt };
}

/** What is stored in vild_pos_events.payload: the receipt with the token masked. */
export function redactReceipt(receipt: Receipt): Record<string, unknown> {
  return {
    ...receipt,
    customer: receipt.customer.wallet_token
      ? { wallet_token: receipt.customer.wallet_token.slice(0, 5) + '…' }
      : { vild_customer_id: receipt.customer.vild_customer_id },
  };
}
