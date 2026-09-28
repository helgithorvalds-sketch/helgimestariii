// mt-eid — rafræn skilríki (Icelandic electronic ID) through any OpenID Connect provider
// (Kenni is the reference; Auðkenni, Signicat and Dokobit speak the same protocol).
//
//   GET  /mt-eid/start?next=/eg   (Authorization: Bearer <app access token>)
//        → 200 { url }  the provider's authorize URL (authorization code + PKCE S256)
//        → 503 { code: 'EID_NOT_CONFIGURED' } until the secrets below exist
//   GET  /mt-eid/callback?code&state         (the provider redirects the browser here)
//        → 302 to EID_APP_ORIGIN + next with ?eid=ok | ?eid=error&code=…
//
// Deployed with verify_jwt = false because the provider redirects a bare browser to
// /callback; /start verifies the app user itself, /callback trusts only the single-use
// `state` row it created. Tokens and kennitala are never logged.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   EID_ISSUER          issuer URL from the provider (its /.well-known/openid-configuration must resolve)
//   EID_CLIENT_ID       client id registered at the provider
//   EID_CLIENT_SECRET   client secret (omit for a public client)
//   EID_REDIRECT_URL    https://<project>.supabase.co/functions/v1/mt-eid/callback (register it at the provider)
//   EID_APP_ORIGIN      where users come back, e.g. https://midatorg.lovable.app
//   EID_SCOPES          optional, default "openid profile national_id"
//   EID_ID_CLAIM        optional, default "national_id,kennitala,ssn,nationalId"
//   EID_NAME_CLAIM      optional, default "name"

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ---- bundled from _shared/edge.ts and mt-eid/helpers.ts (deploy artefact; edit the sources) ----
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function log(fn: string, level: 'info' | 'warn' | 'error', msg: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), fn, level, msg, ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bearerToken(req: Request): string | undefined {
  const h = req.headers.get('authorization');
  if (!h) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : undefined;
}

/** base64url without padding (RFC 7636 §3). */
function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Cryptographically random URL-safe token (default 32 bytes → 43 chars). */
function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

/** PKCE S256 challenge for a verifier. */
async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/**
 * Icelandic kennitala → 10 digits, or null when it is not a valid one.
 * Accepts "010130-3019" / "0101303019" / "010130 3019". Validates the check digit
 * (9th digit; weights 3 2 7 6 5 4 3 2 over digits 1–8) and the century digit (0, 8 or 9).
 */
function normaliseKennitala(input: unknown): string | null {
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
function safeNextPath(input: unknown, fallback = '/eg'): string {
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
function pickClaim(claims: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    const v = claims[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

/** Append query params to an app URL (origin + path), keeping any existing query. */
function withParams(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/** Split a comma/space separated env value, keeping order and dropping blanks. */
function listFromEnv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parts = value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
}

// ---- end bundle ----

const FN = 'mt-eid';
const SESSION_TTL_MS = 10 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10_000;

type Config = {
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  redirectUrl: string;
  appOrigin: string;
  scopes: string;
  idClaims: string[];
  nameClaims: string[];
};

type Discovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };

function config(): Config | null {
  const issuer = Deno.env.get('EID_ISSUER')?.trim();
  const clientId = Deno.env.get('EID_CLIENT_ID')?.trim();
  const redirectUrl = Deno.env.get('EID_REDIRECT_URL')?.trim();
  const appOrigin = Deno.env.get('EID_APP_ORIGIN')?.trim().replace(/\/+$/, '');
  if (!issuer || !clientId || !redirectUrl || !appOrigin) return null;
  return {
    issuer: issuer.replace(/\/+$/, ''),
    clientId,
    clientSecret: Deno.env.get('EID_CLIENT_SECRET')?.trim() || null,
    redirectUrl,
    appOrigin,
    scopes: Deno.env.get('EID_SCOPES')?.trim() || 'openid profile national_id',
    idClaims: listFromEnv(Deno.env.get('EID_ID_CLAIM'), ['national_id', 'kennitala', 'ssn', 'nationalId']),
    nameClaims: listFromEnv(Deno.env.get('EID_NAME_CLAIM'), ['name']),
  };
}

let discoveryCache: { issuer: string; value: Discovery; at: number } | null = null;

async function discover(cfg: Config): Promise<Discovery> {
  if (discoveryCache && discoveryCache.issuer === cfg.issuer && Date.now() - discoveryCache.at < 3_600_000) return discoveryCache.value;
  const res = await fetch(`${cfg.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`discovery HTTP ${res.status}`);
  const doc = (await res.json()) as Partial<Discovery>;
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri || !doc.issuer) throw new Error('discovery document incomplete');
  const value = doc as Discovery;
  discoveryCache = { issuer: cfg.issuer, value, at: Date.now() };
  return value;
}

/** /start is a GET with an Authorization header, so the preflight must allow GET. */
function preflight(): Response {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

async function start(req: Request, url: URL): Promise<Response> {
  const cfg = config();
  if (!cfg) return json({ code: 'EID_NOT_CONFIGURED' }, 503);

  const token = bearerToken(req);
  if (!token) return json({ code: 'AUTH_REQUIRED' }, 401);
  const admin = serviceClient();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ code: 'AUTH_REQUIRED' }, 401);
  const userId = userData.user.id;

  let doc: Discovery;
  try {
    doc = await discover(cfg);
  } catch (err) {
    log(FN, 'error', 'discovery failed', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'EID_FAILED' }, 502);
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const next = safeNextPath(url.searchParams.get('next'));
  const { error } = await admin.from('mt_eid_sessions').insert({
    state,
    user_id: userId,
    code_verifier: verifier,
    nonce,
    next_path: next,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (error) {
    log(FN, 'error', 'session insert failed', { message: error.message });
    return json({ code: 'EID_FAILED' }, 500);
  }

  const authorize = new URL(doc.authorization_endpoint);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', cfg.clientId);
  authorize.searchParams.set('redirect_uri', cfg.redirectUrl);
  authorize.searchParams.set('scope', cfg.scopes);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', await pkceChallenge(verifier));
  authorize.searchParams.set('code_challenge_method', 'S256');
  log(FN, 'info', 'start', { provider: new URL(cfg.issuer).host });
  return json({ url: authorize.toString() });
}

async function exchangeCode(cfg: Config, doc: Discovery, code: string, verifier: string): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: cfg.redirectUrl, code_verifier: verifier, client_id: cfg.clientId });
  const attempt = async (mode: 'basic' | 'post' | 'none') => {
    const body = new URLSearchParams(form);
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (mode === 'basic' && cfg.clientSecret) headers.Authorization = `Basic ${btoa(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`)}`;
    if (mode === 'post' && cfg.clientSecret) body.set('client_secret', cfg.clientSecret);
    return fetch(doc.token_endpoint, { method: 'POST', headers, body, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  };
  let res = await attempt(cfg.clientSecret ? 'basic' : 'none');
  if (!res.ok && cfg.clientSecret && (res.status === 400 || res.status === 401)) res = await attempt('post');
  if (!res.ok) throw new Error(`token HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

async function callback(url: URL): Promise<Response> {
  const cfg = config();
  if (!cfg) return json({ code: 'EID_NOT_CONFIGURED' }, 503);
  const admin = serviceClient();
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const fallback = `${cfg.appOrigin}/eg`;

  const { data: session } = state
    ? await admin.from('mt_eid_sessions').select('*').eq('state', state).maybeSingle()
    : { data: null };
  if (session) await admin.from('mt_eid_sessions').delete().eq('state', state); // single use

  const back = (params: Record<string, string>) =>
    redirect(withParams(`${cfg.appOrigin}${safeNextPath(session?.next_path)}`, params));

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    log(FN, 'warn', 'unknown or expired state');
    return redirect(withParams(fallback, { eid: 'error', code: 'EID_FAILED' }));
  }
  if (url.searchParams.get('error') || !code) {
    log(FN, 'info', 'provider returned without a code', { error: url.searchParams.get('error') ?? 'none' });
    return back({ eid: 'error', code: 'EID_CANCELLED' });
  }

  try {
    const doc = await discover(cfg);
    const tokens = await exchangeCode(cfg, doc, code, session.code_verifier);
    const idToken = typeof tokens.id_token === 'string' ? tokens.id_token : null;
    if (!idToken) throw new Error('no id_token');
    const jwks = createRemoteJWKSet(new URL(doc.jwks_uri));
    const { payload } = await jwtVerify(idToken, jwks, { issuer: doc.issuer, audience: cfg.clientId, clockTolerance: 60 });
    if (payload.nonce !== session.nonce) throw new Error('nonce mismatch');

    const kennitala = normaliseKennitala(pickClaim(payload as Record<string, unknown>, cfg.idClaims));
    if (!kennitala) throw new Error('no valid national id claim');
    const name = pickClaim(payload as Record<string, unknown>, cfg.nameClaims);

    const { error } = await admin.rpc('mt_eid_apply', {
      p_user: session.user_id,
      p_kennitala: kennitala,
      p_name: name ?? '',
      p_provider: new URL(doc.issuer).host,
    });
    if (error) {
      if (error.message.includes('KENNITALA_IN_USE')) return back({ eid: 'error', code: 'KENNITALA_IN_USE' });
      throw new Error(`apply failed: ${error.code ?? ''}`);
    }
    log(FN, 'info', 'verified', { provider: new URL(doc.issuer).host });
    return back({ eid: 'ok' });
  } catch (err) {
    log(FN, 'error', 'callback failed', { message: err instanceof Error ? err.message : 'unknown' });
    return back({ eid: 'error', code: 'EID_FAILED' });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  const url = new URL(req.url);
  try {
    if (req.method === 'GET' && url.pathname.endsWith('/start')) return await start(req, url);
    if (req.method === 'GET' && url.pathname.endsWith('/callback')) return await callback(url);
    return json({ code: 'NOT_FOUND' }, 404);
  } catch (err) {
    log(FN, 'error', 'unhandled', { message: err instanceof Error ? err.message : 'unknown' });
    return json({ code: 'EID_FAILED' }, 500);
  }
});
