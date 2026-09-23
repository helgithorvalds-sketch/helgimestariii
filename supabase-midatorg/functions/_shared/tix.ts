// Miðatorg — tix.is parser + mapper.
//
// Pure module: no Deno / Node APIs, no network, no DOM. Everything here is
// string in → data out so it can be unit-tested with fixture HTML (see
// tix_test.ts) and run under both Deno and Node.
//
// The sandbox that wrote this could not reach tix.is, so the parser is
// deliberately defensive: it first looks for schema.org JSON-LD blocks
// (@type Event / MusicEvent / TheaterEvent / SportsEvent / …, also inside
// @graph), then falls back to Open Graph meta tags, the <title>, and a
// datetime pattern search. Every field is optional except id, title and
// starts_at, which mt_import_events(jsonb) requires.

export type TixCategory = 'tonleikar' | 'leikhus' | 'ithrottir' | 'hatidir' | 'uppistand' | 'annad';

export const TIX_BASE = 'https://tix.is';
export const TIX_HOSTS: ReadonlyArray<string> = ['tix.is', 'www.tix.is'];

/** Category pages walked by mt-import-tix, in the order they are visited. */
export const TIX_CATEGORY_PAGES: ReadonlyArray<{ slug: string; category: TixCategory }> = [
  { slug: 'music', category: 'tonleikar' },
  { slug: 'theater', category: 'leikhus' },
  { slug: 'sports', category: 'ithrottir' },
  { slug: 'festival', category: 'hatidir' },
  { slug: 'courses', category: 'annad' },
];

const CATEGORY_SLUGS: Record<string, TixCategory> = {
  music: 'tonleikar',
  concerts: 'tonleikar',
  theater: 'leikhus',
  theatre: 'leikhus',
  sports: 'ithrottir',
  sport: 'ithrottir',
  festival: 'hatidir',
  festivals: 'hatidir',
  courses: 'annad',
  comedy: 'uppistand',
};

/** schema.org @type → mt_event_category (only the confident ones). */
const TYPE_CATEGORIES: Record<string, TixCategory> = {
  MusicEvent: 'tonleikar',
  TheaterEvent: 'leikhus',
  DanceEvent: 'leikhus',
  SportsEvent: 'ithrottir',
  Festival: 'hatidir',
  ComedyEvent: 'uppistand',
  EducationEvent: 'annad',
  ScreeningEvent: 'annad',
};

export function categoryForSlug(slug: string): TixCategory | undefined {
  return CATEGORY_SLUGS[slug.toLowerCase()];
}

export function categoryPageUrl(slug: string, lang = 'is'): string {
  return `${TIX_BASE}/${lang}/category/${slug}`;
}

export function canonicalEventUrl(id: string, lang = 'is'): string {
  return `${TIX_BASE}/${lang}/event/${id}/`;
}

// ---------------------------------------------------------------------
// Parsed shapes
// ---------------------------------------------------------------------

export interface ParsedTixEvent {
  tix_event_id: string;
  title: string;
  description?: string;
  category?: TixCategory;
  venue_name?: string;
  city?: string;
  starts_at: string; // ISO 8601, UTC
  ends_at?: string;
  image_url?: string;
  tix_url: string;
  face_value_min?: number;
  face_value_max?: number;
  cancelled: boolean;
  /** Which strategy produced the core fields — handy in logs, never HTML. */
  parsed_from: 'jsonld' | 'meta';
}

export type ParseResult = { ok: true; event: ParsedTixEvent } | { ok: false; reason: string };

export interface ParseOptions {
  /** The URL the page was fetched from (used for the id and to resolve relative links). */
  url: string;
  /** Known tix event id (from the link that led here); otherwise taken from the URL. */
  id?: string;
  /** Category of the listing page the event was discovered on; wins over @type. */
  category?: TixCategory;
}

// ---------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  eth: 'ð', ETH: 'Ð', thorn: 'þ', THORN: 'Þ', aelig: 'æ', AElig: 'Æ',
  ouml: 'ö', Ouml: 'Ö', aacute: 'á', Aacute: 'Á', eacute: 'é', Eacute: 'É',
  iacute: 'í', Iacute: 'Í', oacute: 'ó', Oacute: 'Ó', uacute: 'ú', Uacute: 'Ú',
  yacute: 'ý', Yacute: 'Ý', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    // Exact name first; be lenient about case (&Thorn; → &THORN;, &Eth; → &ETH;).
    return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toUpperCase()] ?? NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ');
}

export function cleanText(input: unknown, max = 200): string | undefined {
  if (typeof input !== 'string') return undefined;
  const text = decodeEntities(stripTags(input)).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > max ? text.slice(0, max).trim() : text;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = firstString(v);
      if (s) return s;
    }
  }
  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function firstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const v of value) {
      const o = asObject(v);
      if (o) return o;
    }
    return undefined;
  }
  return asObject(value);
}

export function resolveUrl(candidate: string | undefined, base: string): string | undefined {
  if (!candidate) return undefined;
  const trimmed = decodeEntities(candidate.trim());
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------
// Event ids and link discovery
// ---------------------------------------------------------------------

const EVENT_ID_RE = /(?:\/is|\/en)?\/event\/(\d+)/g;
const BUYINGFLOW_ID_RE = /\/buyingflow\/tickets\/(\d+)/;

/** tix event id from any tix.is URL (`/is/event/1234/slug/`, `/event/1234`). */
export function eventIdFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = /(?:\/is|\/en)?\/event\/(\d+)/.exec(url) ?? BUYINGFLOW_ID_RE.exec(url);
  return m ? m[1] : undefined;
}

export function isTixHost(host: string): boolean {
  return TIX_HOSTS.includes(host.toLowerCase());
}

/**
 * Every `/event/<digits>/` link on a category (or any) page, de-duplicated and
 * in document order. Only looks at href attributes so ids in scripts or
 * tracking pixels do not count.
 */
export function extractEventIds(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const hrefRe = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
    EVENT_ID_RE.lastIndex = 0;
    let idMatch: RegExpExecArray | null;
    while ((idMatch = EVENT_ID_RE.exec(href)) !== null) {
      const id = idMatch[1];
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------

const LD_SCRIPT_RE = /<script\b[^>]*type\s*=\s*["']?\s*application\/ld\+json\s*["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;

function parseJsonLoose(raw: string): unknown {
  let text = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/\s*<!\[CDATA\[/, '')
    .replace(/\/\/\s*\]\]>\s*$/, '')
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Second chance: trailing commas and raw control characters are the
    // usual culprits in hand-written templates.
    text = text.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
}

/** All parseable JSON-LD blocks on the page, in document order. */
export function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  LD_SCRIPT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LD_SCRIPT_RE.exec(html)) !== null) {
    const parsed = parseJsonLoose(m[1]);
    if (parsed !== undefined) blocks.push(parsed);
  }
  return blocks;
}

function typeNames(node: Record<string, unknown>): string[] {
  const t = node['@type'];
  const list = Array.isArray(t) ? t : [t];
  return list
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.replace(/^.*[/#]/, '').trim())
    .filter(Boolean);
}

const EVENT_TYPE_RE = /(^|[A-Za-z])Event$|^Festival$/;

export function isEventNode(value: unknown): value is Record<string, unknown> {
  const node = asObject(value);
  if (!node) return false;
  return typeNames(node).some((t) => EVENT_TYPE_RE.test(t));
}

/** Depth-limited walk that collects every Event-like object. */
export function findEventNodes(data: unknown, maxDepth = 6): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (value: unknown, depth: number) => {
    if (depth > maxDepth || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v, depth + 1);
      return;
    }
    const node = value as Record<string, unknown>;
    if (isEventNode(node)) found.push(node);
    for (const key of Object.keys(node)) {
      // Do not descend into related objects that are Events themselves but
      // describe something else (a festival's programme, the venue's other
      // events) — they would compete with the page's own event.
      if (key === 'subEvent' || key === 'superEvent' || key === 'event' || key === 'events') continue;
      walk(node[key], depth + 1);
    }
  };
  walk(data, 0);
  return found;
}

export function categoryForTypes(types: string[]): TixCategory | undefined {
  for (const t of types) {
    const c = TYPE_CATEGORIES[t];
    if (c) return c;
  }
  return undefined;
}

// ---------------------------------------------------------------------
// Dates. Iceland is UTC all year, so a naive datetime is treated as UTC.
// ---------------------------------------------------------------------

const IS_MONTHS: Record<string, number> = {
  jan: 1, janúar: 1, januar: 1,
  feb: 2, febrúar: 2, februar: 2,
  mar: 3, mars: 3,
  apr: 4, apríl: 4, april: 4,
  maí: 5, mai: 5, may: 5,
  jún: 6, júní: 6, jun: 6, juni: 6, june: 6,
  júl: 7, júlí: 7, jul: 7, juli: 7, july: 7,
  ágú: 8, ágúst: 8, agu: 8, agust: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, október: 10, oktober: 10, oct: 10, october: 10,
  nóv: 11, nóvember: 11, nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

function buildIso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, offset?: string): string | undefined {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return undefined;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const zone = offset && offset !== 'Z' ? offset : 'Z';
  const iso = `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}${zone}`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

/**
 * Accepts ISO 8601 (with or without zone / seconds), `YYYY-MM-DD HH:MM`,
 * `DD.MM.YYYY HH:MM`, `D. mánuður YYYY kl. HH:MM` and plain dates. Returns a
 * UTC ISO string or undefined.
 */
export function parseDate(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const s = decodeEntities(input).replace(/\s+/g, ' ').trim();
  if (!s) return undefined;

  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(s);
  if (m) {
    const offset = m[7] ? (m[7].length === 5 ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : m[7].toUpperCase()) : undefined;
    return buildIso(+m[1], +m[2], +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0, offset);
  }
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T]+(?:kl\.?\s*)?(\d{1,2})[:.](\d{2}))?$/i.exec(s);
  if (m) return buildIso(+m[3], +m[2], +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  m = /^(?:[a-záðéíóúýþæö]+\.?,?\s+)?(\d{1,2})\.?\s+([a-záðéíóúýþæö]+)\.?\s+(\d{4})(?:,?\s+(?:kl\.?\s*)?(\d{1,2})[:.](\d{2}))?$/i.exec(s);
  if (m) {
    const month = IS_MONTHS[m[2].toLowerCase()];
    if (month) return buildIso(+m[3], month, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }
  return undefined;
}

/** Best-effort datetime found anywhere in the markup (fallback only). */
export function findDateInHtml(html: string): string | undefined {
  const attr = /\b(?:datetime|data-(?:start|date|starts?-?at|event-date))\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attr.exec(html)) !== null) {
    const iso = parseDate(m[1]);
    if (iso) return iso;
  }
  const isoRe = /\b(\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?)\b/g;
  while ((m = isoRe.exec(html)) !== null) {
    const iso = parseDate(m[1]);
    if (iso) return iso;
  }
  const text = cleanText(html, 200_000) ?? '';
  const dotted = /\b(\d{1,2}\.\d{1,2}\.\d{4}(?:\s+(?:kl\.?\s*)?\d{1,2}[:.]\d{2})?)/g;
  while ((m = dotted.exec(text)) !== null) {
    const iso = parseDate(m[1]);
    if (iso) return iso;
  }
  const worded = /\b(\d{1,2}\.?\s+[a-záðéíóúýþæö]{3,10}\.?\s+\d{4}(?:,?\s+(?:kl\.?\s*)?\d{1,2}[:.]\d{2})?)/gi;
  while ((m = worded.exec(text)) !== null) {
    const iso = parseDate(m[1]);
    if (iso) return iso;
  }
  return undefined;
}

// ---------------------------------------------------------------------
// Prices (ISK, whole krónur). "4.900 kr." and "4900.00" both mean 4900.
// ---------------------------------------------------------------------

export function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
  if (typeof value !== 'string') return undefined;
  const s = decodeEntities(value).replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return undefined;
  let normalized: string;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    normalized = s.split(thousandsSep).join('').replace(decimalSep, '.');
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',';
    const parts = s.split(sep);
    const tail = parts[parts.length - 1];
    // "4.900" / "1.234.567" → thousands; "49.90" → decimal.
    const isThousands = parts.length > 2 || (tail.length === 3 && parts[0].length <= 3);
    normalized = isThousands ? parts.join('') : `${parts.slice(0, -1).join('')}.${tail}`;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function collectPrices(offers: unknown, out: number[], depth = 0): void {
  if (depth > 3 || offers === null || offers === undefined) return;
  if (Array.isArray(offers)) {
    for (const o of offers) collectPrices(o, out, depth + 1);
    return;
  }
  const o = asObject(offers);
  if (!o) {
    const p = parsePrice(offers);
    if (p !== undefined) out.push(p);
    return;
  }
  for (const key of ['price', 'lowPrice', 'highPrice', 'minPrice', 'maxPrice']) {
    const p = parsePrice(o[key]);
    if (p !== undefined) out.push(p);
  }
  if (o.priceSpecification !== undefined) collectPrices(o.priceSpecification, out, depth + 1);
  if (o.offers !== undefined) collectPrices(o.offers, out, depth + 1);
}

export function priceRange(offers: unknown): { min?: number; max?: number } {
  const prices: number[] = [];
  collectPrices(offers, prices);
  if (prices.length === 0) return {};
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// ---------------------------------------------------------------------
// Meta tags
// ---------------------------------------------------------------------

/** `<meta property="og:title" content="…">` (attributes in any order, either quote). */
export function metaContent(html: string, name: string): string | undefined {
  const tagRe = /<meta\b[^>]*>/gi;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRe = new RegExp(`\\b(?:property|name|itemprop)\\s*=\\s*["']?${escaped}["']?(?=[\\s/>])`, 'i');
  const contentRe = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    if (!keyRe.test(tag)) continue;
    const c = contentRe.exec(tag);
    if (!c) continue;
    const value = decodeEntities(c[1] ?? c[2] ?? c[3] ?? '').trim();
    if (value) return value;
  }
  return undefined;
}

const TITLE_SUFFIX_RE = /\s*[|\-–—:]\s*(?:tix(?:\.is)?|miðasala|midasala)\s*$/i;

export function pageTitle(html: string): string | undefined {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  if (!m) return undefined;
  const raw = cleanText(m[1], 300);
  if (!raw) return undefined;
  let title = raw;
  for (let i = 0; i < 2; i++) title = title.replace(TITLE_SUFFIX_RE, '');
  return title.trim() || undefined;
}

// ---------------------------------------------------------------------
// The event page parser
// ---------------------------------------------------------------------

interface LocationInfo {
  venue_name?: string;
  city?: string;
}

function readLocation(value: unknown): LocationInfo {
  const loc = firstObject(value) ?? (typeof value === 'string' ? undefined : undefined);
  if (!loc) {
    const s = firstString(value);
    return s ? { venue_name: cleanText(s, 120) } : {};
  }
  const info: LocationInfo = {};
  info.venue_name = cleanText(firstString(loc.name), 120);
  const address = loc.address;
  const addr = firstObject(address);
  if (addr) {
    info.city = cleanText(firstString(addr.addressLocality) ?? firstString(addr.addressRegion), 80);
    if (!info.venue_name) info.venue_name = cleanText(firstString(addr.name) ?? firstString(addr.streetAddress), 120);
  } else if (typeof address === 'string' && !info.venue_name) {
    info.venue_name = cleanText(address, 120);
  }
  if (!info.venue_name && loc['@type'] !== 'VirtualLocation') {
    const nested = asObject(loc.location);
    if (nested) return readLocation(nested);
  }
  return info;
}

function readImage(value: unknown, base: string): string | undefined {
  if (typeof value === 'string') return resolveUrl(value, base);
  if (Array.isArray(value)) {
    for (const v of value) {
      const url = readImage(v, base);
      if (url) return url;
    }
    return undefined;
  }
  const o = asObject(value);
  if (!o) return undefined;
  return resolveUrl(firstString(o.url) ?? firstString(o.contentUrl) ?? firstString(o['@id']), base);
}

function isCancelled(status: unknown): boolean {
  const list = Array.isArray(status) ? status : [status];
  return list.some((s) => typeof s === 'string' && /EventCancelled/i.test(s));
}

function pickEventNode(nodes: Record<string, unknown>[], id: string | undefined): Record<string, unknown> | undefined {
  if (nodes.length === 0) return undefined;
  if (id) {
    const byUrl = nodes.find((n) => eventIdFromUrl(firstString(n.url) ?? firstString(n['@id'])) === id);
    if (byUrl) return byUrl;
  }
  return nodes[0];
}

/**
 * Parse one tix.is event page. Never throws on bad input; returns
 * `{ ok: false, reason }` when the page does not yield an id, a title and a
 * start date. `reason` is a short code, never page content.
 */
export function parseEventPage(html: string, opts: ParseOptions): ParseResult {
  if (typeof html !== 'string' || html.length === 0) return { ok: false, reason: 'EMPTY_PAGE' };
  const base = opts.url;

  const ogUrl = metaContent(html, 'og:url');
  const canonical = (() => {
    const m = /<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i.exec(html);
    if (!m) return undefined;
    const h = /\bhref\s*=\s*["']([^"']+)["']/i.exec(m[0]);
    return h ? decodeEntities(h[1]) : undefined;
  })();

  const nodes = findEventNodes(extractJsonLd(html));
  const guessId = opts.id ?? eventIdFromUrl(opts.url) ?? eventIdFromUrl(ogUrl) ?? eventIdFromUrl(canonical);
  const node = pickEventNode(nodes, guessId);
  const ldUrl = node ? resolveUrl(firstString(node.url) ?? firstString(node['@id']), base) : undefined;
  const id = guessId ?? eventIdFromUrl(ldUrl);
  if (!id) return { ok: false, reason: 'NO_EVENT_ID' };

  const title =
    (node ? cleanText(firstString(node.name) ?? firstString(node.headline), 200) : undefined) ??
    cleanText(metaContent(html, 'og:title'), 200) ??
    pageTitle(html);
  if (!title || title.length < 2) return { ok: false, reason: 'NO_TITLE' };

  const starts_at =
    (node ? parseDate(firstString(node.startDate)) : undefined) ??
    parseDate(metaContent(html, 'event:start_time')) ??
    parseDate(metaContent(html, 'og:start_time')) ??
    findDateInHtml(html);
  if (!starts_at) return { ok: false, reason: 'NO_START_DATE' };

  const ends_at = node ? parseDate(firstString(node.endDate)) : undefined;
  const location = node ? readLocation(node.location) : {};
  const image_url = (node ? readImage(node.image, base) : undefined) ?? resolveUrl(metaContent(html, 'og:image'), base);
  const description =
    (node ? cleanText(firstString(node.description), 2000) : undefined) ??
    cleanText(metaContent(html, 'og:description'), 2000) ??
    cleanText(metaContent(html, 'description'), 2000);
  const prices = node ? priceRange(node.offers) : {};
  const types = node ? typeNames(node) : [];
  const category = opts.category ?? categoryForTypes(types);

  // Prefer a real tix URL that carries the id over the guessed canonical one.
  const urlCandidates = [ldUrl, resolveUrl(ogUrl, base), resolveUrl(canonical, base), resolveUrl(opts.url, base)];
  let tix_url = canonicalEventUrl(id);
  for (const candidate of urlCandidates) {
    if (!candidate) continue;
    try {
      const u = new URL(candidate);
      if (isTixHost(u.hostname) && eventIdFromUrl(u.pathname) === id) {
        u.search = '';
        u.hash = '';
        tix_url = u.toString();
        break;
      }
    } catch {
      // ignore unparsable candidates
    }
  }

  const event: ParsedTixEvent = {
    tix_event_id: id,
    title,
    starts_at,
    tix_url,
    cancelled: node ? isCancelled(node.eventStatus) : false,
    parsed_from: node ? 'jsonld' : 'meta',
  };
  if (description) event.description = description;
  if (category) event.category = category;
  if (location.venue_name) event.venue_name = location.venue_name;
  if (location.city) event.city = location.city;
  if (ends_at) event.ends_at = ends_at;
  if (image_url) event.image_url = image_url;
  if (prices.min !== undefined) event.face_value_min = prices.min;
  if (prices.max !== undefined) event.face_value_max = prices.max;
  return { ok: true, event };
}

// ---------------------------------------------------------------------
// Mapper: ParsedTixEvent → one element of mt_import_events(p_events jsonb)
// ---------------------------------------------------------------------

export interface ImportRow {
  tix_event_id: string;
  title: string;
  starts_at: string;
  tix_url: string;
  cancelled: boolean;
  description?: string;
  category?: TixCategory;
  venue_name?: string;
  city?: string;
  image_url?: string;
  face_value_min?: number;
  face_value_max?: number;
}

/** Only the keys the RPC reads; undefined keys are dropped so the RPC keeps existing values. */
export function toImportRow(e: ParsedTixEvent): ImportRow {
  const row: ImportRow = {
    tix_event_id: e.tix_event_id,
    title: e.title,
    starts_at: e.starts_at,
    tix_url: e.tix_url,
    cancelled: e.cancelled,
  };
  if (e.description) row.description = e.description;
  if (e.category) row.category = e.category;
  if (e.venue_name) row.venue_name = e.venue_name;
  if (e.city) row.city = e.city;
  if (e.image_url) row.image_url = e.image_url;
  if (e.face_value_min !== undefined) row.face_value_min = e.face_value_min;
  if (e.face_value_max !== undefined) row.face_value_max = e.face_value_max;
  return row;
}
