/**
 * Pure helpers for the market home: URL-state parsing, card state, trending
 * ranking and Icelandic/English number agreement. No React, no network.
 */
import { EVENT_CATEGORIES } from '../../lib/constants';
import { href } from '../../lib/paths';
import type { Locale } from '../../lib/i18n/locale';
import type { EventCategory, MarketEvent, MarketSort } from '../../lib/types';

export const MARKET_SORTS: readonly MarketSort[] = ['date', 'demand', 'price'];
export const DEFAULT_SORT: MarketSort = 'date';
/** Spec §5: "Sýna fleiri" pages of 24. */
export const HOME_PAGE_SIZE = 24;
/** Brief: top 6 by wanted_tickets + tickets_available. */
export const TRENDING_COUNT = 6;
/** How many demand-sorted events to fetch before ranking them client-side for the strip. */
export const TRENDING_FETCH_LIMIT = 40;

/** Query-string names (spec §5): `q`, `flokkur`, `rada`. */
export const PARAM_Q = 'q';
export const PARAM_CATEGORY = 'flokkur';
export const PARAM_SORT = 'rada';

/** `/midatorg/vidburdir/<id>` — every card, strip item and button links here. */
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

/** Which of the three DESIGN.md card states an event is in. */
export function cardStateOf(
  event: Pick<MarketEvent, 'status' | 'starts_at' | 'min_ask' | 'tickets_available'>,
  now: number = Date.now(),
): CardState {
  if (isPastEvent(event, now)) return 'past';
  if (event.min_ask != null && (event.tickets_available ?? 0) > 0) return 'listings';
  return 'waitlist';
}

/** Demand score used by the trending strip. */
export function demandScore(event: Pick<MarketEvent, 'wanted_tickets' | 'tickets_available'>): number {
  return (event.wanted_tickets ?? 0) + (event.tickets_available ?? 0);
}

/**
 * Top `count` upcoming events by wanted + available, ties broken by the
 * earlier date. Events with no activity at all are left out (nothing to show).
 */
export function rankTrending(events: readonly MarketEvent[], count = TRENDING_COUNT, now: number = Date.now()): MarketEvent[] {
  return events
    .filter((e) => !isPastEvent(e, now) && demandScore(e) > 0)
    .slice()
    .sort((a, b) => {
      const d = demandScore(b) - demandScore(a);
      if (d !== 0) return d;
      return Date.parse(a.starts_at) - Date.parse(b.starts_at);
    })
    .slice(0, count);
}

/** Sparkline stroke: `up` when the lowest ask sits under face value, muted otherwise. */
export function sparklineTone(minAsk: number | null | undefined, face: number | null | undefined): 'up' | 'neutral' {
  if (minAsk == null || face == null || face <= 0) return 'neutral';
  return minAsk < face ? 'up' : 'neutral';
}

export type SnapshotPoint = { event_id: string; captured_at: string; min_ask: number | null };

/**
 * Groups snapshot rows (already ordered by captured_at) into one `min_ask`
 * series per event, skipping days with no listings rather than inventing a value.
 */
export function seriesFromSnapshots(rows: readonly SnapshotPoint[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const row of rows) {
    if (row.min_ask == null) continue;
    (out[row.event_id] ??= []).push(row.min_ask);
  }
  return out;
}

/** "Harpa · fös. 14. nóv. · 20:00" — venue (or city) and the formatted date. */
export function eventMeta(event: Pick<MarketEvent, 'venue_name' | 'city'>, dateText: string): string {
  const place = event.venue_name?.trim() || event.city?.trim() || '';
  return [place, dateText].filter(Boolean).join(' · ');
}

/** Sums shown in the section subtitle, over the events currently loaded. */
export function summarise(events: readonly MarketEvent[]): { events: number; tickets: number; wanted: number } {
  let tickets = 0;
  let wanted = 0;
  for (const e of events) {
    tickets += e.tickets_available ?? 0;
    wanted += e.wanted_tickets ?? 0;
  }
  return { events: events.length, tickets, wanted };
}
