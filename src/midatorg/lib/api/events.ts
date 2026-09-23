import { supabase } from '../supabase';
import { ilikePattern, orValue } from './_shared';
import { DEFAULT_PAGE_SIZE } from '../constants';
import type { CreateManualEventInput, EventRow, MarketEvent, MarketEventsParams, PriceSnapshot, Venue } from '../types';

/**
 * Market list from `mt_events_market`.
 * - `q` matches title or venue (ilike)
 * - `category` filters; 'all' / null = every category
 * - `status` defaults to 'upcoming'; 'all' disables the filter
 * - sort: date = starts_at asc; demand = wanted_tickets desc (nulls last), tickets_available desc;
 *   price = min_ask asc (nulls last)
 * - range pagination with `limit` / `offset`
 */
export async function listMarketEvents(params: MarketEventsParams = {}): Promise<MarketEvent[]> {
  const { q, category, sort = 'date', status = 'upcoming', limit = DEFAULT_PAGE_SIZE, offset = 0 } = params;
  let query = supabase.from('mt_events_market').select('*');

  if (status !== 'all') query = query.eq('status', status);
  if (category && category !== 'all') query = query.eq('category', category);
  if (q && q.trim()) {
    const pattern = orValue(ilikePattern(q));
    query = query.or(`title.ilike.${pattern},venue_name.ilike.${pattern}`);
  }

  switch (sort) {
    case 'demand':
      query = query
        .order('wanted_tickets', { ascending: false, nullsFirst: false })
        .order('tickets_available', { ascending: false, nullsFirst: false })
        .order('starts_at', { ascending: true });
      break;
    case 'price':
      query = query.order('min_ask', { ascending: true, nullsFirst: false }).order('starts_at', { ascending: true });
      break;
    case 'date':
    default:
      query = query.order('starts_at', { ascending: true });
      break;
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as MarketEvent[];
}

export async function getMarketEvent(id: string): Promise<MarketEvent | null> {
  const { data, error } = await supabase.from('mt_events_market').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as MarketEvent | null) ?? null;
}

/** Quick search for pickers: upcoming events whose title or venue matches. */
export async function searchEvents(q: string, limit = 10): Promise<MarketEvent[]> {
  let query = supabase.from('mt_events_market').select('*').eq('status', 'upcoming');
  if (q && q.trim()) {
    const pattern = orValue(ilikePattern(q));
    query = query.or(`title.ilike.${pattern},venue_name.ilike.${pattern}`);
  }
  const { data, error } = await query.order('starts_at', { ascending: true }).limit(limit);
  if (error) throw error;
  return (data ?? []) as MarketEvent[];
}

/** Direct insert; the guard trigger forces source='manual', created_by=me, status='upcoming'. */
export async function createManualEvent(input: CreateManualEventInput): Promise<EventRow> {
  const { data, error } = await supabase
    .from('mt_events')
    .insert({
      title: input.title,
      category: input.category,
      starts_at: input.starts_at,
      venue_name: input.venue_name ?? null,
      city: input.city ?? null,
      description: input.description ?? null,
      tix_url: input.tix_url ?? null,
      image_url: input.image_url ?? null,
      face_value_min: input.face_value_min ?? null,
      face_value_max: input.face_value_max ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listPriceSnapshots(eventId: string, days = 90): Promise<PriceSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('mt_price_snapshots')
    .select('*')
    .eq('event_id', eventId)
    .gte('captured_at', sinceDate)
    .order('captured_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CompletedDealPrice = { price: number; at: string };

/**
 * Deals are private, so the only public trace of completed sales is the
 * `last_sold_price` / `last_sold_at` pair in `mt_event_stats` (0 or 1 point).
 */
export async function listCompletedDealPrices(eventId: string): Promise<CompletedDealPrice[]> {
  const { data, error } = await supabase
    .from('mt_event_stats')
    .select('last_sold_price, last_sold_at, sold_count')
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.last_sold_price == null || !data.last_sold_at) return [];
  return [{ price: data.last_sold_price, at: data.last_sold_at }];
}

export async function listVenues(): Promise<Venue[]> {
  const { data, error } = await supabase.from('mt_venues').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
