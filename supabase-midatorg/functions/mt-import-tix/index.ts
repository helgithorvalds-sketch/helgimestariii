// mt-import-tix — reads the tix.is front page (order + "Uppselt" chips) and the
// category pages, fetches new/stale event pages (events we have never seen first),
// parses them (see ../_shared/tix.ts), upserts through mt_import_events(jsonb) and
// stores the front-page signals through mt_set_tix_signals(text[], text[]).
//
// Deployed with verify_jwt = true. Callable by:
//   * the project's anon key **together with** the x-mt-cron-secret header
//     (pg_cron, see migrations/0006_import_cron.sql and 0008_security_fixes.sql);
//     the anon key alone is public and is refused with 403
//   * a signed-in user whose mt_profiles.role = 'admin' (admin page)
// Returns { scanned, fetched, skipped, parsed, inserted, updated, frontPage: { ranked, soldOut }, errors: [{ id, message }], durationMs }.
// Logs are structured JSON lines and never contain page HTML.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  TIX_CATEGORY_PAGES,
  canonicalEventUrl,
  categoryPageUrl,
  extractEventIds,
  frontPageUrl,
  isTixHost,
  parseEventPage,
  parseFrontPage,
  type FrontPageSignals,
  toImportRow,
  type ImportRow,
  type TixCategory,
} from '../_shared/tix.ts';
import {
  FetchError,
  fetchPage,
  hasValidCronSecret,
  identifyCaller,
  json,
  log,
  preflight,
  serviceClient,
  sleep,
} from '../_shared/edge.ts';

const FN = 'mt-import-tix';
const MAX_EVENT_PAGES = 60; // 120 died with WORKER_RESOURCE_LIMIT (HTTP 546, "Memory limit exceeded") after ~80 pages; 60 is proven to fit
const PAGE_TIMEOUT_MS = 10_000;
const SPACING_MS = 200;
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
const TIME_BUDGET_MS = 110_000; // stay under the platform wall-clock limit
const IMPORT_CHUNK = 25;

interface ImportError {
  id: string;
  message: string;
}

interface RunOptions {
  limit: number;
  categories: ReadonlyArray<{ slug: string; category: TixCategory }>;
}

/** Optional body knobs for manual runs: { limit?: 1..60, categories?: ['music', …] }. */
function readOptions(body: unknown): RunOptions {
  const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  let limit = MAX_EVENT_PAGES;
  if (typeof o.limit === 'number' && Number.isFinite(o.limit)) limit = Math.max(1, Math.min(MAX_EVENT_PAGES, Math.floor(o.limit)));
  let categories = TIX_CATEGORY_PAGES;
  if (Array.isArray(o.categories)) {
    const wanted = new Set(o.categories.filter((c): c is string => typeof c === 'string'));
    const subset = TIX_CATEGORY_PAGES.filter((c) => wanted.has(c.slug));
    if (subset.length > 0) categories = subset;
  }
  return { limit, categories };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let admin;
  try {
    admin = serviceClient();
  } catch (err) {
    log(FN, 'error', 'missing service configuration', { message: err instanceof Error ? err.message : String(err) });
    return json({ error: 'SERVER_MISCONFIGURED' }, 500);
  }

  const caller = await identifyCaller(req, admin);
  if (caller.kind === 'none') return json({ error: 'UNAUTHORIZED', reason: caller.reason }, 401);
  if (caller.kind === 'user') return json({ error: 'NOT_ALLOWED' }, 403);
  if (caller.kind === 'anon' && !(await hasValidCronSecret(req, admin))) {
    log(FN, 'warn', 'anon call without a valid cron secret');
    return json({ error: 'NOT_ALLOWED', reason: 'CRON_SECRET' }, 403);
  }

  let body: unknown = {};
  if (req.method === 'POST') {
    try {
      const text = await req.text();
      body = text.trim() ? JSON.parse(text) : {};
    } catch {
      return json({ error: 'BAD_JSON' }, 400);
    }
  }
  const options = readOptions(body);
  const startedAt = Date.now();
  const errors: ImportError[] = [];
  log(FN, 'info', 'run started', { caller: caller.kind, limit: options.limit, categories: options.categories.map((c) => c.slug) });

  // 0. Front page: what tix.is puts first is what is popular, and its "Uppselt" chips.
  const candidates = new Map<string, TixCategory | undefined>();
  let front: FrontPageSignals = { ranked: [], soldOut: [] };
  try {
    const res = await fetchPage(frontPageUrl(), { timeoutMs: PAGE_TIMEOUT_MS, allowHost: isTixHost });
    if (res.status === 200) {
      front = parseFrontPage(res.text);
      log(FN, 'info', 'front page scanned', { bytes: res.text.length, ranked: front.ranked.length, soldOut: front.soldOut.length });
    } else {
      errors.push({ id: 'front', message: `HTTP ${res.status}` });
    }
  } catch (err) {
    const message = err instanceof FetchError ? err.message : 'unexpected error';
    errors.push({ id: 'front', message });
    log(FN, 'warn', 'front page failed', { message });
  }
  await sleep(SPACING_MS);

  // 1. Category pages → candidate ids (the first category that lists an id wins).
  for (const page of options.categories) {
    const url = categoryPageUrl(page.slug);
    try {
      const res = await fetchPage(url, { timeoutMs: PAGE_TIMEOUT_MS, allowHost: isTixHost });
      if (res.status !== 200) {
        errors.push({ id: `category:${page.slug}`, message: `HTTP ${res.status}` });
        log(FN, 'warn', 'category page not ok', { slug: page.slug, status: res.status });
        continue;
      }
      const ids = extractEventIds(res.text);
      for (const id of ids) if (candidates.get(id) === undefined) candidates.set(id, page.category);
      log(FN, 'info', 'category page scanned', { slug: page.slug, bytes: res.text.length, ids: ids.length });
    } catch (err) {
      const message = err instanceof FetchError ? err.message : 'unexpected error';
      errors.push({ id: `category:${page.slug}`, message });
      log(FN, 'warn', 'category page failed', { slug: page.slug, message });
    }
    await sleep(SPACING_MS);
  }
  for (const id of front.ranked) if (!candidates.has(id)) candidates.set(id, undefined);
  const scanned = candidates.size;

  // 2. Which ids we already have, and which of those were refreshed within the last 24h.
  const known = new Set<string>();
  const fresh = new Set<string>();
  const allIds = [...candidates.keys()];
  const freshCutoff = Date.now() - FRESH_WINDOW_MS;
  for (let i = 0; i < allIds.length; i += 100) {
    const chunk = allIds.slice(i, i + 100);
    const { data, error } = await admin.from('mt_events').select('tix_event_id, updated_at').in('tix_event_id', chunk);
    if (error) {
      errors.push({ id: 'db:mt_events', message: error.message });
      log(FN, 'error', 'freshness lookup failed', { message: error.message });
      break;
    }
    for (const row of data ?? []) {
      if (!row.tix_event_id) continue;
      known.add(row.tix_event_id);
      if (new Date(row.updated_at).getTime() >= freshCutoff) fresh.add(row.tix_event_id);
    }
  }
  const stale = allIds.filter((id) => !fresh.has(id));
  // New events first (they are not on Miðatorg at all yet), then the rest. Within each
  // group, interleave categories (round-robin) so one run never spends its whole budget
  // on the first category.
  const interleave = (ids: string[]): string[] => {
    const byCategory = new Map<string, string[]>();
    for (const id of ids) {
      const cat = candidates.get(id) ?? 'front';
      const list = byCategory.get(cat) ?? [];
      list.push(id);
      byCategory.set(cat, list);
    }
    const out: string[] = [];
    const lists = [...byCategory.values()];
    for (let i = 0; out.length < ids.length; i++) {
      for (const list of lists) if (i < list.length) out.push(list[i]);
    }
    return out;
  };
  const queue = [...interleave(stale.filter((id) => !known.has(id))), ...interleave(stale.filter((id) => known.has(id)))].slice(0, options.limit);
  const skipped = scanned - stale.length;

  // 3. Event pages, sequentially and politely.
  const rows: ImportRow[] = [];
  let fetched = 0;
  let parsedFromMeta = 0;
  for (const id of queue) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      errors.push({ id: 'budget', message: `time budget exhausted after ${fetched} event pages` });
      log(FN, 'warn', 'time budget exhausted', { fetched, remaining: queue.length - fetched });
      break;
    }
    const category = candidates.get(id);
    const url = canonicalEventUrl(id);
    fetched += 1;
    try {
      const res = await fetchPage(url, { timeoutMs: PAGE_TIMEOUT_MS, allowHost: isTixHost });
      if (res.status !== 200) {
        errors.push({ id, message: `HTTP ${res.status}` });
        log(FN, 'warn', 'event page not ok', { id, status: res.status });
      } else {
        const parsed = parseEventPage(res.text, { url: res.finalUrl || url, id, category });
        if (!parsed.ok) {
          errors.push({ id, message: parsed.reason });
          log(FN, 'warn', 'event page not parseable', { id, reason: parsed.reason, bytes: res.text.length });
        } else {
          if (parsed.event.parsed_from === 'meta') parsedFromMeta += 1;
          rows.push(toImportRow(parsed.event));
        }
      }
    } catch (err) {
      const message = err instanceof FetchError ? err.message : 'unexpected error';
      errors.push({ id, message });
      log(FN, 'warn', 'event page failed', { id, message });
    }
    await sleep(SPACING_MS);
  }

  // 4. Upsert through the RPC in small batches.
  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
    const chunk = rows.slice(i, i + IMPORT_CHUNK);
    const { data, error } = await admin.rpc('mt_import_events', { p_events: chunk });
    if (error) {
      errors.push({ id: `import:${i / IMPORT_CHUNK}`, message: error.message });
      log(FN, 'error', 'mt_import_events failed', { chunk: i / IMPORT_CHUNK, size: chunk.length, message: error.message });
      continue;
    }
    const result = (data ?? {}) as { inserted?: number; updated?: number };
    inserted += result.inserted ?? 0;
    updated += result.updated ?? 0;
  }

  // 5. Front-page order and sold-out chips (after the upsert so new events get their rank too).
  if (front.ranked.length > 0) {
    const { error } = await admin.rpc('mt_set_tix_signals', { p_ranked: front.ranked, p_sold_out: front.soldOut });
    if (error) {
      errors.push({ id: 'signals', message: error.message });
      log(FN, 'error', 'mt_set_tix_signals failed', { message: error.message });
    }
  }

  const summary = {
    scanned,
    fetched,
    skipped,
    parsed: rows.length,
    inserted,
    updated,
    frontPage: { ranked: front.ranked.length, soldOut: front.soldOut.length },
    errors,
    durationMs: Date.now() - startedAt,
  };
  log(FN, 'info', 'run finished', { ...summary, errors: errors.length, parsedFromMeta });
  return json(summary);
});
