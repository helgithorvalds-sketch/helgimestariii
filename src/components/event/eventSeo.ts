import { SITE_URL } from '../../lib/seo';
import { formatDateTime, formatISK } from '../../lib/format';
import type { EventCategory, MarketEvent } from '../../lib/types';

const SCHEMA_TYPE: Record<EventCategory, string> = {
  tonleikar: 'MusicEvent',
  leikhus: 'TheaterEvent',
  ithrottir: 'SportsEvent',
  hatidir: 'Festival',
  uppistand: 'ComedyEvent',
  annad: 'Event',
};

/** "12. okt. kl. 20:00 · Harpa, Reykjavík. 4 miðar til sölu frá 9.900 kr. …" (Icelandic; search results are Icelandic). */
export function eventSeoDescription(event: MarketEvent): string {
  const venue = [event.venue_name, event.city].filter(Boolean).join(', ');
  const when = formatDateTime(event.starts_at);
  const head = venue ? `${when} · ${venue}.` : `${when}.`;
  const available = event.tickets_available ?? 0;
  let market: string;
  if (event.status === 'cancelled') market = 'Viðburðinum hefur verið aflýst.';
  else if (available > 0 && event.min_ask != null) market = `${available} ${available % 10 === 1 && available % 100 !== 11 ? 'miði' : 'miðar'} til sölu frá ${formatISK(event.min_ask)}.`;
  else if (event.tix_availability === 'sold_out') market = 'Uppselt á tix.is – fáðu tilkynningu þegar miðar koma í sölu á Miðatorgi.';
  else market = 'Kauptu og seldu miða manna á milli, aldrei yfir upprunalegu verði.';
  return `${event.title} – ${head} ${market}`;
}

/** schema.org Event for Google's event results. Offers only when tickets are actually listed. */
export function eventJsonLd(event: MarketEvent): Record<string, unknown> {
  const url = `${SITE_URL}/vidburdir/${event.id}`;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[event.category] ?? 'Event',
    name: event.title,
    startDate: event.starts_at,
    eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    inLanguage: 'is',
  };
  if (event.image_url && /^https:\/\//i.test(event.image_url)) ld.image = [event.image_url];
  if (event.description) ld.description = event.description.slice(0, 500);
  if (event.venue_name || event.city) {
    ld.location = {
      '@type': 'Place',
      name: event.venue_name ?? event.city,
      address: { '@type': 'PostalAddress', addressLocality: event.city ?? undefined, addressCountry: 'IS' },
    };
  }
  const available = event.tickets_available ?? 0;
  if (available > 0 && event.min_ask != null) {
    ld.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'ISK',
      lowPrice: event.min_ask,
      offerCount: available,
      availability: 'https://schema.org/InStock',
      url,
    };
  }
  return ld;
}
