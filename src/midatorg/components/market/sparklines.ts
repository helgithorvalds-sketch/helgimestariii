/**
 * Home-page sparklines: one query for the `min_ask` history of every visible
 * event. The foundation's `listPriceSnapshots(eventId, days)` takes a single
 * id, so this helper queries `mt_price_snapshots` with `event_id in (…)`.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { seriesFromSnapshots, type SnapshotPoint } from './helpers';

export type SparklineSeries = Record<string, number[]>;

export const SPARKLINE_DAYS = 30;

function sinceDate(days: number): string {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since.toISOString().slice(0, 10);
}

export async function fetchSparklines(eventIds: readonly string[], days = SPARKLINE_DAYS): Promise<SparklineSeries> {
  const ids = Array.from(new Set(eventIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('mt_price_snapshots')
    .select('event_id, captured_at, min_ask')
    .in('event_id', ids)
    .gte('captured_at', sinceDate(days))
    .order('captured_at', { ascending: true });
  if (error) throw error;
  return seriesFromSnapshots((data ?? []) as SnapshotPoint[]);
}

export function sparklinesKey(eventIds: readonly string[], days = SPARKLINE_DAYS) {
  const ids = Array.from(new Set(eventIds.filter(Boolean))).sort();
  return ['mt', 'sparklines', days, ids] as const;
}

/**
 * `const { data } = useSparklines(events.map((e) => e.id))` → `{ [eventId]: number[] }`.
 * Keeps the previous series while a larger page set loads, so cards never flicker.
 */
export function useSparklines(eventIds: readonly string[], days = SPARKLINE_DAYS) {
  return useQuery({
    queryKey: sparklinesKey(eventIds, days),
    queryFn: () => fetchSparklines(eventIds, days),
    enabled: eventIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
