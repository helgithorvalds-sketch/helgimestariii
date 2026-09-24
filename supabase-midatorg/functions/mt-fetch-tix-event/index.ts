// mt-fetch-tix-event — admin-only: fetch and import a single tix.is event page.
// Body: { url }. Only tix.is / www.tix.is hosts, also across redirects. Returns { eventId, title }.
// Deployed with verify_jwt = true; the caller must be a signed-in admin.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { eventIdFromUrl, isTixHost, parseEventPage, toImportRow } from '../_shared/tix.ts';
import { FetchError, fetchPage, identifyCaller, json, log, preflight, serviceClient } from '../_shared/edge.ts';

const FN = 'mt-fetch-tix-event';
const PAGE_TIMEOUT_MS = 10_000;

function normaliseTixUrl(input: unknown): { url: string; id: string } | { error: string } {
  if (typeof input !== 'string' || !input.trim()) return { error: 'URL_REQUIRED' };
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { error: 'INVALID_URL' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'INVALID_URL' };
  if (!isTixHost(u.hostname)) return { error: 'HOST_NOT_ALLOWED' };
  const id = eventIdFromUrl(u.pathname);
  if (!id) return { error: 'NOT_AN_EVENT_URL' };
  u.protocol = 'https:';
  u.hash = '';
  return { url: u.toString(), id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let admin;
  try {
    admin = serviceClient();
  } catch (err) {
    log(FN, 'error', 'missing service configuration', { message: err instanceof Error ? err.message : String(err) });
    return json({ error: 'SERVER_MISCONFIGURED' }, 500);
  }

  const caller = await identifyCaller(req, admin);
  if (caller.kind === 'none') return json({ error: 'UNAUTHORIZED', reason: caller.reason }, 401);
  if (caller.kind !== 'admin') return json({ error: 'NOT_ALLOWED' }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await req.text());
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return json({ error: 'BAD_JSON' }, 400);
  }
  const target = normaliseTixUrl(body.url);
  if ('error' in target) return json({ error: target.error }, 400);
  log(FN, 'info', 'fetch requested', { by: caller.userId, id: target.id });

  let page;
  try {
    page = await fetchPage(target.url, { timeoutMs: PAGE_TIMEOUT_MS, allowHost: isTixHost });
  } catch (err) {
    const message = err instanceof FetchError ? err.message : 'unexpected error';
    log(FN, 'warn', 'fetch failed', { id: target.id, message });
    return json({ error: 'FETCH_FAILED', message }, 502);
  }
  if (page.status !== 200) {
    log(FN, 'warn', 'page not ok', { id: target.id, status: page.status });
    return json({ error: 'FETCH_FAILED', status: page.status }, 502);
  }

  const parsed = parseEventPage(page.text, { url: page.finalUrl || target.url, id: target.id });
  if (!parsed.ok) {
    log(FN, 'warn', 'page not parseable', { id: target.id, reason: parsed.reason, bytes: page.text.length });
    return json({ error: 'PARSE_FAILED', reason: parsed.reason }, 422);
  }

  const { data: result, error: rpcError } = await admin.rpc('mt_import_events', { p_events: [toImportRow(parsed.event)] });
  if (rpcError) {
    log(FN, 'error', 'mt_import_events failed', { id: target.id, message: rpcError.message });
    return json({ error: 'IMPORT_FAILED', message: rpcError.message }, 500);
  }
  const counts = (result ?? {}) as { inserted?: number; updated?: number };
  if ((counts.inserted ?? 0) + (counts.updated ?? 0) === 0) {
    return json({ error: 'IMPORT_REJECTED' }, 422);
  }

  const { data: event, error: lookupError } = await admin
    .from('mt_events')
    .select('id, title')
    .eq('tix_event_id', parsed.event.tix_event_id)
    .maybeSingle();
  if (lookupError || !event) {
    log(FN, 'error', 'event lookup failed after import', { id: target.id, message: lookupError?.message ?? 'not found' });
    return json({ error: 'LOOKUP_FAILED' }, 500);
  }
  log(FN, 'info', 'imported', {
    id: target.id,
    eventId: event.id,
    inserted: counts.inserted ?? 0,
    updated: counts.updated ?? 0,
    parsedFrom: parsed.event.parsed_from,
  });
  return json({ eventId: event.id, title: event.title, inserted: counts.inserted ?? 0, updated: counts.updated ?? 0 });
});
