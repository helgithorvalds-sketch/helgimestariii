import { supabase, requireUid } from '../supabase';
import { uniq } from './_shared';
import type { Alert, AlertWithEvent, MarketEvent } from '../types';

export async function listMyAlerts(): Promise<AlertWithEvent[]> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_alerts')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = uniq(rows.map((a) => a.event_id));
  if (ids.length === 0) return [];
  const { data: events, error: evErr } = await supabase.from('mt_events_market').select('*').in('id', ids);
  if (evErr) throw evErr;
  const map = new Map(((events ?? []) as MarketEvent[]).map((e) => [e.id, e]));
  return rows.flatMap((a) => {
    const event = map.get(a.event_id);
    return event ? [{ ...a, event }] : [];
  });
}

/** Creates or updates my alert for an event. `maxPrice` null = notify on any listing. */
export async function upsertAlert(eventId: string, maxPrice: number | null): Promise<Alert> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_alerts')
    .upsert({ user_id: uid, event_id: eventId, max_price: maxPrice }, { onConflict: 'user_id,event_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function removeAlert(eventId: string): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase.from('mt_alerts').delete().eq('user_id', uid).eq('event_id', eventId);
  if (error) throw error;
}

export async function getMyAlert(eventId: string): Promise<Alert | null> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_alerts')
    .select('*')
    .eq('user_id', uid)
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
