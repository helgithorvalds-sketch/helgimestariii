/**
 * Pure helpers for the event page (chart ranges, domains, depth, quantities).
 * Kept free of React so they can be unit-tested directly.
 */
import type { Json, MarketEvent, PriceSnapshot, Setting } from '../../lib/types';

export type ChartRange = 'week' | 'month' | 'all';
export const CHART_RANGES: ChartRange[] = ['week', 'month', 'all'];
export const RANGE_DAYS: Record<ChartRange, number | null> = { week: 7, month: 30, all: null };

export type ChartPoint = {
  /** `YYYY-MM-DD` as stored in `mt_price_snapshots.captured_at`. */
  date: string;
  /** Local midnight of `date`, for a numeric x-axis. */
  ts: number;
  min: number | null;
  avg: number | null;
  listings: number;
  requests: number;
};

/** The price ceiling for an event: the upper face value, or the only one known. */
export function eventFaceValue(
  event: Pick<MarketEvent, 'face_value_min' | 'face_value_max'> | null | undefined,
): number | null {
  if (!event) return null;
  const max = event.face_value_max;
  const min = event.face_value_min;
  if (max != null && max > 0) return max;
  if (min != null && min > 0) return min;
  return null;
}

/** Local midnight for a `YYYY-MM-DD` string (falls back to Date.parse for full timestamps). */
export function dateKeyToTs(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Snapshots → chart points, sorted ascending and deduplicated by day (last wins). */
export function toChartPoints(snapshots: PriceSnapshot[] | null | undefined): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const s of snapshots ?? []) {
    const date = s.captured_at.slice(0, 10);
    byDay.set(date, {
      date,
      ts: dateKeyToTs(date),
      min: s.min_ask ?? null,
      avg: s.avg_ask ?? null,
      listings: s.listings_count ?? 0,
      requests: s.requests_count ?? 0,
    });
  }
  return Array.from(byDay.values()).sort((a, b) => a.ts - b.ts);
}

/** Points inside the range, measured back from `now` (inclusive). */
export function filterByRange(points: ChartPoint[], range: ChartRange, now: Date = new Date()): ChartPoint[] {
  const days = RANGE_DAYS[range];
  if (days == null) return points;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).getTime();
  return points.filter((p) => p.ts >= cutoff);
}

/** Number of points that carry a lowest price (the chart needs two to draw a line). */
export function countPriced(points: ChartPoint[]): number {
  return points.reduce((n, p) => (p.min != null ? n + 1 : n), 0);
}

function floorTo(n: number, step: number): number {
  return Math.floor(n / step) * step;
}
function ceilTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

/**
 * Y domain per DESIGN.md: [face×0.75 rounded down to 1.000, face×1.05], widened so
 * every data point (min and avg) stays inside. Without a face value the domain
 * hugs the data with a little headroom.
 */
export function chartYDomain(points: ChartPoint[], face: number | null): [number, number] {
  const values = points.flatMap((p) => [p.min, p.avg]).filter((v): v is number => v != null && Number.isFinite(v));
  const dataMin = values.length ? Math.min(...values) : null;
  const dataMax = values.length ? Math.max(...values) : null;

  let low: number;
  let high: number;
  if (face != null && face > 0) {
    low = floorTo(face * 0.75, 1000);
    high = ceilTo(face * 1.05, 100);
  } else if (dataMin != null && dataMax != null) {
    low = floorTo(dataMin * 0.9, 1000);
    high = ceilTo(dataMax * 1.05, 1000);
  } else {
    return [0, 1000];
  }
  if (dataMin != null && dataMin < low) low = floorTo(dataMin * 0.95, 1000);
  if (dataMax != null && dataMax > high) high = ceilTo(dataMax * 1.02, 100);
  if (low < 0) low = 0;
  if (high <= low) high = low + 1000;
  return [low, high];
}

/** `count` evenly spread x values (timestamps) including the first and last point. */
export function pickTicks(points: ChartPoint[], count: number): number[] {
  if (points.length === 0) return [];
  if (points.length <= count) return points.map((p) => p.ts);
  const out: number[] = [];
  const last = points.length - 1;
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * last) / (count - 1));
    const ts = points[idx].ts;
    if (!out.includes(ts)) out.push(ts);
  }
  return out;
}

export type PriceChange = { first: number; last: number; diff: number; pct: number };

/** Change between the first and last priced point of the range; null with fewer than two. */
export function priceChange(points: ChartPoint[]): PriceChange | null {
  const priced = points.filter((p) => p.min != null);
  if (priced.length < 2) return null;
  const first = priced[0].min as number;
  const last = priced[priced.length - 1].min as number;
  const diff = last - first;
  const pct = first > 0 ? (diff / first) * 100 : 0;
  return { first, last, diff, pct };
}

/** The most recent lowest price in the range (or null). */
export function lastPrice(points: ChartPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].min;
    if (v != null) return v;
  }
  return null;
}

/**
 * Cumulative depth per row as a percentage (0–100) of the total quantity, in
 * the given order: [2, 1, 2, 2] → [29, 43, 71, 100].
 */
export function cumulativeDepth(quantities: number[]): number[] {
  const total = quantities.reduce((s, q) => s + Math.max(0, q), 0);
  if (total <= 0) return quantities.map(() => 0);
  let acc = 0;
  return quantities.map((q) => {
    acc += Math.max(0, q);
    return Math.min(100, Math.round((acc / total) * 100));
  });
}

/**
 * Keeps a requested quantity inside what the listing allows: 1…quantity_remaining,
 * or exactly quantity_remaining when the seller does not split.
 */
export function clampQuantity(
  requested: number,
  listing: Pick<{ quantity_remaining: number; split_allowed: boolean }, 'quantity_remaining' | 'split_allowed'>,
): number {
  const max = Math.max(1, listing.quantity_remaining);
  if (!listing.split_allowed) return max;
  if (!Number.isFinite(requested)) return 1;
  return Math.min(max, Math.max(1, Math.floor(requested)));
}

/** A listing younger than 24 hours gets the "Nýtt" badge. */
export function isNewListing(createdAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  return now - t < 24 * 60 * 60 * 1000;
}

/** `reservation_minutes` from mt_settings (stored as a JSON number or string); default 30. */
export function reservationMinutes(settings: Setting[] | null | undefined, fallback = 30): number {
  const row = settings?.find((s) => s.key === 'reservation_minutes');
  const raw: Json | undefined = row?.value;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

/** True when the event can still take listings, requests and reservations. */
export function isEventOpen(event: Pick<MarketEvent, 'status' | 'starts_at'>, now: number = Date.now()): boolean {
  if (event.status !== 'upcoming') return false;
  const t = Date.parse(event.starts_at);
  return !Number.isFinite(t) || t > now;
}
