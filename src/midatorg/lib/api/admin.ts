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

/**
 * Full `mt_profiles` rows (role / ban columns). Since 0008 the base table is
 * readable by admins (and each user for their own row) only, so this is admin-only.
 * Matches display name, or an exact id.
 */
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
  const { data, error } = await query.order('starts_at', { ascending: false }).order('id', { ascending: true }).limit(limit);
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

/** Function error bodies are `{ error: CODE, reason? | status? | message? }`; codes not in lib/errors.ts map to a close one. */
const EDGE_CODE_MAP: Record<string, string> = {
  UNAUTHORIZED: 'AUTH_REQUIRED',
  INVALID_URL: 'INVALID_INPUT',
  URL_REQUIRED: 'INVALID_INPUT',
  IMPORT_REJECTED: 'IMPORT_FAILED',
  LOOKUP_FAILED: 'IMPORT_FAILED',
};

type EdgeErrorBody = { error?: unknown; reason?: unknown; status?: unknown; message?: unknown };

/**
 * `functions.invoke` rejects a non-2xx response with a fixed message and the
 * `Response` on `error.context`; read the JSON body so the function's own code
 * (PARSE_FAILED, FETCH_FAILED, HOST_NOT_ALLOWED, NOT_ALLOWED, …) reaches parseApiError.
 */
async function edgeError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: unknown } | null)?.context as { json?: () => Promise<unknown> } | undefined;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as EdgeErrorBody | null;
      if (body && typeof body.error === 'string' && body.error) {
        const code = EDGE_CODE_MAP[body.error] ?? body.error;
        const detail = [body.reason, body.status, body.message].find(
          (v) => (typeof v === 'string' && v !== '') || typeof v === 'number',
        );
        return new Error(detail === undefined ? code : `${code}: ${String(detail)}`);
      }
    } catch {
      /* not a JSON body */
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await edgeError(error);
  if (!data) throw new Error('GENERIC');
  return data;
}

/** Edge function `mt-fetch-tix-event` (admin only): imports one tix.is event page. */
export function fetchTixEvent(url: string): Promise<FetchTixEventResult> {
  return invokeEdge<FetchTixEventResult>('mt-fetch-tix-event', { url });
}

/** Edge function `mt-import-tix` (admin JWT; cron uses the anon key plus its secret): walks tix.is category pages. */
export function runTixImport(): Promise<TixImportResult> {
  return invokeEdge<TixImportResult>('mt-import-tix', {});
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
/**
 * `mt_public_settings` (migration 0008) has exactly the `mt_settings` columns but only
 * the harmless keys, readable by everyone. database.types.ts is generated and does not
 * list the view yet, hence the cast.
 */
const PUBLIC_SETTINGS_VIEW = 'mt_public_settings' as unknown as 'mt_settings';

/**
 * Settings for the UI. Non-admins read the public view (reservation_minutes, the
 * max_* limits, require_phone_to_sell); admins read the whole table (admin_emails …).
 * The importer's `cron_secret` is never returned.
 */
export async function getSettings(opts: { admin?: boolean } = {}): Promise<Setting[]> {
  const query = opts.admin
    ? supabase.from('mt_settings').select('*').neq('key', 'cron_secret')
    : supabase.from(PUBLIC_SETTINGS_VIEW).select('*');
  const { data, error } = await query.order('key', { ascending: true });
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
