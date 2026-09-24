// Miðatorg — shared plumbing for the Deno edge functions: CORS, caller
// identification, the cron secret, polite fetch with timeout, structured
// logging. Deno-only (uses Deno.env); the parser in tix.ts stays runtime-agnostic.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export const USER_AGENT = 'MidatorgBot/1.0 (+https://github.com/helgimestariii; event listing import, contact via site)';

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** One JSON line per log event. Never pass page content in `data`. */
export function log(fn: string, level: 'info' | 'warn' | 'error', msg: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), fn, level, msg, ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Service-role client: bypasses RLS, may call mt_import_events. Keys are injected by the platform. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ---------------------------------------------------------------------
// Who is calling?
// ---------------------------------------------------------------------

export type Caller =
  | { kind: 'anon' }
  | { kind: 'admin'; userId: string }
  | { kind: 'user'; userId: string }
  | { kind: 'none'; reason: string };

export function bearerToken(req: Request): string | undefined {
  const h = req.headers.get('authorization');
  if (!h) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : undefined;
}

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const jsonText = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
    const payload: unknown = JSON.parse(jsonText);
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The gateway (verify_jwt = true) has already checked the signature of the
 * Authorization JWT. Here we decide *who* it is:
 *   - the project's anon key  → 'anon' (pg_cron / scheduled runs; the caller
 *                              must additionally pass hasValidCronSecret)
 *   - a signed-in user       → validated with auth.getUser(), then the
 *                              mt_profiles.role decides 'admin' vs 'user'
 *   - anything else          → 'none' (never trusted)
 */
export async function identifyCaller(req: Request, admin: SupabaseClient): Promise<Caller> {
  const token = bearerToken(req);
  if (!token) return { kind: 'none', reason: 'NO_TOKEN' };
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const payload = decodeJwtPayload(token);
  if (!payload) return { kind: 'none', reason: 'NOT_A_JWT' };
  const role = typeof payload.role === 'string' ? payload.role : '';
  if (role === 'anon' || (anonKey && token === anonKey)) return { kind: 'anon' };
  if (role !== 'authenticated') return { kind: 'none', reason: 'UNSUPPORTED_ROLE' };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { kind: 'none', reason: 'INVALID_USER_TOKEN' };
  const userId = data.user.id;
  const { data: profile, error: pErr } = await admin
    .from('mt_profiles')
    .select('role, banned_at')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) return { kind: 'none', reason: 'PROFILE_LOOKUP_FAILED' };
  if (profile && profile.role === 'admin' && !profile.banned_at) return { kind: 'admin', userId };
  return { kind: 'user', userId };
}

// ---------------------------------------------------------------------
// Cron secret (migrations/0008). The anon key is public (it ships in every
// frontend bundle), so an anon-key call is only trusted when it also carries
// x-mt-cron-secret equal to mt_settings.cron_secret — which only the
// pg_cron job (running inside the database) can read.
// ---------------------------------------------------------------------

export const CRON_SECRET_HEADER = 'x-mt-cron-secret';

/** Constant-time comparison: both sides are hashed to equal length first. */
export async function secretsMatch(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0 && a.length === b.length;
}

export async function hasValidCronSecret(req: Request, admin: SupabaseClient): Promise<boolean> {
  const given = req.headers.get(CRON_SECRET_HEADER)?.trim();
  if (!given) return false;
  const { data, error } = await admin.from('mt_settings').select('value').eq('key', 'cron_secret').maybeSingle();
  if (error || !data) return false;
  const expected = typeof data.value === 'string' ? data.value : '';
  if (!expected) return false;
  return secretsMatch(given, expected);
}

// ---------------------------------------------------------------------
// Polite fetch
// ---------------------------------------------------------------------

export interface FetchedPage {
  status: number;
  finalUrl: string;
  text: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  /** Which hosts a redirect may lead to; defaults to the host the request started on. */
  allowHost?: (hostname: string) => boolean;
}

export class FetchError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

const MAX_REDIRECTS = 3;
const FETCH_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
  'Accept-Language': 'is,en;q=0.7',
};

/**
 * GET a page as text with a hard timeout (tix.is category pages run to ~3.2 MB,
 * hence the 8 MB cap). Redirects are followed by hand (at most 3 hops) and every
 * hop must pass `allowHost`, so an open redirect on the allowed host can never
 * make the runtime fetch another host. Errors carry status/reason only, never the body.
 */
export async function fetchPage(url: string, opts: FetchOptions = {}): Promise<FetchedPage> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxBytes = opts.maxBytes ?? 8_000_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const startHost = new URL(url).hostname.toLowerCase();
    const hostAllowed = opts.allowHost ?? ((h: string) => h === startHost);
    let current = url;
    let res: Response | undefined;
    for (let hop = 0; ; hop++) {
      const target = new URL(current);
      if ((target.protocol !== 'https:' && target.protocol !== 'http:') || !hostAllowed(target.hostname.toLowerCase())) {
        throw new FetchError(`redirect to disallowed host ${target.hostname}`);
      }
      res = await fetch(current, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers: FETCH_HEADERS });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        if (hop >= MAX_REDIRECTS) throw new FetchError('too many redirects', res.status);
        current = new URL(location, current).toString();
        continue;
      }
      break;
    }
    if (!res) throw new FetchError('no response');
    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > maxBytes) {
      await res.body?.cancel();
      throw new FetchError(`response too large (${len} bytes)`, res.status);
    }
    const text = await res.text();
    if (text.length > maxBytes) throw new FetchError(`response too large (${text.length} chars)`, res.status);
    return { status: res.status, finalUrl: current, text };
  } catch (err) {
    if (err instanceof FetchError) throw err;
    const name = err instanceof Error ? err.name : 'Error';
    if (name === 'AbortError') throw new FetchError(`timeout after ${timeoutMs}ms`);
    const message = err instanceof Error ? err.message : String(err);
    throw new FetchError(`fetch failed: ${message.slice(0, 200)}`);
  } finally {
    clearTimeout(timer);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
