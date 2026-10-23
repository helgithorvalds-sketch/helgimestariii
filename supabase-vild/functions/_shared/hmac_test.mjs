// node --experimental-strip-types --test supabase-vild/functions/_shared/hmac_test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac, createHash } from 'node:crypto';
import { hmacSha256Hex, parseSignatureHeader, sha1Hex, sha256Hex, timingSafeEqual, verifySignature, hexToBytes, bytesToHex } from './hmac.ts';

test('sha256 / sha1 match node:crypto', async () => {
  assert.equal(await sha256Hex('vk_TEST'), createHash('sha256').update('vk_TEST').digest('hex'));
  assert.equal(await sha256Hex(new Uint8Array([1, 2, 3])), createHash('sha256').update(Buffer.from([1, 2, 3])).digest('hex'));
  assert.equal(await sha1Hex('{"a":1}'), createHash('sha1').update('{"a":1}').digest('hex'));
});

test('HMAC-SHA256 matches node:crypto, with the RFC 4231 test case 2', async () => {
  assert.equal(await hmacSha256Hex('Jefe', 'what do ya want for nothing?'), '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  const body = '{"external_id":"R-1","total":2990}';
  assert.equal(await hmacSha256Hex('s3cret', body), createHmac('sha256', 's3cret').update(body).digest('hex'));
});

test('signature header forms', () => {
  assert.deepEqual(parseSignatureHeader('sha256=ABCD'), { hex: 'abcd', timestamp: null });
  assert.deepEqual(parseSignatureHeader('t=1700000000,v1=ff'), { hex: 'ff', timestamp: 1700000000 });
  assert.equal(parseSignatureHeader(''), null);
  assert.equal(parseSignatureHeader('md5=zz'), null);
});

test('verifySignature: plain, timestamped, tampered, stale', async () => {
  const secret = 'whsec_' + 'a'.repeat(20);
  const body = '{"external_id":"R-9","total":1234}';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(await verifySignature(secret, body, `sha256=${sig}`), true);
  assert.equal(await verifySignature(secret, body, sig.toUpperCase()), true);
  assert.equal(await verifySignature(secret, body + ' ', `sha256=${sig}`), false);
  assert.equal(await verifySignature('other', body, `sha256=${sig}`), false);
  assert.equal(await verifySignature(secret, body, null), false);
  const t = 1_700_000_000;
  const tsig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  const now = () => t * 1000 + 10_000;
  assert.equal(await verifySignature(secret, body, `t=${t},v1=${tsig}`, { now }), true);
  assert.equal(await verifySignature(secret, body, `t=${t},v1=${tsig}`, { now: () => (t + 3600) * 1000 }), false);
  // bytes body behaves like the string body
  assert.equal(await verifySignature(secret, new TextEncoder().encode(body), `sha256=${sig}`), true);
});

test('timingSafeEqual and hex helpers', async () => {
  assert.equal(await timingSafeEqual('abc', 'abc'), true);
  assert.equal(await timingSafeEqual('abc', 'abd'), false);
  assert.equal(await timingSafeEqual('abc', 'abcd'), false);
  assert.equal(bytesToHex(hexToBytes('00ff10')), '00ff10');
  assert.equal(hexToBytes('xyz'), null);
  assert.equal(hexToBytes('abc'), null);
});
