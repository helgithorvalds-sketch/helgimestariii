import { supabase, requireUid } from '../supabase';
import { uniq } from './_shared';
import { getPublicProfilesMap } from './profiles';
import type { CreateRequestInput, RequestWithBuyer, RequestWithEvent, TicketRequest, UpdateRequestPatch } from '../types';

/** Active requests ("óskað eftir") for an event, highest max price first, with the buyer's public profile. */
export async function listEventRequests(eventId: string): Promise<RequestWithBuyer[]> {
  const { data, error } = await supabase
    .from('mt_requests')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('max_price', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const buyers = await getPublicProfilesMap(uniq(rows.map((r) => r.buyer_id)));
  return rows.flatMap((r) => {
    const buyer = buyers.get(r.buyer_id);
    return buyer ? [{ ...r, buyer }] : [];
  });
}

export async function createRequest(input: CreateRequestInput): Promise<TicketRequest> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_requests')
    .insert({
      buyer_id: uid,
      event_id: input.event_id,
      quantity: input.quantity,
      max_price: input.max_price ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateRequest(id: string, patch: UpdateRequestPatch): Promise<TicketRequest> {
  const { data, error } = await supabase.from('mt_requests').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function cancelRequest(id: string): Promise<TicketRequest> {
  const { data, error } = await supabase
    .from('mt_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listMyRequests(): Promise<RequestWithEvent[]> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_requests')
    .select('*')
    .eq('buyer_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = uniq(rows.map((r) => r.event_id));
  if (ids.length === 0) return [];
  const { data: events, error: evErr } = await supabase.from('mt_events').select('*').in('id', ids);
  if (evErr) throw evErr;
  const map = new Map((events ?? []).map((e) => [e.id, e]));
  return rows.flatMap((r) => {
    const event = map.get(r.event_id);
    return event ? [{ ...r, event }] : [];
  });
}
