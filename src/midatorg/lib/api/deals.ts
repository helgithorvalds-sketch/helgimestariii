import { supabase, requireUid } from '../supabase';
import { uniq } from './_shared';
import { getPublicProfilesMap } from './profiles';
import type { Deal, DealAction, DealWithContext } from '../types';

/** Attaches event, listing and both parties' public profiles (4 queries, RLS applies). */
export async function withDealContext(deals: Deal[]): Promise<DealWithContext[]> {
  if (deals.length === 0) return [];
  const eventIds = uniq(deals.map((d) => d.event_id));
  const listingIds = uniq(deals.map((d) => d.listing_id));
  const userIds = uniq(deals.flatMap((d) => [d.buyer_id, d.seller_id]));

  const [eventsRes, listingsRes, profiles] = await Promise.all([
    supabase.from('mt_events').select('*').in('id', eventIds),
    supabase.from('mt_listings').select('*').in('id', listingIds),
    getPublicProfilesMap(userIds),
  ]);
  if (eventsRes.error) throw eventsRes.error;
  if (listingsRes.error) throw listingsRes.error;

  const events = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));
  const listings = new Map((listingsRes.data ?? []).map((l) => [l.id, l]));

  return deals.flatMap((d) => {
    const event = events.get(d.event_id);
    const listing = listings.get(d.listing_id);
    const buyer = profiles.get(d.buyer_id);
    const seller = profiles.get(d.seller_id);
    if (!event || !listing || !buyer || !seller) {
      if (import.meta.env.DEV) console.warn('[midatorg] deal without full context', d.id);
      return [];
    }
    return [{ ...d, event, listing, buyer, seller }];
  });
}

/** `mt_reserve_listing` → the new deal (status 'reserved'). */
export async function reserveListing(listingId: string, quantity: number): Promise<Deal> {
  const { data, error } = await supabase.rpc('mt_reserve_listing', { p_listing_id: listingId, p_quantity: quantity });
  if (error) throw error;
  return data as Deal;
}

/** `mt_deal_transition` → the updated deal. */
export async function transitionDeal(dealId: string, action: DealAction, reason?: string | null): Promise<Deal> {
  const { data, error } = await supabase.rpc('mt_deal_transition', {
    p_deal_id: dealId,
    p_action: action,
    p_reason: reason ?? undefined,
  });
  if (error) throw error;
  return data as Deal;
}

/** Every deal where I am buyer or seller, newest first. */
export async function listMyDeals(): Promise<DealWithContext[]> {
  await requireUid();
  const { data, error } = await supabase.from('mt_deals').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return withDealContext(data ?? []);
}

export async function getDeal(id: string): Promise<DealWithContext | null> {
  const { data, error } = await supabase.from('mt_deals').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [deal] = await withDealContext([data]);
  return deal ?? null;
}

/** Realtime: fires with the new row on every update to this deal. Returns an unsubscribe fn. */
export function subscribeDeal(id: string, onChange: (deal: Deal) => void): () => void {
  const channel = supabase
    .channel(`mt-deal-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mt_deals', filter: `id=eq.${id}` },
      (payload) => onChange(payload.new as Deal),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
