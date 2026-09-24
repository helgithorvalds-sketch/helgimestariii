/**
 * Pure helpers for the market home: URL-state parsing, card state and
 * Icelandic/English number agreement. No React, no network.
 */
import { EVENT_CATEGORIES } from '../../lib/constants';
import { href } from '../../lib/paths';
import type { Locale } from '../../lib/i18n/locale';
import type { EventCategory, MarketEvent, MarketSort } from '../../lib/types';

export const MARKET_SORTS: readonly MarketSort[] = ['date', 'demand', 'price'];
export const DEFAULT_SORT: MarketSort = 'date';
/** Spec §5: "Sýna fleiri" pages of 24. */
export const HOME_PAGE_SIZE = 24;

/** Query-string names (spec §5): `q`, `flokkur`, `rada`. */
export const PARAM_Q = 'q';
export const PARAM_CATEGORY = 'flokkur';
export const PARAM_SORT = 'rada';

/** `/midatorg/vidburdir/<id>` — every card links here. */
export function eventHref(id: string): string {
  return href(`/vidburdir/${id}`);
}

export type HomeParams = {
  q: string;
  category: EventCategory | null;
  sort: MarketSort;
};

export function isEventCategory(v: unknown): v is EventCategory {
  return typeof v === 'string' && (EVENT_CATEGORIES as string[]).includes(v);
}

export function isMarketSort(v: unknown): v is MarketSort {
  return typeof v === 'string' && (MARKET_SORTS as string[]).includes(v);
}

/** Reads `?q=&flokkur=&rada=`; unknown values fall back to the defaults. */
export function parseHomeParams(params: URLSearchParams): HomeParams {
  const q = (params.get(PARAM_Q) ?? '').trim();
  const cat = params.get(PARAM_CATEGORY);
  const sort = params.get(PARAM_SORT);
  return {
    q,
    category: isEventCategory(cat) ? cat : null,
    sort: isMarketSort(sort) ? sort : DEFAULT_SORT,
  };
}

/** Serialises the state, leaving defaults out so the bare `/midatorg` URL stays clean. */
export function buildHomeParams(state: HomeParams): URLSearchParams {
  const out = new URLSearchParams();
  const q = state.q.trim();
  if (q) out.set(PARAM_Q, q);
  if (state.category) out.set(PARAM_CATEGORY, state.category);
  if (state.sort !== DEFAULT_SORT) out.set(PARAM_SORT, state.sort);
  return out;
}

/** Icelandic: numbers ending in 1 (except 11) take the singular; English: only 1. */
export function isSingular(n: number, locale: Locale): boolean {
  const abs = Math.abs(Math.trunc(n));
  if (locale === 'en') return abs === 1;
  return abs % 10 === 1 && abs % 100 !== 11;
}

/** Suffix for a `<key>One` / `<key>Many` pair of dictionary keys. */
export function pluralSuffix(n: number, locale: Locale): 'One' | 'Many' {
  return isSingular(n, locale) ? 'One' : 'Many';
}

export type CardState = 'listings' | 'waitlist' | 'past';

export function isPastEvent(event: Pick<MarketEvent, 'status' | 'starts_at'>, now: number = Date.now()): boolean {
  if (event.status === 'past' || event.status === 'cancelled') return true;
  const ts = event.starts_at ? Date.parse(event.starts_at) : NaN;
  return Number.isFinite(ts) && ts < now;
}

/** Which of the three card states an event is in. */
export function cardStateOf(
  event: Pick<MarketEvent, 'status' | 'starts_at' | 'min_ask' | 'tickets_available'>,
  now: number = Date.now(),
): CardState {
  if (isPastEvent(event, now)) return 'past';
  if (event.min_ask != null && (event.tickets_available ?? 0) > 0) return 'listings';
  return 'waitlist';
}

/** "fös. 14. nóv. · Harpa" — the formatted date, then the venue (or city). */
export function eventMeta(event: Pick<MarketEvent, 'venue_name' | 'city'>, dateText: string): string {
  const place = event.venue_name?.trim() || event.city?.trim() || '';
  return [dateText, place].filter(Boolean).join(' · ');
}
