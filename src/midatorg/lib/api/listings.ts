import { supabase, requireUid, PROOF_BUCKET } from '../supabase';
import { fileExtension, sha256Hex, uniq } from './_shared';
import { getPublicProfilesMap } from './profiles';
import type {
  CreateListingInput,
  EventRow,
  Listing,
  ListingProof,
  ListingWithEvent,
  ListingWithSeller,
  UpdateListingPatch,
} from '../types';

async function attachEvents<T extends { event_id: string }>(rows: T[]): Promise<(T & { event: EventRow })[]> {
  const ids = uniq(rows.map((r) => r.event_id));
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('mt_events').select('*').in('id', ids);
  if (error) throw error;
  const map = new Map((data ?? []).map((e) => [e.id, e]));
  return rows.flatMap((r) => {
    const event = map.get(r.event_id);
    return event ? [{ ...r, event }] : [];
  });
}

/** Active listings for an event (lowest price first) with the seller's public profile. */
export async function listEventListings(eventId: string): Promise<ListingWithSeller[]> {
  const { data, error } = await supabase
    .from('mt_listings')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('asking_price', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  const listings = data ?? [];
  const sellers = await getPublicProfilesMap(uniq(listings.map((l) => l.seller_id)));
  return listings.flatMap((l) => {
    const seller = sellers.get(l.seller_id);
    return seller ? [{ ...l, seller }] : [];
  });
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_listings')
    .insert({
      seller_id: uid,
      event_id: input.event_id,
      quantity: input.quantity,
      quantity_remaining: input.quantity, // trigger overwrites; column is not null
      face_value: input.face_value,
      asking_price: input.asking_price,
      ticket_type: input.ticket_type ?? null,
      seat_info: input.seat_info ?? null,
      notes: input.notes ?? null,
      split_allowed: input.split_allowed ?? true,
      expires_at: new Date(Date.now() + 365 * 86400 * 1000).toISOString(), // trigger caps at event start
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Only `asking_price, ticket_type, seat_info, notes, split_allowed` may change (while active). */
export async function updateListing(id: string, patch: UpdateListingPatch): Promise<Listing> {
  const { data, error } = await supabase.from('mt_listings').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function cancelListing(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from('mt_listings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listMyListings(): Promise<ListingWithEvent[]> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_listings')
    .select('*')
    .eq('seller_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachEvents(data ?? []);
}

/** Another user's active listings (public profile page). */
export async function listUserListings(userId: string): Promise<ListingWithEvent[]> {
  const { data, error } = await supabase
    .from('mt_listings')
    .select('*')
    .eq('seller_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachEvents(data ?? []);
}

/**
 * Hashes the file in the browser, uploads it to `mt-ticket-proofs/<uid>/<listingId>.<ext>`
 * (upsert) and records it in `mt_listing_proofs`. A file already used for another
 * listing (unique sha256) removes the uploaded object and throws `Error('DUPLICATE_PROOF')`.
 */
export async function uploadProof(listingId: string, file: File): Promise<ListingProof> {
  const uid = await requireUid();
  const sha256 = await sha256Hex(file);
  const ext = fileExtension(file);
  const path = `${uid}/${listingId}.${ext}`;

  // re-uploading for the same listing replaces the previous proof row
  const { error: delErr } = await supabase.from('mt_listing_proofs').delete().eq('listing_id', listingId).eq('seller_id', uid);
  if (delErr) throw delErr;

  const { error: upErr } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('mt_listing_proofs')
    .insert({ listing_id: listingId, seller_id: uid, path, sha256 })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      await supabase.storage.from(PROOF_BUCKET).remove([path]);
      throw new Error('DUPLICATE_PROOF');
    }
    throw error;
  }
  return data;
}

/** The signed-in user's own proof row for a listing, if any. */
export async function getMyProof(listingId: string): Promise<ListingProof | null> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('mt_listing_proofs')
    .select('*')
    .eq('listing_id', listingId)
    .eq('seller_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Short-lived download URL for a listing's proof. RLS lets the seller, admins
 * and the buyer of a deal in ticket_sent/completed/disputed read it.
 * Returns null when there is no proof or the caller may not see it.
 */
export async function getProofSignedUrl(listingId: string, expiresInSeconds = 300): Promise<string | null> {
  const { data: proof, error } = await supabase
    .from('mt_listing_proofs')
    .select('path')
    .eq('listing_id', listingId)
    .maybeSingle();
  if (error) throw error;
  if (!proof) return null;
  const { data, error: signErr } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(proof.path, expiresInSeconds);
  if (signErr) throw signErr;
  return data?.signedUrl ?? null;
}
