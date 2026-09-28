import { supabase, requireUid, AVATAR_BUCKET } from '../supabase';
import { fileExtension } from './_shared';
import type { Profile, ProfilePatch, PublicProfile } from '../types';

export async function getMyProfile(): Promise<Profile | null> {
  const uid = await requireUid();
  const { data, error } = await supabase.from('mt_profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(patch: ProfilePatch): Promise<Profile> {
  const uid = await requireUid();
  const { data, error } = await supabase.from('mt_profiles').update(patch).eq('id', uid).select('*').single();
  if (error) throw error;
  return data;
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.from('mt_public_profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PublicProfile | null) ?? null;
}

/** Fetches several public profiles at once and returns them keyed by id. */
export async function getPublicProfilesMap(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from('mt_public_profiles').select('*').in('id', ids);
  if (error) throw error;
  for (const row of (data ?? []) as PublicProfile[]) map.set(row.id, row);
  return map;
}

/**
 * Uploads to the public `mt-avatars` bucket at `<uid>/avatar.<ext>` (upsert),
 * stores the public URL on the profile and returns it.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const uid = await requireUid();
  const ext = fileExtension(file);
  const path = `${uid}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined, cacheControl: '3600' });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await updateMyProfile({ avatar_url: url });
  return url;
}

/**
 * Starts electronic-ID verification (rafræn skilríki) through the mt-eid edge function.
 * Returns the provider URL to send the browser to; the provider then returns the user to
 * `next` with ?eid=ok or ?eid=error&code=… . Throws Error('EID_NOT_CONFIGURED') until the
 * provider secrets are set, Error('AUTH_REQUIRED') without a session, Error('EID_FAILED') otherwise.
 */
export async function startEidVerification(next: string, opts: { app?: boolean } = {}): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; code?: string }>(
    `mt-eid/start?next=${encodeURIComponent(next)}${opts.app ? '&app=1' : ''}`,
    { method: 'GET' },
  );
  if (error) {
    let code = 'EID_FAILED';
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = (await context.clone().json()) as { code?: unknown };
        if (typeof body.code === 'string') code = body.code;
      } catch {
        /* non-JSON error body: keep the generic code */
      }
    }
    throw new Error(code);
  }
  if (!data?.url) throw new Error('EID_FAILED');
  return { url: data.url };
}
