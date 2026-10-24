// Runtime-agnostic crypto helpers (Web Crypto + TextEncoder only), so the same
// file runs under Deno in the edge functions and under Node in hmac_test.mjs.

const enc = new TextEncoder();

export function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toBytes(data: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof data === 'string') return enc.encode(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

/** SHA-256 as lowercase hex. The API-key hash in vild_pos_connections.api_key_hash is this of the key. */
export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = toBytes(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

/** SHA-1 as lowercase hex (Apple's manifest.json uses SHA-1 of each file). */
export async function sha1Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = toBytes(data);
  const digest = await crypto.subtle.digest('SHA-1', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

/** HMAC-SHA256(secret, body) as lowercase hex. */
export async function hmacSha256Hex(secret: string, body: string | Uint8Array | ArrayBuffer): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = toBytes(body);
  const sig = await crypto.subtle.sign('HMAC', key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return bytesToHex(new Uint8Array(sig));
}

/** Constant-time comparison of two strings (hashes both so the length does not leak either). */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0 && a.length === b.length;
}

/**
 * Parse an x-vild-signature header. Accepted forms:
 *   "sha256=<hex>"            (recommended)
 *   "<hex>"
 *   "t=<unix>,v1=<hex>"       (Stripe-style; t is returned for replay checks)
 */
export function parseSignatureHeader(header: string | null | undefined): { hex: string; timestamp: number | null } | null {
  if (!header) return null;
  const value = header.trim();
  if (/^sha256=/i.test(value)) return { hex: value.slice(7).toLowerCase(), timestamp: null };
  if (/^[0-9a-f]{64}$/i.test(value)) return { hex: value.toLowerCase(), timestamp: null };
  if (value.includes('=') && value.includes(',')) {
    const parts = Object.fromEntries(value.split(',').map((p) => p.trim().split('=') as [string, string]));
    if (parts.v1) return { hex: parts.v1.toLowerCase(), timestamp: parts.t ? Number(parts.t) : null };
  }
  return null;
}

/**
 * Verify a webhook body: x-vild-signature must equal HMAC-SHA256(secret, raw body).
 * With the "t=…,v1=…" form the signed payload is `${t}.${body}` and t must be
 * within toleranceSeconds of now (default 5 minutes).
 */
export async function verifySignature(
  secret: string,
  rawBody: string | Uint8Array | ArrayBuffer,
  header: string | null | undefined,
  opts: { toleranceSeconds?: number; now?: () => number } = {},
): Promise<boolean> {
  const parsed = parseSignatureHeader(header);
  if (!parsed || !/^[0-9a-f]{64}$/.test(parsed.hex)) return false;
  let payload: string | Uint8Array | ArrayBuffer = rawBody;
  if (parsed.timestamp !== null) {
    if (!Number.isFinite(parsed.timestamp)) return false;
    const nowSec = Math.floor((opts.now ?? Date.now)() / 1000);
    if (Math.abs(nowSec - parsed.timestamp) > (opts.toleranceSeconds ?? 300)) return false;
    const bodyText = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(toBytes(rawBody));
    payload = `${parsed.timestamp}.${bodyText}`;
  }
  const expected = await hmacSha256Hex(secret, payload);
  return timingSafeEqual(expected, parsed.hex);
}

/** Random URL-safe token (base64url, no padding). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
