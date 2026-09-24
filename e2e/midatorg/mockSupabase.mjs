/**
 * Playwright route-level emulator for Miðatorg's Supabase project.
 *
 * The sandbox cannot reach qiylxtybmlzvoadvbnca.supabase.co, so this module
 * intercepts every request the browser makes to that host and answers it from
 * JSON fixtures exported from the real (seeded) database:
 *
 *   - /rest/v1/<table>      small PostgREST emulator (select / filters / order /
 *                           limit / offset / Prefer count / .single() / inserts,
 *                           updates, deletes, upserts) with light RLS emulation
 *   - /rest/v1/rpc/<fn>     mt_reserve_listing, mt_deal_transition, mt_rate_deal,
 *                           mt_admin_set_ban, mt_admin_set_verification
 *   - /auth/v1/*            password login for the fixture users, user, refresh, logout
 *   - /storage/v1/*         signed URLs / uploads answered with tiny placeholder files
 *   - realtime websocket    answered by a fake Phoenix server (joins/heartbeats ok)
 *
 * Everything lives in memory per `installSupabaseMock()` call, so writes made
 * during a session are visible to later reads of the same page/context.
 * Every request the emulator does not understand is logged with the prefix
 * `[supabase-mock] UNHANDLED` and collected in `state.unhandled`.
 *
 *   import { installSupabaseMock } from './mockSupabase.mjs';
 *   const mock = await installSupabaseMock(page, { fixturesDir: 'e2e/midatorg/fixtures' });
 *   ...
 *   mock.unhandled  // ['GET /rest/v1/mt_foo?...']
 *   mock.db         // the live in-memory tables
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const PROJECT_REF = 'qiylxtybmlzvoadvbnca';

export const FIXTURE_TABLES = [
  'mt_events',
  'mt_events_market',
  'mt_venues',
  'mt_listings',
  'mt_public_profiles',
  'mt_requests',
  'mt_price_snapshots',
  'mt_settings',
  'mt_public_settings',
  'mt_deals',
  'mt_messages',
  'mt_ratings',
  'mt_notifications',
  'mt_alerts',
  'mt_profiles',
  'mt_reports',
  'mt_listing_proofs',
];

/** The two password test users (see supabase-midatorg/seed/test_users.sql). Passwords are not checked. */
export const TEST_ACCOUNTS = [
  { displayName: 'Prufu Kaupandi', email: 'kaupandi@test.midatorg.local' },
  { displayName: 'Prufu Seljandi', email: 'seljandi@test.midatorg.local' },
];

const PRIMARY_KEY = { mt_settings: 'key', mt_listing_proofs: 'listing_id' };
const HAS_UPDATED_AT = new Set(['mt_events', 'mt_listings', 'mt_requests', 'mt_deals', 'mt_profiles', 'mt_settings']);
const OPEN_DEAL_STATUSES = new Set(['reserved', 'paid_claimed', 'ticket_sent', 'disputed']);
const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
const FAR_FUTURE_EXP = 4102444800; // 2100-01-01T00:00:00Z

const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const b64url = (s) => Buffer.from(s).toString('base64url');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
export function loadFixtures(fixturesDir) {
  const db = {};
  for (const table of FIXTURE_TABLES) {
    const file = path.join(fixturesDir, `${table}.json`);
    db[table] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }
  db.mt_event_stats = [];
  for (const e of db.mt_events_market) refreshEventStats(db, e.id, { fromFixture: true });
  return db;
}

/** Recomputes the `mt_events_market` / `mt_event_stats` aggregates for one event from listings, requests and deals. */
function refreshEventStats(db, eventId, { fromFixture = false } = {}) {
  const market = db.mt_events_market.find((e) => e.id === eventId);
  if (!market) return;
  if (!fromFixture) {
    const active = db.mt_listings.filter((l) => l.event_id === eventId && l.status === 'active' && l.quantity_remaining > 0);
    const asks = active.map((l) => l.asking_price);
    const reqs = db.mt_requests.filter((r) => r.event_id === eventId && r.status === 'active');
    const completed = db.mt_deals
      .filter((d) => d.event_id === eventId && d.status === 'completed')
      .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    market.tickets_available = active.reduce((n, l) => n + l.quantity_remaining, 0);
    market.listings_active = active.length;
    market.min_ask = asks.length ? Math.min(...asks) : null;
    market.avg_ask = asks.length ? Math.round(asks.reduce((a, b) => a + b, 0) / asks.length) : null;
    market.requests_active = reqs.length;
    market.wanted_tickets = reqs.reduce((n, r) => n + r.quantity, 0);
    const bids = reqs.map((r) => r.max_price).filter((v) => v != null);
    market.max_bid = bids.length ? Math.max(...bids) : null;
    market.sold_count = completed.length;
    market.last_sold_price = completed[0]?.price_per_ticket ?? null;
    market.last_sold_at = completed[0]?.completed_at ?? null;
  }
  const stats = {
    event_id: market.id,
    tickets_available: market.tickets_available,
    listings_active: market.listings_active,
    min_ask: market.min_ask,
    avg_ask: market.avg_ask,
    requests_active: market.requests_active,
    wanted_tickets: market.wanted_tickets,
    max_bid: market.max_bid,
    sold_count: market.sold_count,
    last_sold_price: market.last_sold_price,
    last_sold_at: market.last_sold_at,
  };
  const i = db.mt_event_stats.findIndex((s) => s.event_id === eventId);
  if (i >= 0) db.mt_event_stats[i] = stats;
  else db.mt_event_stats.push(stats);
}

// ---------------------------------------------------------------------------
// PostgREST query grammar
// ---------------------------------------------------------------------------
/** Splits on top-level commas, respecting "quoted" values and (parentheses). */
function splitTop(s) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      cur += c;
      if (c === '\\' && i + 1 < s.length) cur += s[++i];
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') {
      quoted = true;
      cur += c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur !== '') out.push(cur);
  return out;
}

function unquote(v) {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\(.)/g, '$1');
  return t;
}

/** `col=op.value` (query param) → condition node. */
function parseOpVal(col, rest, negate = false) {
  if (rest.startsWith('not.')) {
    negate = !negate;
    rest = rest.slice(4);
  }
  const j = rest.indexOf('.');
  const op = j < 0 ? rest : rest.slice(0, j);
  const val = j < 0 ? '' : rest.slice(j + 1);
  return { type: 'cmp', col, op, val, negate };
}

/** One element of an `or=(...)` / `and=(...)` list. */
function parseCond(str) {
  const s = str.trim();
  const m = /^(and|or)\((.*)\)$/s.exec(s);
  if (m) return { type: m[1], children: splitTop(m[2]).map(parseCond) };
  let negate = false;
  let rest = s;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const i = rest.indexOf('.');
  if (i < 0) throw new Error(`cannot parse filter "${str}"`);
  return parseOpVal(rest.slice(0, i), rest.slice(i + 1), negate);
}

function parseFilters(params) {
  const filters = [];
  for (const [key, value] of params) {
    if (RESERVED_PARAMS.has(key)) continue;
    if (key === 'or' || key === 'and') {
      const inner = value.trim().replace(/^\(/, '').replace(/\)$/, '');
      filters.push({ type: key, children: splitTop(inner).map(parseCond) });
    } else {
      filters.push(parseOpVal(key, value));
    }
  }
  return filters;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function likeRegex(pattern, caseInsensitive) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      re += escapeRe(pattern[++i]);
      continue;
    }
    if (c === '%' || c === '*') re += '[\\s\\S]*';
    else if (c === '_') re += '[\\s\\S]';
    else re += escapeRe(c);
  }
  return new RegExp(`^${re}$`, caseInsensitive ? 'i' : '');
}

function ordCompare(a, b) {
  if (typeof a === 'number') return a - Number(b);
  if (typeof a === 'boolean') return Number(a) - Number(b === 'true');
  const sa = String(a);
  const sb = String(b);
  if (/^\d{4}-\d{2}-\d{2}/.test(sa) && /^\d{4}-\d{2}-\d{2}/.test(sb)) {
    const da = Date.parse(sa);
    const dbv = Date.parse(sb);
    if (!Number.isNaN(da) && !Number.isNaN(dbv)) return da - dbv;
  }
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function evalCond(row, node, warn) {
  if (node.type === 'or') return node.children.some((c) => evalCond(row, c, warn));
  if (node.type === 'and') return node.children.every((c) => evalCond(row, c, warn));
  const v = row[node.col];
  const val = node.val;
  let r;
  switch (node.op) {
    case 'eq':
      r = v != null && String(v) === unquote(val);
      break;
    case 'neq':
      r = v != null && String(v) !== unquote(val);
      break;
    case 'gt':
      r = v != null && ordCompare(v, unquote(val)) > 0;
      break;
    case 'gte':
      r = v != null && ordCompare(v, unquote(val)) >= 0;
      break;
    case 'lt':
      r = v != null && ordCompare(v, unquote(val)) < 0;
      break;
    case 'lte':
      r = v != null && ordCompare(v, unquote(val)) <= 0;
      break;
    case 'like':
      r = v != null && likeRegex(unquote(val), false).test(String(v));
      break;
    case 'ilike':
      r = v != null && likeRegex(unquote(val), true).test(String(v));
      break;
    case 'is': {
      const t = val.toLowerCase();
      if (t === 'null') r = v == null;
      else if (t === 'true') r = v === true;
      else if (t === 'false') r = v === false;
      else if (t === 'not.null') r = v != null; // tolerated
      else r = false;
      break;
    }
    case 'in': {
      const list = splitTop(val.replace(/^\(/, '').replace(/\)$/, '')).map(unquote);
      r = v != null && list.includes(String(v));
      break;
    }
    default:
      warn(`filter operator "${node.op}" is not emulated (treated as true)`);
      r = true;
  }
  return node.negate ? !r : r;
}

function parseOrder(str) {
  if (!str) return [];
  return splitTop(str).map((part) => {
    const bits = part.trim().split('.');
    const col = bits[0];
    const asc = !bits.includes('desc');
    const nullsFirst = bits.includes('nullsfirst') ? true : bits.includes('nullslast') ? false : undefined;
    return { col, asc, nullsFirst };
  });
}

function sortRows(rows, orders) {
  if (orders.length === 0) return rows;
  return rows.slice().sort((a, b) => {
    for (const o of orders) {
      const va = a[o.col];
      const vb = b[o.col];
      const na = va == null;
      const nb = vb == null;
      if (na || nb) {
        if (na && nb) continue;
        const nullsFirst = o.nullsFirst ?? !o.asc; // postgres default: asc → nulls last, desc → nulls first
        return (na ? -1 : 1) * (nullsFirst ? 1 : -1);
      }
      let c;
      if (typeof va === 'number' && typeof vb === 'number') c = va - vb;
      else if (typeof va === 'boolean' && typeof vb === 'boolean') c = Number(va) - Number(vb);
      else c = String(va).localeCompare(String(vb), 'is');
      if (c !== 0) return o.asc ? c : -c;
    }
    return 0;
  });
}

/** `select=` → null for `*`, else [{ name, alias }]. Embedded resources are not supported (logged). */
function parseSelect(str, warn) {
  if (!str || str.trim() === '*') return null;
  const cols = [];
  for (const raw of splitTop(str)) {
    let p = raw.trim();
    if (!p) continue;
    if (p.includes('(')) {
      warn(`embedded resource "${p}" in select is not emulated`);
      p = p.slice(0, p.indexOf('(')).replace(/!.*$/, '');
    }
    let alias = null;
    if (p.includes(':')) [alias, p] = p.split(':');
    p = p.replace(/::.*$/, '').trim();
    if (p === '*') return null;
    cols.push({ name: p, alias: (alias ?? p).trim() });
  }
  return cols;
}

function project(row, cols) {
  if (!cols) return row;
  const out = {};
  for (const c of cols) out[c.alias] = row[c.name] === undefined ? null : row[c.name];
  return out;
}

function parsePrefer(header) {
  const out = {};
  for (const part of (header ?? '').split(',')) {
    const [k, v] = part.trim().split('=');
    if (k) out[k] = v ?? true;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function makeJwt(payload) {
  return `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.${b64url('mock-signature')}`;
}

function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function tinyPng() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

/** A 1x1 solid-colour PNG (stretched by the browser) used in place of blocked external images. */
function solidPng(r, g, b) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const idat = zlib.deflateSync(Buffer.from([0, r, g, b]));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
const PLACEHOLDER_PNG = solidPng(0x2a, 0x33, 0x40);

function tinyPdf() {
  return Buffer.from(
    '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  );
}

// ---------------------------------------------------------------------------
// The emulator
// ---------------------------------------------------------------------------
/**
 * @param page Playwright page
 * @param options.fixturesDir directory with <table>.json fixture files
 * @param options.users extra `{ email, id }` or `{ email, displayName }` accounts allowed to log in
 * @param options.mutate `(db) => void` hook to tweak the in-memory copy before the first request
 * @param options.localOrigins request origins that are passed through untouched (default: 127.0.0.1 / localhost)
 * @param options.verbose log every handled request
 */
export async function installSupabaseMock(page, options = {}) {
  const {
    fixturesDir,
    users = [],
    mutate,
    localOrigins = ['http://127.0.0.1', 'http://localhost', 'http://[::1]'],
    verbose = false,
    projectRef = PROJECT_REF,
    blockExternal = true,
  } = options;
  if (!fixturesDir) throw new Error('installSupabaseMock: fixturesDir is required');

  const db = loadFixtures(fixturesDir);
  if (mutate) mutate(db);

  const origin = `https://${projectRef}.supabase.co`;
  const state = { db, origin, unhandled: [], warnings: [], requests: [], externalBlocked: [], externalStubbed: [] };
  const log = (...a) => console.log('[supabase-mock]', ...a);
  const warn = (msg) => {
    if (!state.warnings.includes(msg)) {
      state.warnings.push(msg);
      log('WARN', msg);
    }
  };

  /** email → profile id */
  const accounts = new Map();
  for (const acc of [...TEST_ACCOUNTS, ...users]) {
    const profile = acc.id
      ? db.mt_profiles.find((p) => p.id === acc.id)
      : db.mt_profiles.find((p) => p.display_name === acc.displayName);
    if (profile) accounts.set(acc.email.toLowerCase(), profile.id);
    else warn(`account ${acc.email}: no matching mt_profiles row`);
  }

  // ---- auth -------------------------------------------------------------
  function authUser(uid, email) {
    const profile = db.mt_profiles.find((p) => p.id === uid);
    const created = profile?.created_at ?? '2026-01-01T00:00:00Z';
    return {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: created,
      phone: '',
      confirmed_at: created,
      last_sign_in_at: nowIso(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: profile?.display_name ?? email.split('@')[0], email, email_verified: true },
      identities: [],
      created_at: created,
      updated_at: nowIso(),
      is_anonymous: false,
    };
  }

  function makeSession(uid, email) {
    const now = Math.floor(Date.now() / 1000);
    const user = authUser(uid, email);
    const access_token = makeJwt({
      iss: `${origin}/auth/v1`,
      sub: uid,
      aud: 'authenticated',
      exp: FAR_FUTURE_EXP,
      iat: now,
      email,
      phone: '',
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      role: 'authenticated',
      aal: 'aal1',
      amr: [{ method: 'password', timestamp: now }],
      session_id: uuid(),
      is_anonymous: false,
    });
    return {
      access_token,
      token_type: 'bearer',
      expires_in: FAR_FUTURE_EXP - now,
      expires_at: FAR_FUTURE_EXP,
      refresh_token: `mock-refresh-${uid}-${email}`,
      user,
    };
  }

  function authFromHeaders(headers) {
    const raw = headers['authorization'] ?? '';
    const payload = decodeJwt(raw.replace(/^Bearer\s+/i, ''));
    if (!payload?.sub) return { uid: null, email: null, isAdmin: false, profile: null };
    const profile = db.mt_profiles.find((p) => p.id === payload.sub) ?? null;
    return { uid: payload.sub, email: payload.email ?? null, isAdmin: profile?.role === 'admin', profile };
  }

  // ---- RLS-ish visibility -------------------------------------------------
  function canRead(table, row, auth) {
    switch (table) {
      case 'mt_deals':
        return auth.isAdmin || (!!auth.uid && (row.buyer_id === auth.uid || row.seller_id === auth.uid));
      case 'mt_messages': {
        if (auth.isAdmin) return true;
        const d = db.mt_deals.find((x) => x.id === row.deal_id);
        return !!d && !!auth.uid && (d.buyer_id === auth.uid || d.seller_id === auth.uid);
      }
      case 'mt_notifications':
      case 'mt_alerts':
        return !!auth.uid && row.user_id === auth.uid;
      case 'mt_profiles':
        return auth.isAdmin || (!!auth.uid && row.id === auth.uid);
      case 'mt_reports':
        return auth.isAdmin || (!!auth.uid && row.reporter_id === auth.uid);
      case 'mt_listing_proofs': {
        if (auth.isAdmin) return true;
        if (!auth.uid) return false;
        if (row.seller_id === auth.uid) return true;
        return db.mt_deals.some(
          (d) => d.listing_id === row.listing_id && d.buyer_id === auth.uid && ['ticket_sent', 'completed', 'disputed'].includes(d.status),
        );
      }
      default:
        return true;
    }
  }

  // ---- write helpers ------------------------------------------------------
  function notify(userId, type, title, body, link, refId = null) {
    db.mt_notifications.push({ id: uuid(), user_id: userId, type, title, body, link, ref_id: refId, read_at: null, created_at: nowIso() });
  }

  function recomputeListing(listingId) {
    const l = db.mt_listings.find((x) => x.id === listingId);
    if (!l || l.status === 'cancelled' || l.status === 'expired') return;
    const open = db.mt_deals.filter((d) => d.listing_id === listingId && OPEN_DEAL_STATUSES.has(d.status)).length;
    l.status = l.quantity_remaining > 0 ? 'active' : open > 0 ? 'reserved' : 'sold';
    l.updated_at = nowIso();
    refreshEventStats(db, l.event_id);
  }

  function applyDefaults(table, input, auth) {
    const row = { ...input };
    const ts = nowIso();
    const pk = PRIMARY_KEY[table] ?? 'id';
    if (pk === 'id' && !row.id) row.id = uuid();
    if (row.created_at == null) row.created_at = ts;
    if (HAS_UPDATED_AT.has(table)) row.updated_at = ts;
    switch (table) {
      case 'mt_listings': {
        row.seller_id ??= auth.uid;
        row.status ??= 'active';
        row.quantity_remaining = row.quantity;
        row.split_allowed ??= true;
        row.ticket_type ??= null;
        row.seat_info ??= null;
        row.notes ??= null;
        const ev = db.mt_events.find((e) => e.id === row.event_id);
        if (ev && (!row.expires_at || String(row.expires_at) > String(ev.starts_at))) row.expires_at = ev.starts_at;
        break;
      }
      case 'mt_requests':
        row.buyer_id ??= auth.uid;
        row.status ??= 'active';
        row.max_price ??= null;
        row.notes ??= null;
        break;
      case 'mt_alerts':
        row.user_id ??= auth.uid;
        row.max_price ??= null;
        break;
      case 'mt_messages':
        row.sender_id ??= auth.uid;
        break;
      case 'mt_reports':
        row.reporter_id ??= auth.uid;
        row.status ??= 'open';
        row.resolved_by ??= null;
        row.resolved_at ??= null;
        break;
      case 'mt_events':
        row.source = 'manual';
        row.status = 'upcoming';
        row.created_by = auth.uid;
        row.tix_event_id ??= null;
        row.venue_id ??= null;
        row.image_url ??= null;
        row.tix_url ??= null;
        row.description ??= null;
        row.face_value_min ??= null;
        row.face_value_max ??= null;
        break;
      case 'mt_notifications':
        row.read_at ??= null;
        break;
      case 'mt_listing_proofs':
        row.seller_id ??= auth.uid;
        break;
      default:
        break;
    }
    return row;
  }

  function afterWrite(table, row) {
    switch (table) {
      case 'mt_events':
        if (!db.mt_events_market.some((e) => e.id === row.id)) {
          db.mt_events_market.push({
            ...row,
            tickets_available: 0,
            listings_active: 0,
            min_ask: null,
            avg_ask: null,
            requests_active: 0,
            wanted_tickets: 0,
            max_bid: null,
            sold_count: 0,
            last_sold_price: null,
            last_sold_at: null,
          });
          refreshEventStats(db, row.id, { fromFixture: true });
        } else {
          const m = db.mt_events_market.find((e) => e.id === row.id);
          Object.assign(m, row);
        }
        break;
      case 'mt_listings':
      case 'mt_requests':
        refreshEventStats(db, row.event_id);
        break;
      case 'mt_messages': {
        const d = db.mt_deals.find((x) => x.id === row.deal_id);
        if (!d) break;
        const to = row.sender_id === d.buyer_id ? d.seller_id : d.buyer_id;
        const already = db.mt_notifications.some((n) => n.user_id === to && n.type === 'message' && n.ref_id === d.id && !n.read_at);
        if (!already) notify(to, 'message', 'Ný skilaboð', String(row.body).slice(0, 120), `/midatorg/vidskipti/${d.id}`, d.id);
        break;
      }
      default:
        break;
    }
  }

  // ---- response helpers ---------------------------------------------------
  const corsHeaders = (reqHeaders) => ({
    'access-control-allow-origin': reqHeaders['origin'] ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
    'access-control-allow-headers':
      reqHeaders['access-control-request-headers'] ??
      'apikey, authorization, content-type, prefer, x-client-info, x-supabase-api-version, accept, accept-profile, content-profile, range, x-upsert, cache-control',
    'access-control-expose-headers': 'Content-Range, Range-Unit, Location, Content-Type, Content-Length, X-Total-Count',
    'access-control-max-age': '86400',
  });

  const json = (status, body, headers = {}, contentType = 'application/json; charset=utf-8') => ({
    status,
    headers: { 'content-type': contentType, ...headers },
    body: body === '' ? '' : JSON.stringify(body),
  });

  const pgRaise = (message) => json(400, { code: 'P0001', message, details: null, hint: null });

  function respondRows(ctx, rows, { status = 200, offset = 0, total = rows.length, countRequested = false } = {}) {
    const wantsObject = (ctx.headers['accept'] ?? '').includes('application/vnd.pgrst.object+json');
    const countPart = countRequested ? String(total) : '*';
    const contentRange = rows.length ? `${offset}-${offset + rows.length - 1}/${countPart}` : `*/${countPart}`;
    const headers = { 'content-range': contentRange, 'range-unit': 'items' };
    if (wantsObject) {
      if (rows.length !== 1) {
        return json(
          406,
          {
            code: 'PGRST116',
            details: rows.length === 0 ? 'The result contains 0 rows' : `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`,
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          },
          headers,
        );
      }
      return json(status, rows[0], headers, 'application/vnd.pgrst.object+json; charset=utf-8');
    }
    if (ctx.method === 'HEAD') return { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers }, body: '' };
    return json(status, rows, headers);
  }

  // ---- /rest/v1/<table> ------------------------------------------------------
  function handleRest(ctx, table) {
    if (!(table in db)) {
      state.unhandled.push(`${ctx.method} ${ctx.url.pathname}${ctx.url.search}`);
      log('UNHANDLED table', ctx.method, ctx.url.pathname + ctx.url.search);
      return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache`, details: null, hint: null });
    }
    const params = ctx.url.searchParams;
    const filters = parseFilters(params);
    const cols = parseSelect(params.get('select'), warn);
    const prefer = parsePrefer(ctx.headers['prefer']);
    const auth = ctx.auth;
    const visible = () => db[table].filter((r) => canRead(table, r, auth));
    const matches = () => visible().filter((r) => filters.every((f) => evalCond(r, f, warn)));

    switch (ctx.method) {
      case 'GET':
      case 'HEAD': {
        let rows = sortRows(matches(), parseOrder(params.get('order')));
        const total = rows.length;
        const offset = Number(params.get('offset') ?? 0);
        const limit = params.has('limit') ? Number(params.get('limit')) : null;
        if (ctx.method === 'GET') rows = rows.slice(offset, limit != null ? offset + limit : undefined);
        return respondRows(ctx, rows.map((r) => project(r, cols)), { offset, total, countRequested: !!prefer.count });
      }
      case 'POST': {
        if (!auth.uid && table !== 'mt_reports') return json(401, { code: '42501', message: 'AUTH_REQUIRED', details: null, hint: null });
        const inputs = Array.isArray(ctx.body) ? ctx.body : [ctx.body ?? {}];
        const upsert = prefer.resolution === 'merge-duplicates';
        const pk = PRIMARY_KEY[table] ?? 'id';
        const conflictCols = params.get('on_conflict')?.split(',').map((s) => s.trim()) ?? [pk];
        const out = [];
        for (const input of inputs) {
          const row = applyDefaults(table, input, auth);
          const existing = db[table].find((r) => conflictCols.every((c) => row[c] != null && String(r[c]) === String(row[c])));
          if (existing && !upsert) {
            return json(409, { code: '23505', message: `duplicate key value violates unique constraint "${table}_pkey"`, details: null, hint: null });
          }
          if (existing) {
            Object.assign(existing, input);
            if (HAS_UPDATED_AT.has(table)) existing.updated_at = nowIso();
            afterWrite(table, existing);
            out.push(existing);
          } else {
            db[table].push(row);
            afterWrite(table, row);
            out.push(row);
          }
        }
        if (prefer.return === 'representation') return respondRows(ctx, out.map((r) => project(r, cols)), { status: 201 });
        return { status: 201, headers: {}, body: '' };
      }
      case 'PATCH': {
        const targets = matches();
        for (const r of targets) {
          Object.assign(r, ctx.body ?? {});
          if (HAS_UPDATED_AT.has(table)) r.updated_at = nowIso();
          afterWrite(table, r);
        }
        if (prefer.return === 'representation') return respondRows(ctx, targets.map((r) => project(r, cols)));
        return { status: 204, headers: {}, body: '' };
      }
      case 'DELETE': {
        const targets = matches();
        db[table] = db[table].filter((r) => !targets.includes(r));
        for (const r of targets) if (table === 'mt_listings' || table === 'mt_requests') refreshEventStats(db, r.event_id);
        if (prefer.return === 'representation') return respondRows(ctx, targets.map((r) => project(r, cols)));
        return { status: 204, headers: {}, body: '' };
      }
      default:
        return null;
    }
  }

  // ---- /rest/v1/rpc/<fn> ------------------------------------------------------
  function handleRpc(ctx, fn) {
    const args = ctx.body ?? {};
    const auth = ctx.auth;
    const minutes = Number(db.mt_settings.find((s) => s.key === 'reservation_minutes')?.value ?? 30);
    switch (fn) {
      case 'mt_reserve_listing': {
        if (!auth.uid) return pgRaise('AUTH_REQUIRED');
        const l = db.mt_listings.find((x) => x.id === args.p_listing_id);
        const q = Number(args.p_quantity);
        if (!l) return pgRaise('LISTING_NOT_FOUND');
        if (l.seller_id === auth.uid) return pgRaise('OWN_LISTING');
        if (l.status !== 'active') return pgRaise('LISTING_NOT_ACTIVE');
        if (!(q >= 1)) return pgRaise('INVALID_QUANTITY');
        if (q > l.quantity_remaining) return pgRaise('NOT_ENOUGH_TICKETS');
        if (!l.split_allowed && q !== l.quantity_remaining) return pgRaise('SPLIT_NOT_ALLOWED');
        if (db.mt_deals.some((d) => d.listing_id === l.id && d.buyer_id === auth.uid && OPEN_DEAL_STATUSES.has(d.status))) return pgRaise('ALREADY_RESERVED');
        const ts = nowIso();
        const deal = {
          id: uuid(),
          listing_id: l.id,
          event_id: l.event_id,
          buyer_id: auth.uid,
          seller_id: l.seller_id,
          quantity: q,
          price_per_ticket: l.asking_price,
          status: 'reserved',
          reserved_until: new Date(Date.now() + minutes * 60_000).toISOString(),
          paid_claimed_at: null,
          ticket_sent_at: null,
          completed_at: null,
          cancelled_at: null,
          cancelled_by: null,
          cancel_reason: null,
          created_at: ts,
          updated_at: ts,
        };
        db.mt_deals.push(deal);
        l.quantity_remaining -= q;
        recomputeListing(l.id);
        const title = db.mt_events.find((e) => e.id === l.event_id)?.title ?? 'viðburð';
        notify(l.seller_id, 'deal', 'Miðar teknir frá', `Kaupandi tók frá ${q} miða á ${title}. Þú hefur ${minutes} mínútur til að ganga frá.`, `/midatorg/vidskipti/${deal.id}`, deal.id);
        return json(200, deal);
      }
      case 'mt_deal_transition': {
        if (!auth.uid) return pgRaise('AUTH_REQUIRED');
        const d = db.mt_deals.find((x) => x.id === args.p_deal_id);
        if (!d) return pgRaise('DEAL_NOT_FOUND');
        const isBuyer = d.buyer_id === auth.uid;
        const isSeller = d.seller_id === auth.uid;
        if (!isBuyer && !isSeller && !auth.isAdmin) return pgRaise('NOT_PARTY');
        const ts = nowIso();
        const l = db.mt_listings.find((x) => x.id === d.listing_id);
        const restore = () => {
          if (l) {
            l.quantity_remaining += d.quantity;
            recomputeListing(l.id);
          }
        };
        switch (args.p_action) {
          case 'mark_paid':
            if (!isBuyer) return pgRaise('NOT_BUYER');
            if (d.status !== 'reserved') return pgRaise('INVALID_TRANSITION');
            if (String(d.reserved_until) < ts) {
              d.status = 'expired';
              restore();
              return pgRaise('RESERVATION_EXPIRED');
            }
            d.status = 'paid_claimed';
            d.paid_claimed_at = ts;
            break;
          case 'confirm_payment':
            if (!isSeller) return pgRaise('NOT_SELLER');
            if (d.status !== 'paid_claimed') return pgRaise('INVALID_TRANSITION');
            d.status = 'ticket_sent';
            d.ticket_sent_at = ts;
            break;
          case 'confirm_received':
            if (!isBuyer) return pgRaise('NOT_BUYER');
            if (d.status !== 'ticket_sent') return pgRaise('INVALID_TRANSITION');
            d.status = 'completed';
            d.completed_at = ts;
            break;
          case 'cancel':
            if (!['reserved', 'paid_claimed'].includes(d.status)) return pgRaise('INVALID_TRANSITION');
            d.status = 'cancelled';
            d.cancelled_at = ts;
            d.cancelled_by = auth.uid;
            d.cancel_reason = args.p_reason ?? null;
            restore();
            break;
          case 'dispute':
            if (d.status !== 'ticket_sent') return pgRaise('INVALID_TRANSITION');
            d.status = 'disputed';
            d.cancel_reason = args.p_reason ?? null;
            break;
          case 'admin_complete':
            if (!auth.isAdmin) return pgRaise('NOT_ADMIN');
            d.status = 'completed';
            d.completed_at = ts;
            break;
          case 'admin_cancel':
            if (!auth.isAdmin) return pgRaise('NOT_ADMIN');
            d.status = 'cancelled';
            d.cancelled_at = ts;
            d.cancelled_by = auth.uid;
            d.cancel_reason = args.p_reason ?? null;
            restore();
            break;
          default:
            return pgRaise('INVALID_ACTION');
        }
        d.updated_at = ts;
        if (l) recomputeListing(l.id);
        refreshEventStats(db, d.event_id);
        return json(200, d);
      }
      case 'mt_rate_deal': {
        if (!auth.uid) return pgRaise('AUTH_REQUIRED');
        const d = db.mt_deals.find((x) => x.id === args.p_deal_id);
        if (!d) return pgRaise('DEAL_NOT_FOUND');
        if (d.status !== 'completed') return pgRaise('DEAL_NOT_COMPLETED');
        const score = Number(args.p_score);
        if (!(score >= 1 && score <= 5)) return pgRaise('INVALID_SCORE');
        const ratee = auth.uid === d.buyer_id ? d.seller_id : auth.uid === d.seller_id ? d.buyer_id : null;
        if (!ratee) return pgRaise('NOT_PARTY');
        if (db.mt_ratings.some((r) => r.deal_id === d.id && r.rater_id === auth.uid)) return pgRaise('ALREADY_RATED');
        const rating = { id: uuid(), deal_id: d.id, rater_id: auth.uid, ratee_id: ratee, score, comment: args.p_comment ? String(args.p_comment).slice(0, 300) : null, created_at: nowIso() };
        db.mt_ratings.push(rating);
        const pub = db.mt_public_profiles.find((p) => p.id === ratee);
        if (pub) {
          const mine = db.mt_ratings.filter((r) => r.ratee_id === ratee);
          pub.rating_count = mine.length;
          pub.rating_avg = Math.round((mine.reduce((a, r) => a + r.score, 0) / mine.length) * 100) / 100;
        }
        notify(ratee, 'rating', 'Þú fékkst einkunn', `${score} af 5 stjörnum`, `/midatorg/notendur/${ratee}`, rating.id);
        return json(200, rating);
      }
      case 'mt_admin_set_ban': {
        if (!auth.isAdmin) return pgRaise('NOT_ADMIN');
        const p = db.mt_profiles.find((x) => x.id === args.p_user);
        if (!p) return pgRaise('USER_NOT_FOUND');
        p.banned_at = args.p_banned ? nowIso() : null;
        p.ban_reason = args.p_banned ? (args.p_reason ?? null) : null;
        const pub = db.mt_public_profiles.find((x) => x.id === p.id);
        if (pub) pub.is_banned = !!args.p_banned;
        return { status: 204, headers: {}, body: '' };
      }
      case 'mt_admin_set_verification': {
        if (!auth.isAdmin) return pgRaise('NOT_ADMIN');
        const p = db.mt_profiles.find((x) => x.id === args.p_user);
        if (!p) return pgRaise('USER_NOT_FOUND');
        p.verification = args.p_level;
        const pub = db.mt_public_profiles.find((x) => x.id === p.id);
        if (pub) pub.verification = args.p_level;
        return { status: 204, headers: {}, body: '' };
      }
      default:
        state.unhandled.push(`${ctx.method} ${ctx.url.pathname}`);
        log('UNHANDLED rpc', fn, JSON.stringify(args));
        return json(404, { code: 'PGRST202', message: `Could not find the function public.${fn} in the schema cache`, details: null, hint: null });
    }
  }

  // ---- /auth/v1/* ---------------------------------------------------------------
  function authError(status, code, msg) {
    return json(status, { code: status, error_code: code, msg });
  }

  function handleAuth(ctx, sub) {
    const grant = ctx.url.searchParams.get('grant_type');
    if (sub === 'token' && ctx.method === 'POST') {
      if (grant === 'password') {
        const email = String(ctx.body?.email ?? '').toLowerCase();
        const uid = accounts.get(email);
        if (!uid) return authError(400, 'invalid_credentials', 'Invalid login credentials');
        return json(200, makeSession(uid, email));
      }
      if (grant === 'refresh_token') {
        const m = /^mock-refresh-([0-9a-f-]{36})-(.+)$/.exec(String(ctx.body?.refresh_token ?? ''));
        if (!m) return authError(400, 'refresh_token_not_found', 'Invalid Refresh Token');
        return json(200, makeSession(m[1], m[2]));
      }
      return null;
    }
    if (sub === 'user' && ctx.method === 'GET') {
      if (!ctx.auth.uid) return authError(401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature');
      return json(200, authUser(ctx.auth.uid, ctx.auth.email ?? ''));
    }
    if (sub === 'user' && ctx.method === 'PUT') {
      if (!ctx.auth.uid) return authError(401, 'bad_jwt', 'invalid JWT');
      warn('PUT /auth/v1/user (updateUser) is acknowledged but not applied');
      return json(200, authUser(ctx.auth.uid, ctx.auth.email ?? ''));
    }
    if (sub === 'logout' && ctx.method === 'POST') return { status: 204, headers: {}, body: '' };
    if (sub === 'settings' && ctx.method === 'GET') {
      return json(200, { external: { email: true, phone: false }, disable_signup: false, mailer_autoconfirm: false, phone_autoconfirm: false, sms_provider: '' });
    }
    return null;
  }

  // ---- /storage/v1/* ------------------------------------------------------------
  function handleStorage(ctx, rest) {
    // rest e.g. "object/sign/mt-ticket-proofs/<uid>/<listing>.pdf"
    const m = /^object\/(sign|public|upload\/sign|list|info)?\/?(.*)$/.exec(rest);
    if (!m) return null;
    const kind = m[1] ?? 'object';
    const objectPath = m[2];
    if (kind === 'sign' && ctx.method === 'POST') {
      const token = b64url(JSON.stringify({ url: objectPath, exp: FAR_FUTURE_EXP }));
      return json(200, { signedURL: `/object/sign/${objectPath}?token=${token}` });
    }
    if ((kind === 'sign' || kind === 'public') && ctx.method === 'GET') {
      const isImage = /\.(png|jpe?g|webp|gif)$/i.test(objectPath);
      const body = isImage ? tinyPng() : tinyPdf();
      return { status: 200, headers: { 'content-type': isImage ? 'image/png' : 'application/pdf', 'content-disposition': 'inline' }, body };
    }
    if (kind === 'object' && (ctx.method === 'POST' || ctx.method === 'PUT')) {
      return json(200, { Key: objectPath, Id: uuid() });
    }
    if (kind === 'object' && ctx.method === 'DELETE') return json(200, []);
    return null;
  }

  // ---- dispatcher -----------------------------------------------------------------
  async function dispatch(route, request) {
    const url = new URL(request.url());
    const method = request.method();
    const headers = request.headers();
    const cors = corsHeaders(headers);

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors, body: '' });
      return;
    }

    let body = null;
    const postData = request.postData();
    if (postData) {
      try {
        body = JSON.parse(postData);
      } catch {
        body = null;
      }
    }
    const ctx = { url, method, headers, body, auth: authFromHeaders(headers) };
    let res = null;
    try {
      if (url.pathname.startsWith('/rest/v1/rpc/')) res = handleRpc(ctx, decodeURIComponent(url.pathname.slice('/rest/v1/rpc/'.length)));
      else if (url.pathname.startsWith('/rest/v1/')) res = handleRest(ctx, decodeURIComponent(url.pathname.slice('/rest/v1/'.length)));
      else if (url.pathname.startsWith('/auth/v1/')) res = handleAuth(ctx, url.pathname.slice('/auth/v1/'.length));
      else if (url.pathname.startsWith('/storage/v1/')) res = handleStorage(ctx, url.pathname.slice('/storage/v1/'.length));
      else if (url.pathname.startsWith('/functions/v1/')) {
        state.unhandled.push(`${method} ${url.pathname}`);
        log('UNHANDLED edge function', url.pathname);
        res = json(500, { error: 'edge functions are not emulated by mockSupabase.mjs' });
      }
    } catch (err) {
      log('ERROR while handling', method, url.pathname + url.search, err);
      res = json(500, { code: 'MOCK', message: String(err?.message ?? err), details: null, hint: null });
    }
    if (!res) {
      state.unhandled.push(`${method} ${url.pathname}${url.search}`);
      log('UNHANDLED', method, url.pathname + url.search, postData ? postData.slice(0, 200) : '');
      res = json(404, { code: 'MOCK404', message: `mockSupabase.mjs does not emulate ${method} ${url.pathname}`, details: null, hint: null });
    }
    state.requests.push({ method, path: url.pathname + url.search, status: res.status, uid: ctx.auth.uid });
    if (verbose) log(method, url.pathname + url.search, '→', res.status);
    await route.fulfill({ status: res.status, headers: { ...cors, ...res.headers }, body: res.body });
  }

  // ---- routes -----------------------------------------------------------------------
  const isLocal = (u) => localOrigins.some((o) => u.startsWith(o));
  if (blockExternal) {
    await page.route(
      (u) => !u.href.startsWith(origin + '/') && !isLocal(u.href) && !u.href.startsWith('data:') && !u.href.startsWith('blob:'),
      async (route, request) => {
        const u = request.url();
        const host = (() => {
          try {
            return new URL(u).host;
          } catch {
            return u;
          }
        })();
        if (u.includes('fonts.googleapis.com')) {
          if (!state.externalStubbed.includes(host)) state.externalStubbed.push(host);
          await route.fulfill({ status: 200, headers: { 'content-type': 'text/css', 'access-control-allow-origin': '*' }, body: '/* fonts stubbed by mockSupabase.mjs */' });
          return;
        }
        // external images (tix.is event posters, avatars, …) → solid placeholder so the page has no broken images or console errors
        if (request.resourceType() === 'image' || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u)) {
          if (!state.externalStubbed.includes(host)) state.externalStubbed.push(host);
          await route.fulfill({ status: 200, headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }, body: PLACEHOLDER_PNG });
          return;
        }
        if (!state.externalBlocked.includes(u)) state.externalBlocked.push(u);
        await route.abort('blockedbyclient');
      },
    );
  }
  await page.route((u) => u.href.startsWith(origin + '/'), dispatch);

  // realtime: a fake Phoenix server so channels reach "SUBSCRIBED" without a network
  const wsPattern = (u) => u.href.startsWith(`wss://${projectRef}.supabase.co/realtime/`);
  await page.routeWebSocket(wsPattern, (ws) => {
    ws.onMessage((raw) => {
      let msg;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      } catch {
        return;
      }
      // v1 serializer: {topic,event,payload,ref,join_ref}; v2 serializer: [join_ref, ref, topic, event, payload]
      const arrayForm = Array.isArray(msg);
      const m = arrayForm ? { join_ref: msg[0], ref: msg[1], topic: msg[2], event: msg[3], payload: msg[4] } : msg;
      const reply = (payload) => {
        const out = arrayForm ? [m.join_ref, m.ref, m.topic, 'phx_reply', payload] : { topic: m.topic, event: 'phx_reply', payload, ref: m.ref };
        ws.send(JSON.stringify(out));
      };
      if (m.event === 'heartbeat') reply({ status: 'ok', response: {} });
      else if (m.event === 'phx_join') {
        const changes = (m.payload?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
        reply({ status: 'ok', response: { postgres_changes: changes } });
      } else if (m.ref != null) reply({ status: 'ok', response: {} });
    });
  });

  return state;
}
