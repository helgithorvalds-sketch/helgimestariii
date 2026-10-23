import type { VildApi } from './api';
import { MockApi } from './mock';

export type { VildApi, Session } from './api';
export { ApiError, errorMessage } from './api';

const MODE = ((import.meta.env.VITE_VILD_DATA as string | undefined) ?? 'mock').toLowerCase();

let instance: VildApi | null = null;
let pending: Promise<VildApi> | null = null;

/** The single data layer instance for the module. In supabase mode, initApi() must have resolved first. */
export function api(): VildApi {
  if (!instance) {
    if (MODE === 'supabase') {
      // Lazy so the mock build never bundles supabase-js twice. VildApp awaits initApi() before rendering.
      throw new Error('VITE_VILD_DATA=supabase: await initApi() before the first api() call');
    }
    instance = new MockApi();
  }
  return instance;
}

/**
 * Resolves the data layer for the configured mode. Mock: synchronous and unchanged.
 * Supabase: dynamically imports ./supabase (so the mock bundle stays small) once.
 */
export function initApi(): Promise<VildApi> {
  if (instance) return Promise.resolve(instance);
  if (MODE !== 'supabase') return Promise.resolve(api());
  if (!pending) {
    pending = import('./supabase').then((m) => {
      instance = m.getSupabaseApi();
      return instance;
    });
  }
  return pending;
}

export function setApi(next: VildApi): void {
  instance = next;
  pending = null;
}

export const IS_MOCK = MODE !== 'supabase';
