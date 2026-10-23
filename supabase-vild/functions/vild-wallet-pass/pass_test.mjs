// node --experimental-strip-types --test supabase-vild/functions/vild-wallet-pass/pass_test.mjs
// (npm:fflate is resolved through node_modules/fflate — installed in the repo root for this test.)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { buildManifest, buildPassJson, formatISK, passImages, solidPng, zipPass } from './pass.ts';

const input = {
  passTypeIdentifier: 'pass.is.vild.card',
  teamIdentifier: 'TEAM123456',
  serialNumber: '00000000-0000-4000-8000-000000000001',
  authenticationToken: 'a'.repeat(48),
  webServiceURL: 'https://x.supabase.co/functions/v1/vild-wallet-pass',
  barcodeToken: 'VILDP-ABCDEFGHJKLMNPQRSTUV',
  holderName: 'Helgi',
  pockets: [
    { merchantId: 'm_luna', merchantName: 'Lúna', sectorName: 'Veitingastaðir', balance: 2501, nextExpiryAt: '2028-10-23T16:00:00Z' },
    { merchantId: 'm_x', merchantName: 'X', sectorName: 'Kaffihús', balance: 0, nextExpiryAt: null },
  ],
  updatedAt: '2026-10-23T20:00:00Z',
};

test('pass.json is a storeCard with the VILD colours, barcode and web service', () => {
  const p = buildPassJson(input);
  assert.equal(p.formatVersion, 1);
  assert.equal(p.organizationName, 'VILD');
  assert.equal(p.backgroundColor, 'rgb(7, 43, 29)');
  assert.equal(p.foregroundColor, 'rgb(180, 255, 155)');
  assert.equal(p.labelColor, 'rgb(210, 255, 194)');
  assert.equal(p.serialNumber, input.serialNumber);
  assert.equal(p.authenticationToken.length >= 16, true);
  assert.equal(p.barcodes[0].format, 'PKBarcodeFormatQR');
  assert.equal(p.barcodes[0].message, input.barcodeToken);
  assert.equal(p.storeCard.primaryFields[0].value, 2501);
  assert.equal(p.storeCard.primaryFields[0].currencyCode, 'ISK');
  assert.equal(p.storeCard.headerFields[0].value, 'Helgi');
  assert.equal(p.storeCard.auxiliaryFields[0].value, '2028-10-23');
  assert.equal(p.storeCard.backFields.length, 4);
  assert.equal(JSON.stringify(p).includes('kennitala'), false);
  assert.equal(formatISK(1234567), '1.234.567 kr.');
});

test('manifest holds SHA-1 of every file and the png/zip are well-formed', async () => {
  const png = solidPng(29, 29, [7, 43, 29]);
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(new TextDecoder().decode(png.slice(12, 16)), 'IHDR');
  const images = passImages();
  assert.ok(images['icon.png'] && images['icon@2x.png'] && images['logo.png']);
  const passJson = new TextEncoder().encode(JSON.stringify(buildPassJson(input)));
  const files = { 'pass.json': passJson, ...images };
  const manifest = JSON.parse(await buildManifest(files));
  assert.equal(manifest['pass.json'], createHash('sha1').update(passJson).digest('hex'));
  assert.equal(Object.keys(manifest).length, 6);
  const zip = zipPass({ ...files, 'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)), signature: new Uint8Array([1, 2, 3]) });
  assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]); // "PK\3\4"
  assert.equal(new TextDecoder().decode(zip).includes('pass.json'), true);
});
