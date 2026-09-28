import type { MarketEvent } from '../../lib/types';

/** Iceland as the map opens: whole country visible. */
export const ICELAND_CENTER: [number, number] = [64.9, -18.9];
export const ICELAND_BOUNDS: [[number, number], [number, number]] = [
  [62.5, -26],
  [67.5, -11],
];
/** Quick jumps for the region buttons. */
export const REGIONS = {
  all: { center: ICELAND_CENTER, zoom: 6 },
  capital: { center: [64.125, -21.88] as [number, number], zoom: 11 },
  north: { center: [65.683, -18.09] as [number, number], zoom: 12 },
} as const;
export type RegionKey = keyof typeof REGIONS;

/** Default tiles: OpenStreetMap. Override with VITE_MIDATORG_TILE_URL (e.g. a keyed provider in production). */
export const TILE_URL: string =
  (import.meta.env.VITE_MIDATORG_TILE_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION: string =
  (import.meta.env.VITE_MIDATORG_TILE_ATTRIBUTION as string | undefined) ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ---------------------------------------------------------------------------
// Day selection (?dagur=YYYY-MM-DD | ?dagur=30)
// ---------------------------------------------------------------------------
export const PARAM_DAY = 'dagur';
export const NEXT_DAYS = 30;
/** `next30` = the next 30 days (default, so the map is never empty); otherwise a local date key. */
export type DaySelection = 'next30' | string;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Parse the URL value; anything unknown or in the past falls back to the next 30 days. */
export function parseDay(value: string | null | undefined, now: Date = new Date()): DaySelection {
  if (!value || value === String(NEXT_DAYS)) return 'next30';
  if (!DAY_KEY_RE.test(value)) return 'next30';
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (dayKey(date) !== value) return 'next30'; // e.g. 2026-02-31
  if (date < startOfLocalDay(now)) return 'next30';
  return value;
}

export function dayParamValue(sel: DaySelection): string {
  return sel === 'next30' ? String(NEXT_DAYS) : sel;
}

/** [from, to) as ISO strings for the events query. "Today" starts now so finished events drop off. */
export function rangeFor(sel: DaySelection, now: Date = new Date()): { from: string; to: string } {
  if (sel === 'next30') {
    return { from: now.toISOString(), to: addDays(startOfLocalDay(now), NEXT_DAYS + 1).toISOString() };
  }
  const [y, m, d] = sel.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const from = dayKey(start) === dayKey(now) ? now : start;
  return { from: from.toISOString(), to: addDays(start, 1).toISOString() };
}

export type DayOption = { value: DaySelection; date: Date | null; kind: 'next30' | 'today' | 'tomorrow' | 'date' };

/** Chips: "Næstu 30 dagar", "Í dag", "Á morgun", then the following days. */
export function dayOptions(now: Date = new Date(), days = 14): DayOption[] {
  const today = startOfLocalDay(now);
  const out: DayOption[] = [{ value: 'next30', date: null, kind: 'next30' }];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    out.push({ value: dayKey(date), date, kind: i === 0 ? 'today' : i === 1 ? 'tomorrow' : 'date' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Points & clustering
// ---------------------------------------------------------------------------
export type MapPoint = { event: MarketEvent; lat: number; lng: number };

export function hasCoords(event: MarketEvent): event is MarketEvent & { map_lat: number; map_lng: number } {
  return typeof event.map_lat === 'number' && typeof event.map_lng === 'number' && Number.isFinite(event.map_lat) && Number.isFinite(event.map_lng);
}

/** Split events into those that can be pinned and those with no known location. */
export function splitByLocation(events: MarketEvent[]): { placed: MapPoint[]; unplaced: MarketEvent[] } {
  const placed: MapPoint[] = [];
  const unplaced: MarketEvent[] = [];
  for (const event of events) {
    if (hasCoords(event)) placed.push({ event, lat: event.map_lat, lng: event.map_lng });
    else unplaced.push(event);
  }
  return { placed, unplaced };
}

export type ScreenPoint = { x: number; y: number };
export type Cluster = { key: string; points: MapPoint[]; lat: number; lng: number };

/**
 * Grid clustering in screen space: points whose projected pixels fall into the same
 * `cell`-sized square become one cluster. Deterministic (input order) and O(n).
 * The cluster sits at the mean of its points.
 */
export function clusterPoints(points: MapPoint[], project: (p: MapPoint) => ScreenPoint, cell = 56): Cluster[] {
  const buckets = new Map<string, MapPoint[]>();
  for (const p of points) {
    const { x, y } = project(p);
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  const out: Cluster[] = [];
  for (const [key, list] of buckets) {
    const lat = list.reduce((s, p) => s + p.lat, 0) / list.length;
    const lng = list.reduce((s, p) => s + p.lng, 0) / list.length;
    out.push({ key: list.length === 1 ? list[0].event.id : `c:${key}:${list.length}`, points: list, lat, lng });
  }
  return out;
}

/** Minimal HTML escaping for strings placed inside Leaflet divIcon markup. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
}

/** Only https images are placed into marker markup. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https:\/\//i.test(url) ? url : null;
}
