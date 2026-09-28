// Tests for helpers.ts. Run with: node --experimental-strip-types supabase-midatorg/functions/mt-eid/helpers_test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { base64url, decodeNext, encodeNext, listFromEnv, normaliseKennitala, pickClaim, pkceChallenge, randomToken, safeNextPath, withParams } from './helpers.ts';

test('PKCE S256 matches the RFC 7636 appendix B example', async () => {
  assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('randomToken is url-safe and long enough', () => {
  const a = randomToken();
  const b = randomToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
  assert.equal(base64url(new Uint8Array([251, 255])), '-_8');
});

test('kennitala: formats accepted, check digit and century validated', () => {
  // 010130-2989 is the well-known test number for Þjóðskrá; 120174-3399 another valid one
  assert.equal(normaliseKennitala('010130-2989'), '0101302989');
  assert.equal(normaliseKennitala('0101302989'), '0101302989');
  assert.equal(normaliseKennitala('010130 2989'), '0101302989');
  assert.equal(normaliseKennitala('0101302979'), null); // wrong check digit
  assert.equal(normaliseKennitala('0101302981'), null); // bad century digit
  assert.equal(normaliseKennitala('12345'), null);
  assert.equal(normaliseKennitala(null), null);
});

test('next path must stay inside the app', () => {
  assert.equal(safeNextPath('/eg?flipi=solur'), '/eg?flipi=solur');
  assert.equal(safeNextPath('/midatorg/eg?flipi=solur'), '/eg?flipi=solur', 'legacy prefix is dropped');
  assert.equal(safeNextPath('/midatorg'), '/');
  assert.equal(safeNextPath('/midatorg?eid=1'), '/?eid=1');
  assert.equal(safeNextPath('https://evil.example/eg'), '/eg');
  assert.equal(safeNextPath('//evil.example'), '/eg');
  assert.equal(safeNextPath('/x/https://evil.example'), '/eg');
  assert.equal(safeNextPath('/eg\\evil'), '/eg');
  assert.equal(safeNextPath(undefined), '/eg');
});

test('claims are picked in order', () => {
  assert.equal(pickClaim({ kennitala: '0101302989', national_id: '' }, ['national_id', 'kennitala']), '0101302989');
  assert.equal(pickClaim({ ssn: 101302989 }, ['national_id', 'ssn']), '101302989');
  assert.equal(pickClaim({}, ['name']), null);
});

test('helpers for URLs and env lists', () => {
  assert.equal(withParams('https://app.example/eg?flipi=yfirlit', { eid: 'ok' }), 'https://app.example/eg?flipi=yfirlit&eid=ok');
  assert.deepEqual(listFromEnv('national_id, kennitala ssn', ['x']), ['national_id', 'kennitala', 'ssn']);
  assert.deepEqual(listFromEnv(undefined, ['x']), ['x']);
});

test('app return: encode/decode keeps the path safe and remembers the phone app', () => {
  assert.equal(encodeNext('/eg', true), 'app:/eg');
  assert.deepEqual(decodeNext('app:/eg?flipi=yfirlit'), { path: '/eg?flipi=yfirlit', app: true });
  assert.deepEqual(decodeNext('/eg'), { path: '/eg', app: false });
  assert.deepEqual(decodeNext('app://evil.example'), { path: '/eg', app: true });
  assert.deepEqual(decodeNext(null), { path: '/eg', app: false });
  assert.equal(withParams('is.midatorg.app://app/eg', { eid: 'ok' }), 'is.midatorg.app://app/eg?eid=ok');
});
