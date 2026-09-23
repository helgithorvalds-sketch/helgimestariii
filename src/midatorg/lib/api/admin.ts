import { supabase, requireUid } from '../supabase';
import { ilikePattern, orValue, uniq } from './_shared';
import { getPublicProfilesMap } from './profiles';
import { withDealContext } from './deals';
import type {
  DealWithContext,
  EventRow,
  Json,
  MarketEvent,
  Profile,
  ReportStatus,
  ReportWithContext,
  Setting,
  VerificationLevel,
} from '../types';

// ---------------------------------------------------------------- reports
export async function listReports(status: ReportStatus | 'all' = 'open'): Promise<ReportWithContext[]> {
  let query = supabase.from('mt_reports').select('*').order('created_at', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query.limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await getPublicProfilesMap(uniq(rows.flatMap((r) => [r.reporter_id, r.reported_user_id])));
  return rows.map((r) => ({
    ...r,
    reporter: profiles.get(r.reporter_id) ?? null,
    reported_user: r.reported_user_id ? (profiles.get(r.reported_user_id) ?? null) : null,
  }));
}

export async function resolveReport(id: string, status: Exclude<ReportStatus, 'open'>): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase
    .from('mt_reports')
    .update({ status, resolved_by: uid, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------- users
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Full `mt_profiles` rows (admins see role / ban columns). Matches display name, or an exact id. */
export async function searchUsers(q: string, limit = 50): Promise<Profile[]> {
  let query = supabase.from('mt_profiles').select('*');
  const term = q.trim();
  if (UUID_RE.test(term)) query = query.eq('id', term);
  else if (term) query = query.ilike('display_name', ilikePattern(term));
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function setBan(userId: string, banned: boolean, reason?: string | null): Promise<void> {
  const { error } = await supabase.rpc('mt_admin_set_ban', {
    p_user: userId,
    p_banned: banned,
    p_reason: reason ?? undefined,
  });
  if (error) throw error;
}

export async function setVerification(userId: string, level: VerificationLevel): Promise<void> {
  const { error } = await supabase.rpc('mt_admin_set_verification', { p_user: userId, p_level: level });
  if (error) throw error;
}

// ---------------------------------------------------------------- events
export async function listAllEvents(q = '', limit = 200): Promise<MarketEvent[]> {
  let query = supabase.from('mt_events_market').select('*');
  if (q.trim()) {
    const pattern = orValue(ilikePattern(q));
    query = query.or(`title.ilike.${pattern},venue_name.ilike.${pattern}`);
  }
  const { data, error } = await query.order('starts_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as MarketEvent[];
}

export type EventPatch = Partial<
  Pick<
    EventRow,
    | 'title'
    | 'description'
    | 'category'
    | 'venue_name'
    | 'city'
    | 'starts_at'
    | 'image_url'
    | 'tix_url'
    | 'face_value_min'
    | 'face_value_max'
    | 'status'
  >
>;

export async function updateEvent(id: string, patch: EventPatch): Promise<EventRow> {
  const { data, error } = await supabase.from('mt_events').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('mt_events').delete().eq('id', id);
  if (error) throw error;
}

export type FetchTixEventResult = { eventId: string };
export type TixImportResult = { scanned: number; inserted: number; updated: number; errors: string[] };

/** Edge function `mt-fetch-tix-event` (admin only): imports one tix.is event page. */
export async function fetchTixEvent(url: string): Promise<FetchTixEventResult> {
  const { data, error } = await supabase.functions.invoke<FetchTixEventResult>('mt-fetch-tix-event', {
    body: { url },
  });
  if (error) throw error;
  if (!data) throw new Error('GENERIC');
  return data;
}

/** Edge function `mt-import-tix`: walks tix.is category pages. */
export async function runTixImport(): Promise<TixImportResult> {
  const { data, error } = await supabase.functions.invoke<TixImportResult>('mt-import-tix', { body: {} });
  if (error) throw error;
  if (!data) throw new Error('GENERIC');
  return data;
}

// ---------------------------------------------------------------- disputes
export async function listDisputes(): Promise<DealWithContext[]> {
  const { data, error } = await supabase
    .from('mt_deals')
    .select('*')
    .eq('status', 'disputed')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return withDealContext(data ?? []);
}

// ---------------------------------------------------------------- settings
export async function getSettings(): Promise<Setting[]> {
  const { data, error } = await supabase.from('mt_settings').select('*').order('key', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setSetting(key: string, value: Json): Promise<Setting> {
  const { data, error } = await supabase
    .from('mt_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
