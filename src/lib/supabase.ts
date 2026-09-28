import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_MIDATORG_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Fail loudly in development; in production the build has the values baked in.
  console.error('[midatorg] VITE_MIDATORG_SUPABASE_URL / VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY are not set');
}

/**
 * Miðatorg's own Supabase project. Uses a separate auth storage key so it never
 * collides with the CRM client (src/integrations/supabase/client.ts).
 */
export const supabase = createClient<Database>(url ?? 'http://localhost', key ?? 'anon', {
  auth: {
    storageKey: 'midatorg-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Returns the signed-in user's id or throws an `AUTH_REQUIRED` error (parsed by lib/errors.ts). */
export async function requireUid(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data.session?.user.id;
  if (!uid) throw new Error('AUTH_REQUIRED');
  return uid;
}

export const PROOF_BUCKET = 'mt-ticket-proofs';
export const AVATAR_BUCKET = 'mt-avatars';
