// Unit tests for the tix.is parser. Run with `deno test` from
// supabase-midatorg/functions, or `node _shared/run_tests_node.mjs`.
// Assertions are inlined so the file has no dependency beyond tix.ts and
// therefore runs unchanged under both runtimes.

import {
  canonicalEventUrl,
  categoryForSlug,
  decodeEntities,
  eventIdFromUrl,
  extractEventIds,
  extractJsonLd,
  findDateInHtml,
  metaContent,
  pageTitle,
  parseDate,
  parseEventPage,
  parsePrice,
  priceRange,
  toImportRow,
} from './tix.ts';

function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg ?? 'assertEquals'}\n  actual:   ${a}\n  expected: ${b}`);
}
function assert(cond: unknown, msg = 'assertion failed'): asserts cond {
  if (!cond) throw new Error(msg);
}

// ------------------------------------------------------------------ fixtures

/** Fixture 1: a full JSON-LD MusicEvent inside an @graph, with the usual noise. */
const JSONLD_PAGE = `<!DOCTYPE html>
<html lang="is"><head>
<meta charset="utf-8">
<title>Laufey &amp; Sinfó | Tix</title>
<meta property="og:title" content="Laufey &amp; Sinfó — og-title (should lose to JSON-LD)">
<meta property="og:image" content="https://cdn.tix.is/og/laufey.jpg">
<meta property="og:url" content="https://tix.is/is/event/18234/laufey-og-sinfo/">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "name": "Tix", "url": "https://tix.is/" },
    {
      "@type": ["MusicEvent"],
      "name": "Laufey &amp; Sinfó",
      "description": "<p>Laufey kemur fram með Sinfóníu Íslands.</p>",
      "startDate": "2026-11-05T20:00:00",
      "endDate": "2026-11-05T22:30:00+00:00",
      "eventStatus": "https://schema.org/EventScheduled",
      "image": [{ "@type": "ImageObject", "url": "/media/laufey-1200.jpg" }, "https://cdn.tix.is/laufey-600.jpg"],
      "location": {
        "@type": "Place",
        "name": "Harpa, Eldborg",
        "address": { "@type": "PostalAddress", "streetAddress": "Austurbakki 2", "addressLocality": "Reykjavík", "postalCode": "101" }
      },
      "offers": [
        { "@type": "Offer", "price": "9.900", "priceCurrency": "ISK", "availability": "https://schema.org/InStock" },
        { "@type": "AggregateOffer", "lowPrice": 6900, "highPrice": "14.900,00", "priceCurrency": "ISK" }
      ],
      "url": "https://tix.is/is/event/18234/laufey-og-sinfo/?utm_source=share"
    }
  ]
}
</script>
</head><body>
<a href="/is/event/999/other-event/">Annar viðburður</a>
<time datetime="2027-01-01T00:00:00">wrong date, JSON-LD wins</time>
</body></html>`;

/** Fixture 2: no JSON-LD at all — only Open Graph tags, <title> and a <time>. */
const OG_ONLY_PAGE = `<html><head>
<meta name="viewport" content="width=device-width">
<title>  Þjóðleikhúsið: Ríkharður III  | Tix </title>
<meta content="Ríkharður III – Þjóðleikhúsið" property="og:title" />
<meta property='og:image' content='https://cdn.tix.is/img/rikhardur.jpg?w=1200'>
<meta property="og:url" content="https://tix.is/is/event/20517/rikhardur-iii/">
<meta property="og:description" content="Sýning í Kassanum. Miðaverð 5.900 kr.">
</head><body>
<h1>Ríkharður III</h1>
<p>Sýning hefst <time datetime="2026-10-03T19:30">3. október 2026 kl. 19:30</time></p>
</body></html>`;

/** Fixture 3: a category page with links in every shape we expect. */
const CATEGORY_PAGE = `<html><body>
<nav><a href="/is/category/music">Tónlist</a> <a href="/en/category/music">Music</a></nav>
<ul class="events">
  <li><a href="/is/event/18234/laufey-og-sinfo/">Laufey</a></li>
  <li><a href='https://tix.is/is/event/18240/gdrn/'>GDRN</a></li>
  <li><a href="/en/event/18234/laufey-and-sinfo/">Laufey (en, duplicate)</a></li>
  <li><a href=/event/18251/ class="card">Bubbi</a></li>
  <li><a href="/is/event/18260/?ref=list#tickets">Með &amp; án</a></li>
  <li><a href="/is/venue/12/harpa/">Harpa (not an event)</a></li>
  <li><a href="/is/event/abc/">broken id</a></li>
</ul>
<script>var ids = ["/is/event/777/"]; // ignored: not an href</script>
</body></html>`;

// ------------------------------------------------------------------ tests

Deno.test('JSON-LD MusicEvent page → full event', () => {
  const r = parseEventPage(JSONLD_PAGE, { url: 'https://tix.is/is/event/18234/laufey-og-sinfo/' });
  assert(r.ok, 'expected ok');
  const e = r.event;
  assertEquals(e.tix_event_id, '18234');
  assertEquals(e.title, 'Laufey & Sinfó');
  assertEquals(e.parsed_from, 'jsonld');
  assertEquals(e.starts_at, '2026-11-05T20:00:00.000Z', 'naive datetime is UTC');
  assertEquals(e.ends_at, '2026-11-05T22:30:00.000Z');
  assertEquals(e.venue_name, 'Harpa, Eldborg');
  assertEquals(e.city, 'Reykjavík');
  assertEquals(e.image_url, 'https://tix.is/media/laufey-1200.jpg', 'relative image resolved against page');
  assertEquals(e.face_value_min, 6900);
  assertEquals(e.face_value_max, 14900);
  assertEquals(e.category, 'tonleikar', 'from @type when no category page given');
  assertEquals(e.cancelled, false);
  assertEquals(e.description, 'Laufey kemur fram með Sinfóníu Íslands.');
  assertEquals(e.tix_url, 'https://tix.is/is/event/18234/laufey-og-sinfo/', 'query string dropped');
});

Deno.test('category page wins over @type; cancelled status is read', () => {
  const cancelled = JSONLD_PAGE.replace('https://schema.org/EventScheduled', 'https://schema.org/EventCancelled');
  const r = parseEventPage(cancelled, { url: 'https://tix.is/is/event/18234/', category: 'hatidir' });
  assert(r.ok);
  assertEquals(r.event.category, 'hatidir');
  assertEquals(r.event.cancelled, true);
});

Deno.test('og-only page → event from meta tags, title and <time>', () => {
  const r = parseEventPage(OG_ONLY_PAGE, { url: 'https://tix.is/is/event/20517/rikhardur-iii/', category: 'leikhus' });
  assert(r.ok, `expected ok, got ${JSON.stringify(r)}`);
  const e = r.event;
  assertEquals(e.parsed_from, 'meta');
  assertEquals(e.tix_event_id, '20517');
  assertEquals(e.title, 'Ríkharður III – Þjóðleikhúsið', 'og:title beats <title>');
  assertEquals(e.starts_at, '2026-10-03T19:30:00.000Z');
  assertEquals(e.image_url, 'https://cdn.tix.is/img/rikhardur.jpg?w=1200');
  assertEquals(e.category, 'leikhus');
  assertEquals(e.description, 'Sýning í Kassanum. Miðaverð 5.900 kr.');
  assertEquals(e.face_value_min, undefined, 'no offers → no face value');
  assertEquals(e.venue_name, undefined);
  assertEquals(e.cancelled, false);
});

Deno.test('og-only page without og:title falls back to <title> minus " | Tix"', () => {
  const html = OG_ONLY_PAGE.replace(/<meta content="[^"]*" property="og:title" \/>/, '');
  const r = parseEventPage(html, { url: 'https://tix.is/is/event/20517/' });
  assert(r.ok);
  assertEquals(r.event.title, 'Þjóðleikhúsið: Ríkharður III');
});

Deno.test('page with no date at all is rejected with a short reason', () => {
  const html = '<html><head><title>Something | Tix</title></head><body>No dates here.</body></html>';
  assertEquals(parseEventPage(html, { url: 'https://tix.is/is/event/1/' }), { ok: false, reason: 'NO_START_DATE' });
  assertEquals(parseEventPage(html, { url: 'https://tix.is/is/' }), { ok: false, reason: 'NO_EVENT_ID' });
  assertEquals(parseEventPage('', { url: 'https://tix.is/is/event/1/' }), { ok: false, reason: 'EMPTY_PAGE' });
});

Deno.test('category page → de-duplicated event ids in document order', () => {
  assertEquals(extractEventIds(CATEGORY_PAGE), ['18234', '18240', '18251', '18260']);
  assertEquals(extractEventIds('<p>nothing</p>'), []);
});

Deno.test('event id from URLs', () => {
  assertEquals(eventIdFromUrl('https://tix.is/is/event/18234/laufey/'), '18234');
  assertEquals(eventIdFromUrl('https://www.tix.is/en/event/5/'), '5');
  assertEquals(eventIdFromUrl('/event/77'), '77');
  assertEquals(eventIdFromUrl('https://tix.is/is/buyingflow/tickets/4242/'), '4242');
  assertEquals(eventIdFromUrl('https://tix.is/is/category/music'), undefined);
  assertEquals(canonicalEventUrl('9'), 'https://tix.is/is/event/9/');
});

Deno.test('category slugs map to mt_event_category', () => {
  assertEquals(categoryForSlug('music'), 'tonleikar');
  assertEquals(categoryForSlug('theater'), 'leikhus');
  assertEquals(categoryForSlug('sports'), 'ithrottir');
  assertEquals(categoryForSlug('festival'), 'hatidir');
  assertEquals(categoryForSlug('courses'), 'annad');
  assertEquals(categoryForSlug('nope'), undefined);
});

Deno.test('prices: Icelandic thousands, decimals, currency noise', () => {
  assertEquals(parsePrice('4.900'), 4900);
  assertEquals(parsePrice('4.900 kr.'), 4900);
  assertEquals(parsePrice('ISK 4900'), 4900);
  assertEquals(parsePrice('4900.00'), 4900);
  assertEquals(parsePrice('14.900,00'), 14900);
  assertEquals(parsePrice('1.234.567'), 1234567);
  assertEquals(parsePrice(2500.4), 2500);
  assertEquals(parsePrice('0'), 0);
  assertEquals(parsePrice('free'), undefined);
  assertEquals(parsePrice(-1), undefined);
  assertEquals(priceRange({ price: '3.500' }), { min: 3500, max: 3500 });
  assertEquals(priceRange([{ price: 5 }, { lowPrice: 2, highPrice: 9 }]), { min: 2, max: 9 });
  assertEquals(priceRange(undefined), {});
});

Deno.test('dates: ISO, naive, dotted and Icelandic wording', () => {
  assertEquals(parseDate('2026-10-03T19:30:00Z'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('2026-10-03T19:30:00+02:00'), '2026-10-03T17:30:00.000Z');
  assertEquals(parseDate('2026-10-03T19:30'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('2026-10-03 19:30'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('2026-10-03'), '2026-10-03T00:00:00.000Z');
  assertEquals(parseDate('3.10.2026 kl. 19:30'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('3. október 2026 kl. 19:30'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('fös. 3. okt. 2026, 19:30'), '2026-10-03T19:30:00.000Z');
  assertEquals(parseDate('2026-13-40'), undefined);
  assertEquals(parseDate('tomorrow'), undefined);
  assertEquals(findDateInHtml('<p>Hefst 12.12.2026 kl. 20.00</p>'), '2026-12-12T20:00:00.000Z');
});

Deno.test('meta / title / entity helpers', () => {
  assertEquals(metaContent(OG_ONLY_PAGE, 'og:title'), 'Ríkharður III – Þjóðleikhúsið');
  assertEquals(metaContent(OG_ONLY_PAGE, 'og:missing'), undefined);
  assertEquals(pageTitle('<title>Bubbi - Tix</title>'), 'Bubbi');
  assertEquals(pageTitle('<title>Bubbi | tix.is</title>'), 'Bubbi');
  assertEquals(decodeEntities('&THORN;&oacute;r &amp; &#x00F0; &#233; &unknown;'), 'Þór & ð é &unknown;');
  assertEquals(decodeEntities('&Eth;&Thorn;'), 'ÐÞ', 'lenient about entity case');
});

Deno.test('JSON-LD extraction survives comments, CDATA, trailing commas and junk blocks', () => {
  const html = `
    <script type="application/ld+json">// <![CDATA[
      { "@type": "Event", "name": "Alpha", "startDate": "2026-01-01", }
    // ]]></script>
    <script type='application/ld+json'>not json at all</script>
    <script type="application/ld+json"><!-- --> [{"@type":"SportsEvent","name":"Beta","startDate":"2026-02-02"}]</script>`;
  const blocks = extractJsonLd(html);
  assertEquals(blocks.length, 2);
  const r = parseEventPage(html, { url: 'https://tix.is/is/event/3/' });
  assert(r.ok);
  assertEquals(r.event.title, 'Alpha', 'first block wins');
  assertEquals(parseEventPage('<script type="application/ld+json">{"@type":"Event","name":"A","startDate":"2026-01-01"}</script>', { url: 'https://tix.is/is/event/3/' }), { ok: false, reason: 'NO_TITLE' }, 'titles shorter than 2 chars are rejected');
});

Deno.test('toImportRow drops unknown keys and undefined values', () => {
  const r = parseEventPage(OG_ONLY_PAGE, { url: 'https://tix.is/is/event/20517/' });
  assert(r.ok);
  const row = toImportRow(r.event);
  assertEquals(Object.keys(row).sort(), ['cancelled', 'description', 'image_url', 'starts_at', 'title', 'tix_event_id', 'tix_url']);
  assert(!('parsed_from' in row));
  assert(!('category' in row), 'no category → key absent so the RPC keeps the existing one');
});
