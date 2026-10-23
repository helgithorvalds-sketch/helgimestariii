// VILD — shared plumbing for the Deno edge functions: CORS, JSON responses,
// structured logging without PII, the service-role client, caller
// identification (Supabase JWT → user id, merchant membership) and error
// mapping from the SQL functions' exception messages to HTTP status codes.
// Deno-only (uses Deno.env); the crypto helpers live in hmac.ts so they can be
// tested under Node.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
export { hmacSha256Hex, randomToken, sha256Hex, timingSafeEqual, verifySignature } from './hmac.ts';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vild-api-key, x-vild-signature, x-vild-cron-secret, if-modified-since',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const PII_KEYS = /kennitala|token|secret|phone|email|password|authorization|signature|api_key|apikey|name/i;

/**
 * One JSON line per event. Values under keys that look like PII or secrets are
 * replaced before writing, so a careless call cannot log a token or kennitala.
 */
export function log(fn: string, level: 'info' | 'warn' | 'error', msg: string, data: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) safe[k] = PII_KEYS.test(k) ? '[redacted]' : typeof v === 'string' ? v.slice(0, 300) : v;
  const line = JSON.stringify({ ts: new Date().toISOString(), fn, level, msg, ...safe });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Service-role client: bypasses RLS, may call the service-role-only RPCs. Keys are injected by the platform. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function bearerToken(req: Request): string | undefined {
  const h = req.headers.get('authorization');
  if (!h) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : undefined;
}

/** The signed-in user behind the Authorization header, validated with auth.getUser (signature + expiry). */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<{ userId: string; token: string } | Response> {
  const token = bearerToken(req);
  if (!token) return json({ code: 'AUTH_REQUIRED' }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ code: 'AUTH_REQUIRED' }, 401);
  return { userId: data.user.id, token };
}

export type MerchantMembership = { merchantId: string; role: 'owner' | 'manager' | 'staff'; locationIds: string[] | null };

/** The chains the user belongs to (accepted invites only). */
export async function merchantMemberships(admin: SupabaseClient, userId: string): Promise<MerchantMembership[]> {
  const { data, error } = await admin
    .from('vild_merchant_users')
    .select('merchant_id, role, location_ids')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null);
  if (error) throw new Error(`membership lookup failed: ${error.message}`);
  return (data ?? []).map((r) => ({ merchantId: r.merchant_id as string, role: r.role as MerchantMembership['role'], locationIds: (r.location_ids as string[] | null) ?? null }));
}

const ROLE_RANK: Record<string, number> = { owner: 3, manager: 2, staff: 1 };

/** Same rule as public.vild_is_merchant_user(merchant, min_role), plus the optional per-venue restriction. */
export function isMerchantUser(memberships: MerchantMembership[], merchantId: string, minRole: 'owner' | 'manager' | 'staff', locationId?: string | null): boolean {
  return memberships.some(
    (m) =>
      m.merchantId === merchantId &&
      (ROLE_RANK[m.role] ?? 0) >= ROLE_RANK[minRole] &&
      (!locationId || !m.locationIds || m.locationIds.includes(locationId)),
  );
}

/** Read the raw body once, with a size cap (webhooks must verify the HMAC over these exact bytes). */
export async function readRawBody(req: Request, maxBytes = 256_000): Promise<Uint8Array | Response> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > maxBytes) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413);
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > maxBytes) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413);
  return buf;
}

export function parseJson(bytes: Uint8Array): unknown | undefined {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

/**
 * The SQL functions raise plain messages like 'NOT_FOUND: product p_x' or
 * 'INSUFFICIENT_CREDIT'. Map them to a code + HTTP status for the client.
 */
export function rpcError(message: string | undefined): { code: string; status: number; detail?: string } {
  const text = (message ?? '').trim();
  const m = /^([A-Z_]+)(?::\s*(.*))?$/.exec(text.split('\n')[0] ?? '');
  const code = m ? m[1] : 'UNKNOWN';
  const detail = m?.[2] || undefined;
  const status: Record<string, number> = {
    AUTH_REQUIRED: 401,
    OWNER_REQUIRED: 403,
    NOT_FOUND: 404,
    TOKEN_INVALID: 422,
    INVALID_INPUT: 422,
    INSUFFICIENT_CREDIT: 409,
    KENNITALA_IN_USE: 409,
    LEDGER_APPEND_ONLY: 409,
    LAST_OWNER: 409,
  };
  return { code, status: status[code] ?? 500, detail };
}

/** Cron / sweep calls: x-vild-cron-secret must equal vild_settings.cron_secret (only the database and the operator know it). */
export async function hasValidCronSecret(req: Request, admin: SupabaseClient): Promise<boolean> {
  const given = req.headers.get('x-vild-cron-secret')?.trim();
  if (!given) return false;
  const { data, error } = await admin.from('vild_settings').select('value').eq('key', 'cron_secret').maybeSingle();
  if (error || !data) return false;
  const expected = typeof data.value === 'string' ? data.value : '';
  if (!expected) return false;
  const { timingSafeEqual } = await import('./hmac.ts');
  return timingSafeEqual(given, expected);
}

/** Summarise ledger rows returned by vild_record_purchase for a receipt / the till UI. */
export function purchaseSummary(rows: Array<{ kind: string; amount: number; balance_after: number; purchase_id: string | null }>) {
  const spend = rows.find((r) => r.kind === 'spend');
  const earn = rows.find((r) => r.kind === 'earn');
  const last = rows[rows.length - 1];
  return {
    purchase_id: last?.purchase_id ?? null,
    applied: spend ? -spend.amount : 0,
    earned: earn ? earn.amount : 0,
    balance_after: last ? last.balance_after : 0,
  };
}
