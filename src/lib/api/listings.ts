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
 * Hashes the file in the browser, records it in `mt_listing_proofs` (upsert on
 * listing_id) and only then uploads it to `mt-ticket-proofs/<uid>/<listingId>[-<suffix>].<ext>`,
 * so nothing destructive happens before the new row is accepted:
 * - a file already used for another listing (unique sha256) → `Error('DUPLICATE_PROOF')`
 *   with the previous proof untouched;
 * - a proof locked by a deal in ticket_sent / disputed / completed → NOT_ALLOWED (RLS);
 * - a replacement gets a fresh object name and the old object is removed last.
 * The sha256 is client-computed: duplicate detection is best-effort (the server only
 * checks its format and that the path names the seller's own listing).
 */
export async function uploadProof(listingId: string, file: File): Promise<ListingProof> {
  const uid = await requireUid();
  const sha256 = await sha256Hex(file);
  const ext = fileExtension(file);

  const existing = await getMyProof(listingId);
  if (existing && existing.sha256 === sha256) return existing;

  // My own other listings' proofs are visible, so catch those before touching anything;
  // other sellers' rows are not, the unique index catches them at the upsert.
  const { data: dup, error: dupErr } = await supabase
    .from('mt_listing_proofs')
    .select('listing_id')
    .eq('sha256', sha256)
    .neq('listing_id', listingId)
    .limit(1);
  if (dupErr) throw dupErr;
  if (dup && dup.length > 0) throw new Error('DUPLICATE_PROOF');

  const basePath = `${uid}/${listingId}.${ext}`;
  const path = existing && existing.path === basePath ? `${uid}/${listingId}-${Date.now().toString(36)}.${ext}` : basePath;

  const { data, error } = await supabase
    .from('mt_listing_proofs')
    .upsert({ listing_id: listingId, seller_id: uid, path, sha256 }, { onConflict: 'listing_id' })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('DUPLICATE_PROOF');
    throw error;
  }

  const { error: upErr } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) {
    // never leave the row pointing at an object that does not exist
    if (existing) {
      await supabase
        .from('mt_listing_proofs')
        .upsert({ listing_id: listingId, seller_id: uid, path: existing.path, sha256: existing.sha256 }, { onConflict: 'listing_id' });
    } else {
      await supabase.from('mt_listing_proofs').delete().eq('listing_id', listingId).eq('seller_id', uid);
    }
    throw upErr;
  }

  if (existing && existing.path !== path) await supabase.storage.from(PROOF_BUCKET).remove([existing.path]);
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
 * and the buyer of a deal read it once the seller has confirmed payment
 * (ticket_sent / completed, or disputed after the ticket was sent).
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
