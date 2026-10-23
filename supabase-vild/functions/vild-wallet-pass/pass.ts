// Pure builders for the Apple Wallet pass (runtime-agnostic, no dependencies, tested under Node):
// pass.json, manifest.json (SHA-1 per file), a solid-colour PNG for the required icon/logo
// images, and the zip. Signing (PKCS#7 with node-forge) lives in index.ts.
// The PNG and the zip use *stored* (uncompressed) blocks on purpose: ~40 lines instead of a
// compression library, and the images are a few KB anyway.
import { sha1Hex } from '../_shared/hmac.ts';

export const PASS_COLORS = {
  backgroundColor: 'rgb(7, 43, 29)',    // #072B1D
  foregroundColor: 'rgb(180, 255, 155)', // #B4FF9B
  labelColor: 'rgb(210, 255, 194)',      // #D2FFC2
};

export type PassPocket = { merchantId: string; merchantName: string; sectorName: string; balance: number; nextExpiryAt: string | null };

export type PassInput = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  serialNumber: string;          // the user id
  authenticationToken: string;   // vild_pass_secrets.auth_token (>= 16 chars)
  webServiceURL: string;         // https://<project>.supabase.co/functions/v1/vild-wallet-pass
  barcodeToken: string;          // vild_pass_secrets.barcode_token
  holderName: string;
  pockets: PassPocket[];
  updatedAt: string;
};

export function formatISK(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
}

/** The pass.json dictionary (storeCard). Only the primary pocket is on the front; the rest are on the back. */
export function buildPassJson(input: PassInput): Record<string, unknown> {
  const [primary, ...others] = input.pockets;
  const secondary = others.slice(0, 2).map((p) => ({ key: `pocket_${p.merchantId}`, label: p.merchantName.toUpperCase(), value: formatISK(p.balance) }));
  return {
    formatVersion: 1,
    passTypeIdentifier: input.passTypeIdentifier,
    teamIdentifier: input.teamIdentifier,
    serialNumber: input.serialNumber,
    authenticationToken: input.authenticationToken,
    webServiceURL: input.webServiceURL,
    organizationName: 'VILD',
    description: 'VILD inneign',
    logoText: 'VILD',
    ...PASS_COLORS,
    sharingProhibited: true,
    barcodes: [{ format: 'PKBarcodeFormatQR', message: input.barcodeToken, messageEncoding: 'iso-8859-1', altText: input.barcodeToken }],
    storeCard: {
      headerFields: [{ key: 'holder', label: 'FÉLAGI', value: input.holderName }],
      primaryFields: primary
        ? [{ key: 'balance', label: `INNEIGN · ${primary.merchantName.toUpperCase()}`, value: primary.balance, currencyCode: 'ISK' }]
        : [{ key: 'balance', label: 'INNEIGN', value: 0, currencyCode: 'ISK' }],
      secondaryFields: secondary,
      auxiliaryFields: primary?.nextExpiryAt
        ? [{ key: 'expiry', label: 'RENNUR ÚT', value: primary.nextExpiryAt.slice(0, 10), dateStyle: 'PKDateStyleMedium' }]
        : [],
      backFields: [
        ...input.pockets.map((p) => ({ key: `back_${p.merchantId}`, label: `${p.merchantName} · ${p.sectorName}`, value: formatISK(p.balance) })),
        { key: 'terms', label: 'Skilmálar', value: 'Inneign gildir aðeins hjá keðjunni sem gaf hana, er óframseljanleg og rennur út 24 mánuðum eftir að hún var unnin. Inneign safnast ekki af þeim hluta sem greiddur er með inneign.' },
        { key: 'updated', label: 'Uppfært', value: input.updatedAt },
      ],
    },
  };
}

/** manifest.json: file name → SHA-1 hex of its bytes (Apple's format). */
export async function buildManifest(files: Record<string, Uint8Array>): Promise<string> {
  const entries: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) entries[name] = await sha1Hex(bytes);
  return JSON.stringify(entries);
}

// ---- byte helpers -------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function u32be(n: number): Uint8Array { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; }
function u32le(n: number): Uint8Array { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; }
function u16le(n: number): Uint8Array { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xffff, true); return b; }

/** zlib stream with stored (uncompressed) deflate blocks + adler32 — valid input for any inflater. */
export function zlibStored(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  for (let off = 0; off < data.length || off === 0; off += 65535) {
    const len = Math.min(65535, data.length - off);
    const last = off + len >= data.length ? 1 : 0;
    blocks.push(new Uint8Array([last, len & 0xff, len >> 8, ~len & 0xff, (~len >> 8) & 0xff]), data.subarray(off, off + len));
    if (data.length === 0) break;
  }
  let a = 1, b = 0;
  for (const x of data) { a = (a + x) % 65521; b = (b + a) % 65521; }
  blocks.push(u32be((b << 16) | a));
  return concat(blocks);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([new TextEncoder().encode(type), data]);
  return concat([u32be(data.length), body, u32be(crc32(body))]);
}

/** A solid-colour RGB PNG (used for icon.png / logo.png so no binary assets ship with the function). */
export function solidPng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const off = y * (width * 3 + 1);
    raw[off] = 0; // filter: none
    for (let x = 0; x < width; x++) raw.set(rgb, off + 1 + x * 3);
  }
  const ihdr = concat([u32be(width), u32be(height), new Uint8Array([8, 2, 0, 0, 0])]); // 8-bit RGB
  return concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlibStored(raw)), pngChunk('IEND', new Uint8Array())]);
}

/** The images Apple requires at minimum (icon) plus a logo, all in the pass background colour. */
export function passImages(): Record<string, Uint8Array> {
  const green: [number, number, number] = [7, 43, 29];
  return {
    'icon.png': solidPng(29, 29, green),
    'icon@2x.png': solidPng(58, 58, green),
    'icon@3x.png': solidPng(87, 87, green),
    'logo.png': solidPng(160, 50, green),
    'logo@2x.png': solidPng(320, 100, green),
  };
}

/** Zip with stored entries (method 0). Wallet reads it; nothing in a pass benefits from deflate. */
export function zipPass(files: Record<string, Uint8Array>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const dosTime = u16le(0), dosDate = u16le(0x21); // 1980-01-01 00:00
  for (const [name, data] of Object.entries(files)) {
    const n = enc.encode(name);
    const crc = u32le(crc32(data));
    const size = u32le(data.length);
    const local = concat([u32le(0x04034b50), u16le(20), u16le(0x0800), u16le(0), dosTime, dosDate, crc, size, size, u16le(n.length), u16le(0), n, data]);
    centrals.push(concat([u32le(0x02014b50), u16le(20), u16le(20), u16le(0x0800), u16le(0), dosTime, dosDate, crc, size, size, u16le(n.length), u16le(0), u16le(0), u16le(0), u16le(0), u32le(0), u32le(offset), n]));
    locals.push(local);
    offset += local.length;
  }
  const central = concat(centrals);
  const end = concat([u32le(0x06054b50), u16le(0), u16le(0), u16le(centrals.length), u16le(centrals.length), u32le(central.length), u32le(offset), u16le(0)]);
  return concat([...locals, central, end]);
}
