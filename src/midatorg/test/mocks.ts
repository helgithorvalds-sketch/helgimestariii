/**
 * Test helpers: a chainable supabase-js stand-in. Every query-builder method
 * returns the same builder; awaiting it resolves to `{ data, error, count }`.
 */
import { vi } from 'vitest';

export type MockResult = { data: unknown; error: unknown; count: number | null };

export function makeQueryBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: MockResult) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      if (prop === 'catch' || prop === 'finally') return () => proxy;
      return () => proxy;
    },
  };
  const proxy: unknown = new Proxy(builder, handler);
  return proxy;
}

export function makeSupabaseMock(result: MockResult = { data: [], error: null, count: 0 }) {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(),
  };
  return {
    from: vi.fn(() => makeQueryBuilder(result)),
    rpc: vi.fn(() => makeQueryBuilder(result)),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://x/y' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://x/avatar.png' } })),
      })),
    },
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  };
}
