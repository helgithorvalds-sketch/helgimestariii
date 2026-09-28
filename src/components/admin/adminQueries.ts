/**
 * Small react-query hooks the admin console needs on top of lib/queries.
 * The foundation's `listReports` returns reporter / reported-user profiles but
 * not the reported listing, and `searchUsers` returns raw `mt_profiles` rows
 * without rating / sales aggregates. These hooks fill those gaps without
 * editing foundation files (brief: "add it in a NEW file under your own folder").
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getPublicProfilesMap } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import type { PublicProfile } from '../../lib/types';

/** listing id → event id, for the "listing's event" link on a report. Admin RLS lets us read every listing. */
export async function getListingEventMap(listingIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (listingIds.length === 0) return map;
  const { data, error } = await supabase.from('mt_listings').select('id, event_id').in('id', listingIds);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.id, row.event_id);
  return map;
}

const EMPTY_IDS: string[] = [];

export function useListingEventMap(listingIds: string[] = EMPTY_IDS) {
  const { isAdmin } = useAuth();
  const key = [...listingIds].sort();
  return useQuery({
    queryKey: ['mt', 'admin', 'listing-events', key] as const,
    queryFn: () => getListingEventMap(key),
    enabled: isAdmin && key.length > 0,
    staleTime: 60_000,
  });
}

/** `mt_public_profiles` rows (rating avg/count, sales) for the users in an admin search. */
export function usePublicProfilesMap(userIds: string[] = EMPTY_IDS) {
  const { isAdmin } = useAuth();
  const key = [...userIds].sort();
  return useQuery<Map<string, PublicProfile>>({
    queryKey: ['mt', 'admin', 'user-stats', key] as const,
    queryFn: () => getPublicProfilesMap(key),
    enabled: isAdmin && key.length > 0,
    staleTime: 30_000,
  });
}

/** Debounced copy of `value` for search boxes (300 ms by default). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
