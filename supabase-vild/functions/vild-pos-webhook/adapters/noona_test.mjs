// node --experimental-strip-types --test supabase-vild/functions/vild-pos-webhook/adapters/noona_test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { noonaToReceipt, findToken, creditRequested } from './noona.ts';
import { normaliseReceipt, redactReceipt } from '../receipt.ts';

const sale = {
  event: 'sale.completed',
  company_id: 'cmp_1',
  location_id: 'loc_laugavegur',
  data: {
    id: 'sale_123',
    number: 1042,
    completed_at: '2026-10-23T12:31:00Z',
    customer: { id: 'cus_9', name: 'Jón', phone: '+3545551234' },
    lines: [
      { product_id: 'prd_marg', sku: 'MARG', title: 'Margherita', quantity: 1, unit_price: 2990, total: 2990 },
      { product_id: 'prd_cola', title: 'Kók', quantity: 2, total: 980 },
    ],
    total: 3970,
    currency: 'ISK',
    note: 'borð 4 vild-7f3a-9q2k',
    payments: [{ method: 'card', amount: 3470 }, { method: 'voucher', name: 'VILD inneign', amount: 500 }],
  },
};

test('noona sale → generic receipt → normalised, with PII dropped', () => {
  const r = noonaToReceipt(sale);
  assert.ok(r);
  assert.equal(r.external_id, 'noona:sale_123');
  assert.equal(r.location_external_id, 'loc_laugavegur');
  assert.equal(r.receipt_no, '1042');
  assert.deepEqual(r.customer, { wallet_token: 'VILD-7F3A-9Q2K' });
  assert.equal(r.tender.credit_requested, true);
  assert.deepEqual(r.items, [
    { sku: 'MARG', name: 'Margherita', qty: 1, unit_price: 2990 },
    { sku: 'prd_cola', name: 'Kók', qty: 2, unit_price: 490 },
  ]);
  const n = normaliseReceipt(r);
  assert.equal(n.ok, true);
  assert.equal(JSON.stringify(n.receipt).includes('Jón'), false);
  assert.equal(JSON.stringify(n.receipt).includes('5551234'), false);
  assert.equal(redactReceipt(n.receipt).customer.wallet_token, 'VILD-…');
});

test('ignored events and token discovery', () => {
  assert.equal(noonaToReceipt({ event: 'customer.created', data: {} }), null);
  assert.equal(findToken({ custom_fields: { vild_token: 'vildp-abcdefghjklmnpqrstuv' } }), 'VILDP-ABCDEFGHJKLMNPQRSTUV');
  assert.equal(findToken({ custom_fields: { vild_token: 'vildp-abcdefghjklmnpqrstuvw' } }), undefined); // 21 chars: not a token
  assert.equal(findToken({ note: 'nothing here' }), undefined);
  assert.equal(creditRequested({ custom_fields: { vild_use_credit: 'true' } }), true);
  assert.equal(creditRequested({ payments: [{ method: 'card' }] }), false);
});

test('generic receipt validation', () => {
  const ok = normaliseReceipt({
    external_id: 'R-1',
    location_id: 'l_laugavegur',
    customer: { wallet_token: 'vild-aaaa-2222' },
    items: [{ product_id: 'p_margherita', qty: 1 }, { name: 'Dagsins', qty: 1, unit_price: 1890 }],
    tender: { credit_requested: 'true' },
    occurred_at: '2026-10-23T12:00:00+00:00',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.receipt.customer.wallet_token, 'VILD-AAAA-2222');
  assert.equal(ok.receipt.occurred_at, '2026-10-23T12:00:00.000Z');
  assert.equal(ok.receipt.tender.credit_requested, true);

  assert.equal(normaliseReceipt({}).ok, false);
  assert.equal(normaliseReceipt({ external_id: 'x', customer: {}, items: [{ qty: 1, name: 'a', unit_price: 1 }] }).ok, false);
  assert.equal(normaliseReceipt({ external_id: 'x', customer: { wallet_token: 'nope' }, items: [{ sku: 'a' }] }).ok, false);
  assert.equal(normaliseReceipt({ external_id: 'x', customer: { vild_customer_id: '00000000-0000-4000-8000-000000000001' }, items: [{ name: 'a' }] }).ok, false); // free text needs a price
  const mismatch = normaliseReceipt({ external_id: 'x', customer: { wallet_token: 'VILD-AAAA-2222' }, items: [{ name: 'a', qty: 2, unit_price: 100 }], total: 150 });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /does not equal/);
});
