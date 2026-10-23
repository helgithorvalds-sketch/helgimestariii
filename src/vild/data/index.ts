import type { VildApi } from './api';
import { MockApi } from './mock';

export type { VildApi, Session } from './api';
export { ApiError, errorMessage } from './api';

const MODE = ((import.meta.env.VITE_VILD_DATA as string | undefined) ?? 'mock').toLowerCase();

let instance: VildApi | null = null;

/** The single data layer instance for the module. */
export function api(): VildApi {
  if (!instance) {
    if (MODE === 'supabase') {
      // Lazy so the mock build never bundles supabase-js twice. See data/supabase.ts.
      throw new Error('VITE_VILD_DATA=supabase: import getSupabaseApi() from data/supabase before first use');
    }
    instance = new MockApi();
  }
  return instance;
}

export function setApi(next: VildApi): void {
  instance = next;
}

export const IS_MOCK = MODE !== 'supabase';
