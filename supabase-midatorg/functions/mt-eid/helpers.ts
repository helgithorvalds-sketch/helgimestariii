// Pure helpers for mt-eid (runtime-agnostic: Web Crypto + TextEncoder only, so the
// same file runs under Deno in the edge function and under Node in the tests).

/** base64url without padding (RFC 7636 §3). */
export function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Cryptographically random URL-safe token (default 32 bytes → 43 chars). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/**
 * Icelandic kennitala → 10 digits, or null when it is not a valid one.
 * Accepts "010130-3019" / "0101303019" / "010130 3019". Validates the check digit
 * (9th digit; weights 3 2 7 6 5 4 3 2 over digits 1–8) and the century digit (0, 8 or 9).
 */
export function normaliseKennitala(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const digits = String(input).replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(digits)) return null;
  const d = digits.split('').map(Number);
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * d[i], 0);
  const rest = 11 - (sum % 11);
  const check = rest === 11 ? 0 : rest;
  if (check === 10 || check !== d[8]) return null;
  if (![0, 8, 9].includes(d[9])) return null;
  return digits;
}

/** Only paths inside the app; no scheme, no host, no protocol-relative "//". */
export function safeNextPath(input: unknown, fallback = '/eg'): string {
  if (typeof input !== 'string') return fallback;
  let value = input.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://') || /[\r\n]/.test(value)) return fallback;
  if (value.length > 300) return fallback;
  // the app used to live under /midatorg; old links keep working
  if (value === '/midatorg') return '/';
  if (value.startsWith('/midatorg/')) value = value.slice('/midatorg'.length);
  else if (value.startsWith('/midatorg?')) value = '/' + value.slice('/midatorg'.length);
  return value;
}

/** First non-empty string (or number) among the candidate claim names. */
export function pickClaim(claims: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    const v = claims[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

/** Append query params to an app URL (origin + path), keeping any existing query. */
export function withParams(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/** Split a comma/space separated env value, keeping order and dropping blanks. */
export function listFromEnv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parts = value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
}
