/**
 * lib/api behaviour the 0008 security fixes rely on: the queries the functions
 * build and how results are turned into errors. The supabase client is replaced
 * by a recording stand-in; nothing here touches the network.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown; count?: number | null };
type Call = { method: string; args: unknown[] };

const sb = vi.hoisted(() => {
  const storage = { upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn() };
  return {
    storage,
    from: vi.fn(),
    rpc: vi.fn(),
    invoke: vi.fn(),
    storageFrom: vi.fn(() => storage),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { from: sb.from, rpc: sb.rpc, functions: { invoke: sb.invoke }, storage: { from: sb.storageFrom } },
  requireUid: () => Promise.resolve('u1'),
  PROOF_BUCKET: 'mt-ticket-proofs',
  AVATAR_BUCKET: 'mt-avatars',
}));
vi.mock('../lib/api/_shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/_shared')>();
  return { ...actual, sha256Hex: vi.fn(async () => 'a'.repeat(64)) };
});

import { listMyDeals, transitionDeal } from '../lib/api/deals';
import { createManualEvent, listMarketEvents } from '../lib/api/events';
import { uploadProof } from '../lib/api/listings';
import { fetchTixEvent, getSettings } from '../lib/api/admin';
import { listNotifications } from '../lib/api/notifications';
import { parseApiError } from '../lib/errors';

/** Chainable query builder that records every call and resolves to `result`. */
function recorder(result: Result, calls: Call[]): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
        }
        if (prop === 'catch' || prop === 'finally') return () => proxy;
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

/** Queues the result of the next `supabase.from(...)` chain and returns its recorded calls. */
function nextFrom(result: Result): Call[] {
  const calls: Call[] = [];
  sb.from.mockImplementationOnce((table: string) => {
    calls.push({ method: 'from', args: [table] });
    return recorder(result, calls);
  });
  return calls;
}

function lastOrder(calls: Call[]): unknown[] | undefined {
  return calls.filter((c) => c.method === 'order').at(-1)?.args;
}

beforeEach(() => {
  sb.from.mockReset();
  sb.rpc.mockReset();
  sb.invoke.mockReset();
  sb.storage.upload.mockReset().mockResolvedValue({ data: null, error: null });
  sb.storage.remove.mockReset().mockResolvedValue({ data: null, error: null });
});

describe('deals', () => {
  const deal = { id: 'd1', status: 'reserved', event_id: 'e1' };

  it('transitionDeal turns a returned expired reservation into RESERVATION_EXPIRED (except for cancel)', async () => {
    sb.rpc.mockImplementation(() => recorder({ data: { ...deal, status: 'expired' }, error: null }, []));
    await expect(transitionDeal('d1', 'mark_paid')).rejects.toThrow('RESERVATION_EXPIRED');
    await expect(transitionDeal('d1', 'cancel', 'x')).resolves.toMatchObject({ status: 'expired' });
    sb.rpc.mockImplementation(() => recorder({ data: { ...deal, status: 'paid_claimed' }, error: null }, []));
    await expect(transitionDeal('d1', 'mark_paid')).resolves.toMatchObject({ status: 'paid_claimed' });
  });

  it('listMyDeals filters on buyer_id / seller_id = me instead of relying on RLS alone', async () => {
    const calls = nextFrom({ data: [], error: null });
    await expect(listMyDeals()).resolves.toEqual([]);
    expect(calls[0]).toEqual({ method: 'from', args: ['mt_deals'] });
    expect(calls).toContainEqual({ method: 'or', args: ['buyer_id.eq.u1,seller_id.eq.u1'] });
  });
});

describe('events', () => {
  it('listMarketEvents always ends its ordering with id so pages are deterministic', async () => {
    for (const sort of ['date', 'demand', 'price'] as const) {
      const calls = nextFrom({ data: [], error: null });
      await listMarketEvents({ sort, offset: 24, limit: 24 });
      expect(lastOrder(calls), sort).toEqual(['id', { ascending: true }]);
      expect(calls).toContainEqual({ method: 'range', args: [24, 47] });
    }
  });

  const base = { title: 'X', category: 'tonleikar' as const, starts_at: '2030-01-01T20:00:00Z' };

  it('createManualEvent refuses non-tix.is links and non-https images before hitting the API', async () => {
    await expect(createManualEvent({ ...base, tix_url: 'javascript:alert(1)' })).rejects.toThrow('INVALID_INPUT');
    await expect(createManualEvent({ ...base, tix_url: 'https://evil.example/tix.is/' })).rejects.toThrow('INVALID_INPUT');
    await expect(createManualEvent({ ...base, image_url: 'http://example.is/a.png' })).rejects.toThrow('INVALID_INPUT');
    expect(sb.from).not.toHaveBeenCalled();

    const calls = nextFrom({ data: { id: 'e9' }, error: null });
    await expect(createManualEvent({ ...base, tix_url: 'https://www.tix.is/is/event/1/', image_url: 'https://cdn.tix.is/a.jpg' })).resolves.toEqual({ id: 'e9' });
    expect(calls[0]).toEqual({ method: 'from', args: ['mt_events'] });
  });
});

describe('notifications', () => {
  it('listNotifications pages with range(offset, offset + limit - 1) and an id tiebreaker', async () => {
    const calls = nextFrom({ data: [], error: null });
    await expect(listNotifications(20, 40)).resolves.toEqual([]);
    expect(calls).toContainEqual({ method: 'range', args: [40, 59] });
    expect(lastOrder(calls)).toEqual(['id', { ascending: true }]);
  });
});

describe('admin', () => {
  it('getSettings reads the public view for users and the table (minus cron_secret) for admins', async () => {
    const pub = nextFrom({ data: [{ key: 'reservation_minutes', value: 30 }], error: null });
    await expect(getSettings({ admin: false })).resolves.toHaveLength(1);
    expect(pub[0]).toEqual({ method: 'from', args: ['mt_public_settings'] });

    const full = nextFrom({ data: [], error: null });
    await getSettings({ admin: true });
    expect(full[0]).toEqual({ method: 'from', args: ['mt_settings'] });
    expect(full).toContainEqual({ method: 'neq', args: ['key', 'cron_secret'] });
  });

  it('fetchTixEvent surfaces the edge function error code (and reason) from the response body', async () => {
    const httpError = (body: unknown) => ({
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => body },
    });
    sb.invoke.mockResolvedValueOnce({ data: null, error: httpError({ error: 'PARSE_FAILED', reason: 'NO_START_DATE' }) });
    const err = await fetchTixEvent('https://tix.is/is/event/1/').catch((e: unknown) => e);
    expect((err as Error).message).toBe('PARSE_FAILED: NO_START_DATE');
    expect(parseApiError(err).code).toBe('PARSE_FAILED');

    sb.invoke.mockResolvedValueOnce({ data: null, error: httpError({ error: 'UNAUTHORIZED', reason: 'NO_TOKEN' }) });
    await expect(fetchTixEvent('https://tix.is/is/event/1/')).rejects.toThrow('AUTH_REQUIRED');

    sb.invoke.mockResolvedValueOnce({ data: null, error: httpError({ error: 'NOT_ALLOWED' }) });
    await expect(fetchTixEvent('https://tix.is/is/event/1/')).rejects.toThrow('NOT_ALLOWED');

    sb.invoke.mockResolvedValueOnce({ data: null, error: new TypeError('Failed to fetch') });
    expect(parseApiError(await fetchTixEvent('https://tix.is/is/event/1/').catch((e: unknown) => e)).code).toBe('NETWORK');
  });
});

describe('uploadProof', () => {
  const file = new File(['ticket'], 'ticket.pdf', { type: 'application/pdf' });
  const sha = 'a'.repeat(64);
  const existing = { listing_id: 'l1', seller_id: 'u1', path: 'u1/l1.pdf', sha256: 'b'.repeat(64), created_at: '' };

  it('returns the current proof untouched when the same file is uploaded again', async () => {
    nextFrom({ data: { ...existing, sha256: sha }, error: null });
    await expect(uploadProof('l1', file)).resolves.toMatchObject({ path: 'u1/l1.pdf' });
    expect(sb.storage.upload).not.toHaveBeenCalled();
  });

  it('refuses a file already used for another of my listings before touching anything', async () => {
    nextFrom({ data: existing, error: null }); // my proof for l1
    nextFrom({ data: [{ listing_id: 'l2' }], error: null }); // same sha on l2
    await expect(uploadProof('l1', file)).rejects.toThrow('DUPLICATE_PROOF');
    expect(sb.from).toHaveBeenCalledTimes(2);
    expect(sb.storage.upload).not.toHaveBeenCalled();
    expect(sb.storage.remove).not.toHaveBeenCalled();
  });

  it('replaces a proof by writing the row first, uploading under a fresh name, then removing the old object', async () => {
    nextFrom({ data: existing, error: null });
    nextFrom({ data: [], error: null });
    const upsert = nextFrom({ data: { ...existing, sha256: sha, path: 'new' }, error: null });
    const order: string[] = [];
    sb.storage.upload.mockImplementation(async () => {
      order.push('upload');
      return { data: null, error: null };
    });
    sb.from.mockImplementation(() => {
      order.push('from');
      return recorder({ data: null, error: null }, []);
    });

    await expect(uploadProof('l1', file)).resolves.toMatchObject({ path: 'new' });
    const row = upsert.find((c) => c.method === 'upsert')?.args[0] as { path: string; sha256: string };
    expect(row.sha256).toBe(sha);
    expect(row.path).toMatch(/^u1\/l1-[a-z0-9]+\.pdf$/);
    expect(sb.storage.upload).toHaveBeenCalledWith(row.path, file, expect.objectContaining({ upsert: true }));
    expect(sb.storage.remove).toHaveBeenCalledWith(['u1/l1.pdf']);
    expect(order.indexOf('upload')).toBeGreaterThan(-1);
    expect(order.filter((o) => o === 'from')).toHaveLength(0); // no extra row writes on the happy path
  });

  it('keeps the previous proof when the new row is a duplicate of another seller\'s file', async () => {
    nextFrom({ data: existing, error: null });
    nextFrom({ data: [], error: null });
    nextFrom({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "mt_listing_proofs_sha_idx"' } });
    await expect(uploadProof('l1', file)).rejects.toThrow('DUPLICATE_PROOF');
    expect(sb.storage.upload).not.toHaveBeenCalled();
    expect(sb.storage.remove).not.toHaveBeenCalled();
  });

  it('restores the previous row when the upload itself fails', async () => {
    nextFrom({ data: existing, error: null });
    nextFrom({ data: [], error: null });
    nextFrom({ data: { ...existing, sha256: sha }, error: null });
    const restore = nextFrom({ data: null, error: null });
    sb.storage.upload.mockResolvedValueOnce({ data: null, error: new Error('Payload too large') });
    await expect(uploadProof('l1', file)).rejects.toThrow('Payload too large');
    expect(restore.find((c) => c.method === 'upsert')?.args[0]).toMatchObject({ path: 'u1/l1.pdf', sha256: existing.sha256 });
    expect(sb.storage.remove).not.toHaveBeenCalled();
  });
});
