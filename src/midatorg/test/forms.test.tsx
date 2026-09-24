import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import { I18nProvider, hasKey } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type { EventRow, Listing, MarketEvent, Profile, TicketRequest } from '../lib/types';
import { MAX_PROOF_BYTES } from '../lib/constants';

// ---------------------------------------------------------------------------
// Mocks (hoisted): supabase, auth, the api modules the forms reach, sonner
// ---------------------------------------------------------------------------
const { authState, toastMock } = vi.hoisted(() => ({
  authState: { current: null as unknown },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return { supabase: makeSupabaseMock(), requireUid: () => Promise.resolve('u1'), PROOF_BUCKET: 'p', AVATAR_BUCKET: 'a' };
});

vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return { ...actual, useAuth: () => authState.current as AuthContextValue };
});

vi.mock('../lib/api/events', () => ({
  searchEvents: vi.fn(),
  getMarketEvent: vi.fn(),
  createManualEvent: vi.fn(),
  listMarketEvents: vi.fn(),
  listPriceSnapshots: vi.fn(),
  listCompletedDealPrices: vi.fn(),
  listVenues: vi.fn(),
}));

vi.mock('../lib/api/listings', () => ({
  createListing: vi.fn(),
  uploadProof: vi.fn(),
  listEventListings: vi.fn(),
  updateListing: vi.fn(),
  cancelListing: vi.fn(),
  listMyListings: vi.fn(),
  listUserListings: vi.fn(),
  getProofSignedUrl: vi.fn(),
  getMyProof: vi.fn(),
}));

vi.mock('../lib/api/requests', () => ({
  createRequest: vi.fn(),
  listEventRequests: vi.fn(),
  updateRequest: vi.fn(),
  cancelRequest: vi.fn(),
  listMyRequests: vi.fn(),
}));

vi.mock('../lib/api/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/admin')>();
  return { ...actual, getSettings: vi.fn(() => Promise.resolve([])) };
});

vi.mock('sonner', () => ({ toast: toastMock }));

import * as eventsApi from '../lib/api/events';
import * as listingsApi from '../lib/api/listings';
import * as requestsApi from '../lib/api/requests';
import { EventPicker } from '../components/forms/EventPicker';
import { ListingForm } from '../components/forms/ListingForm';
import { RequestForm } from '../components/forms/RequestForm';
import { PriceInput } from '../components/forms/PriceInput';
import { QuantityInput } from '../components/forms/QuantityInput';
import { ProofUpload } from '../components/forms/ProofUpload';
import SellPage from '../pages/SellPage';
import WantPage from '../pages/WantPage';
import {
  caretAfterDigits,
  eventRowToMarketEvent,
  faceValueRange,
  formatFileSize,
  formatIskInput,
  hashFile,
  listingSchema,
  manualEventSchema,
  normalizeTixUrl,
  parseIsk,
  requestSchema,
  shortHash,
  toStartsAtIso,
  validateProofFile,
} from '../components/forms/schemas';

const searchEvents = vi.mocked(eventsApi.searchEvents);
const getMarketEvent = vi.mocked(eventsApi.getMarketEvent);
const createManualEvent = vi.mocked(eventsApi.createManualEvent);
const createListing = vi.mocked(listingsApi.createListing);
const uploadProof = vi.mocked(listingsApi.uploadProof);
const createRequest = vi.mocked(requestsApi.createRequest);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const profile: Profile = {
  id: 'u1',
  display_name: 'Guðrún Jóns',
  avatar_url: null,
  bio: null,
  verification: 'phone',
  phone_verified_at: null,
  role: 'user',
  banned_at: null,
  ban_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const noop = async () => undefined;
function auth(partial: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: { id: 'u1' } as AuthContextValue['user'],
    profile,
    isAdmin: false,
    isBanned: false,
    loading: false,
    signIn: noop,
    signUp: async () => ({ needsConfirmation: false, user: null }),
    signOut: noop,
    sendMagicLink: noop,
    resetPassword: noop,
    updatePassword: noop,
    startPhoneVerification: noop,
    verifyPhone: noop,
    pendingPhone: null,
    refreshProfile: async () => null,
    ...partial,
  };
}

const eventRow: EventRow = {
  id: 'e1',
  title: 'Sigur Rós',
  description: null,
  category: 'tonleikar',
  venue_id: null,
  venue_name: 'Harpa',
  city: 'Reykjavík',
  starts_at: '2030-11-14T20:00:00Z',
  image_url: null,
  tix_url: null,
  tix_event_id: null,
  face_value_min: 8900,
  face_value_max: 12900,
  status: 'upcoming',
  source: 'seed',
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const event: MarketEvent = eventRowToMarketEvent(eventRow);
const event2: MarketEvent = { ...event, id: 'e2', title: 'Jólatónleikar í Hörpu', face_value_min: 7900, face_value_max: 7900 };

const listing: Listing = {
  id: 'l1',
  seller_id: 'u1',
  event_id: 'e1',
  quantity: 2,
  quantity_remaining: 2,
  ticket_type: null,
  seat_info: null,
  face_value: 10000,
  asking_price: 9000,
  split_allowed: true,
  notes: null,
  status: 'active',
  expires_at: '2030-11-14T20:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const request: TicketRequest = {
  id: 'r1',
  buyer_id: 'u1',
  event_id: 'e1',
  quantity: 2,
  max_price: 5000,
  notes: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const pdfFile = () => new File([new Uint8Array([1, 2, 3])], 'midi.pdf', { type: 'application/pdf' });
/** sha256 of bytes 01 02 03 */
const PDF_SHA_SHORT = '039058c6';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function wrap(ui: ReactNode, path = '/midatorg/selja') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">
          <Routes>
            <Route
              path="/midatorg/*"
              element={
                <>
                  {ui}
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const typeInto = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

beforeAll(() => {
  // cmdk needs both in jsdom
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  authState.current = auth();
  vi.clearAllMocks();
  getMarketEvent.mockResolvedValue(event);
  searchEvents.mockResolvedValue([event, event2]);
  createListing.mockResolvedValue(listing);
  uploadProof.mockResolvedValue({ listing_id: 'l1', seller_id: 'u1', path: 'u1/l1.pdf', sha256: 'x', created_at: '' });
  createRequest.mockResolvedValue(request);
  createManualEvent.mockResolvedValue({ ...eventRow, id: 'e9', title: 'Nýr viðburður', source: 'manual', face_value_min: null, face_value_max: null });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------
describe('listingSchema', () => {
  const valid = {
    event_id: 'e1',
    quantity: 2,
    ticket_type: ' Svalir A ',
    seat_info: '',
    face_value: 10000,
    asking_price: 9000,
    split_allowed: true,
    notes: '',
  };

  it('accepts a valid listing and trims text', () => {
    const out = listingSchema.parse(valid);
    expect(out.ticket_type).toBe('Svalir A');
    expect(out.asking_price).toBe(9000);
  });

  it('rejects an asking price above face value on the asking_price path', () => {
    const res = listingSchema.safeParse({ ...valid, asking_price: 10001 });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === 'asking_price');
      expect(issue?.message).toBe('forms.error.aboveFace');
    }
  });

  it('allows asking price equal to face value', () => {
    expect(listingSchema.safeParse({ ...valid, asking_price: 10000 }).success).toBe(true);
  });

  it('requires an event, prices and a quantity within 1–10', () => {
    const res = listingSchema.safeParse({ ...valid, event_id: '', quantity: 11, face_value: null, asking_price: null });
    expect(res.success).toBe(false);
    if (!res.success) {
      const byPath = Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message]));
      expect(byPath.event_id).toBe('forms.error.eventRequired');
      expect(byPath.quantity).toBe('forms.error.quantityRange');
      expect(byPath.face_value).toBe('forms.error.faceValueRequired');
      expect(byPath.asking_price).toBe('forms.error.askingRequired');
    }
    expect(listingSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, quantity: 2.5 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, asking_price: 0 }).success).toBe(false);
  });

  it('caps text lengths', () => {
    expect(listingSchema.safeParse({ ...valid, ticket_type: 'x'.repeat(61) }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, seat_info: 'x'.repeat(121) }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, notes: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('requestSchema', () => {
  const valid = { event_id: 'e1', quantity: 1, max_price: null, face_cap: 12900, notes: '' };

  it('accepts an optional max price under the face value cap', () => {
    expect(requestSchema.safeParse(valid).success).toBe(true);
    expect(requestSchema.safeParse({ ...valid, max_price: 12900 }).success).toBe(true);
    expect(requestSchema.safeParse({ ...valid, max_price: 500, face_cap: null }).success).toBe(true);
  });

  it('rejects a max price above the known face value', () => {
    const res = requestSchema.safeParse({ ...valid, max_price: 13000 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toBe('forms.error.maxPriceAboveFace');
  });

  it('rejects notes over 300 characters and a zero max price', () => {
    expect(requestSchema.safeParse({ ...valid, notes: 'x'.repeat(301) }).success).toBe(false);
    expect(requestSchema.safeParse({ ...valid, max_price: 0 }).success).toBe(false);
  });
});

describe('manualEventSchema', () => {
  const valid = {
    title: 'Sigur Rós í Hörpu',
    category: 'tonleikar',
    venue_name: 'Harpa',
    city: 'Reykjavík',
    date: '2030-11-14',
    time: '20:00',
    face_value_min: 8900,
    face_value_max: 12900,
    tix_url: '',
  };

  it('accepts a future event', () => {
    expect(manualEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a past date, a bad title and an inverted face value range', () => {
    const res = manualEventSchema.safeParse({ ...valid, title: 'x', date: '2020-01-01', face_value_min: 20000 });
    expect(res.success).toBe(false);
    if (!res.success) {
      const byPath = Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message]));
      expect(byPath.title).toBe('forms.error.titleRequired');
      expect(byPath.date).toBe('forms.error.dateInPast');
      expect(byPath.face_value_min).toBe('forms.error.faceRange');
    }
  });

  it('requires date and time and validates the tix.is link', () => {
    const res = manualEventSchema.safeParse({ ...valid, date: '', time: '', tix_url: 'https://example.com/e/1' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const byPath = Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message]));
      expect(byPath.date).toBe('forms.error.dateRequired');
      expect(byPath.time).toBe('forms.error.timeRequired');
      expect(byPath.tix_url).toBe('forms.error.tixUrl');
    }
    expect(manualEventSchema.safeParse({ ...valid, tix_url: 'tix.is/is/event/41207/' }).success).toBe(true);
  });
});

describe('helpers', () => {
  it('parseIsk / formatIskInput round-trip with thousands separators', () => {
    expect(parseIsk('8.900')).toBe(8900);
    expect(parseIsk('8 900 kr.')).toBe(8900);
    expect(parseIsk('abc')).toBeNull();
    expect(parseIsk('')).toBeNull();
    expect(parseIsk('007')).toBe(7);
    expect(parseIsk('9999999999999')).toBe(999_999_999);
    expect(formatIskInput(8900)).toBe('8.900');
    expect(formatIskInput(1234567)).toBe('1.234.567');
    expect(formatIskInput(null)).toBe('');
  });

  it('caretAfterDigits keeps the caret after the same digit count', () => {
    expect(caretAfterDigits('8.900', 1)).toBe(1);
    expect(caretAfterDigits('8.900', 2)).toBe(3);
    expect(caretAfterDigits('8.900', 9)).toBe(5);
    expect(caretAfterDigits('8.900', 0)).toBe(0);
  });

  it('toStartsAtIso builds a local timestamp and normalizeTixUrl canonicalises', () => {
    const iso = toStartsAtIso('2030-11-14', '20:00');
    expect(iso).not.toBeNull();
    expect(new Date(iso as string).getFullYear()).toBe(2030);
    expect(toStartsAtIso('nope', '20:00')).toBeNull();
    expect(normalizeTixUrl('tix.is/is/event/41207/')).toBe('https://tix.is/is/event/41207/');
    expect(normalizeTixUrl('http://www.tix.is/x')).toBe('https://www.tix.is/x');
    expect(normalizeTixUrl('https://evil.com/tix.is')).toBeNull();
    expect(normalizeTixUrl('')).toBeNull();
  });

  it('validateProofFile checks type and size', () => {
    expect(validateProofFile(pdfFile())).toBeNull();
    expect(validateProofFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateProofFile(new File(['x'], 'a.jpg', { type: '' }))).toBeNull();
    expect(validateProofFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe('FILE_TYPE_NOT_ALLOWED');
    const big = pdfFile();
    Object.defineProperty(big, 'size', { value: MAX_PROOF_BYTES + 1 });
    expect(validateProofFile(big)).toBe('FILE_TOO_LARGE');
  });

  it('hashFile / shortHash / formatFileSize', async () => {
    const sha = await hashFile(pdfFile());
    expect(sha).toHaveLength(64);
    expect(shortHash(sha)).toBe(PDF_SHA_SHORT);
    expect(formatFileSize(512, 'is')).toBe('512 B');
    expect(formatFileSize(1536, 'is')).toBe('1,5 KB');
    expect(formatFileSize(1536, 'en')).toBe('1.5 KB');
    expect(formatFileSize(5 * 1024 * 1024, 'is')).toBe('5,0 MB');
  });

  it('eventRowToMarketEvent zeroes stats and faceValueRange formats', () => {
    expect(event.tickets_available).toBe(0);
    expect(event.min_ask).toBeNull();
    expect(faceValueRange(event)).toBe('8.900–12.900 kr.');
    expect(faceValueRange(event2)).toBe('7.900 kr.');
    expect(faceValueRange({ face_value_min: null, face_value_max: null })).toBeNull();
  });

  it('every validation key used by the schemas exists in the dictionary', () => {
    const keys = [
      'forms.error.eventRequired',
      'forms.error.quantityRange',
      'forms.error.faceValueRequired',
      'forms.error.askingRequired',
      'forms.error.pricePositive',
      'forms.error.priceNonNegative',
      'forms.error.aboveFace',
      'forms.error.maxPriceAboveFace',
      'forms.error.ticketTypeLong',
      'forms.error.seatInfoLong',
      'forms.error.notesLong',
      'forms.error.requestNotesLong',
      'forms.error.titleRequired',
      'forms.error.titleLong',
      'forms.error.venueLong',
      'forms.error.cityLong',
      'forms.error.dateRequired',
      'forms.error.timeRequired',
      'forms.error.dateInPast',
      'forms.error.faceRange',
      'forms.error.tixUrl',
    ];
    for (const k of keys) {
      expect(hasKey(k, 'is'), k).toBe(true);
      expect(hasKey(k, 'en'), k).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
function PriceHarness({ onChange }: { onChange: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <PriceInput
      id="p"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('PriceInput', () => {
  it('formats with thousands separators while typing and stores integers', () => {
    const onChange = vi.fn();
    wrap(<PriceHarness onChange={onChange} />);
    const input = document.getElementById('p') as HTMLInputElement;
    typeInto(input, '8900');
    expect(input.value).toBe('8.900');
    expect(onChange).toHaveBeenLastCalledWith(8900);
    typeInto(input, '8.9001');
    expect(input.value).toBe('89.001');
    expect(onChange).toHaveBeenLastCalledWith(89001);
    typeInto(input, '12abc');
    expect(input.value).toBe('12');
    typeInto(input, '');
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
});

function QuantityHarness({ onChange, initial = 1 }: { onChange: (v: number) => void; initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <QuantityInput
      id="q"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('QuantityInput', () => {
  it('steps within 1–10 with real buttons', () => {
    const onChange = vi.fn();
    wrap(<QuantityHarness onChange={onChange} />);
    const minus = screen.getByRole('button', { name: 'Fækka miðum' });
    const plus = screen.getByRole('button', { name: 'Fjölga miðum' });
    expect(minus).toBeDisabled();
    fireEvent.click(plus);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(minus).not.toBeDisabled();
    const input = document.getElementById('q') as HTMLInputElement;
    typeInto(input, '10');
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(plus).toBeDisabled();
    typeInto(input, '99');
    fireEvent.blur(input);
    expect(input.value).toBe('10');
  });
});

describe('ProofUpload', () => {
  it('accepts a PDF via the input and shows the name and fingerprint', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [file, setFile] = useState<File | null>(null);
      return (
        <ProofUpload
          id="proof"
          file={file}
          onChange={(f) => {
            setFile(f);
            onChange(f);
          }}
        />
      );
    }
    wrap(<Harness />);
    const file = pdfFile();
    fireEvent.change(screen.getByLabelText('Miðaskjal'), { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
    expect(await screen.findByText('midi.pdf')).toBeInTheDocument();
    expect(await screen.findByText(PDF_SHA_SHORT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fjarlægja skrá' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('proof-dropzone')).toBeInTheDocument();
  });

  it('rejects wrong types and oversized files with translated messages', () => {
    const onChange = vi.fn();
    wrap(<ProofUpload id="proof" file={null} onChange={onChange} />);
    const input = screen.getByLabelText('Miðaskjal');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(screen.getByText('Aðeins PDF, PNG og JPG skrár eru leyfðar.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
    const big = pdfFile();
    Object.defineProperty(big, 'size', { value: MAX_PROOF_BYTES + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByText('Skráin er of stór (hámark 10 MB).')).toBeInTheDocument();
  });

  it('accepts a dropped file', () => {
    const onChange = vi.fn();
    wrap(<ProofUpload id="proof" file={null} onChange={onChange} />);
    const file = pdfFile();
    fireEvent.drop(screen.getByTestId('proof-dropzone'), { dataTransfer: { files: [file], types: ['Files'] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('shows a passed-in error (duplicate proof) as an alert', () => {
    wrap(<ProofUpload id="proof" file={pdfFile()} onChange={() => undefined} error="Sama skrá" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sama skrá');
  });
});

// ---------------------------------------------------------------------------
// EventPicker
// ---------------------------------------------------------------------------
describe('EventPicker', () => {
  it('searches after two characters and shows title · venue · date', async () => {
    const onChange = vi.fn();
    wrap(<EventPicker value={null} onChange={onChange} />);
    const box = screen.getByRole('combobox', { name: 'Viðburður' });
    expect(screen.getByText('Sláðu inn að minnsta kosti tvo stafi til að leita.')).toBeInTheDocument();
    typeInto(box, 'sig');
    expect(await screen.findByText('Sigur Rós')).toBeInTheDocument();
    expect(searchEvents).toHaveBeenCalledWith('sig', 10);
    expect(screen.getAllByText(/Harpa · fim\. 14\. nóv\. · \d\d:00/)).toHaveLength(2);
    fireEvent.click(screen.getByText('Sigur Rós'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('renders the selected event with a change button', () => {
    const onChange = vi.fn();
    wrap(<EventPicker value={event} onChange={onChange} />);
    expect(screen.getByTestId('event-picker-selected')).toHaveTextContent('Sigur Rós');
    expect(screen.getByText('Miðaverð skv. tix.is: 8.900–12.900 kr.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Breyta' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('preselects ?event=<id> through getMarketEvent', async () => {
    const onChange = vi.fn();
    wrap(<EventPicker value={null} onChange={onChange} preselectId="e1" />);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' })));
    expect(getMarketEvent).toHaveBeenCalledWith('e1');
  });

  it('explains a missing preselected event and keeps the search usable', async () => {
    getMarketEvent.mockResolvedValue(null);
    wrap(<EventPicker value={null} onChange={vi.fn()} preselectId="nope" />);
    expect(await screen.findByText('Viðburðurinn fannst ekki. Leitaðu að öðrum viðburði.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Viðburður' })).toBeInTheDocument();
  });

  it('shows an error state with retry when the search fails', async () => {
    searchEvents.mockRejectedValueOnce(new Error('Failed to fetch'));
    wrap(<EventPicker value={null} onChange={vi.fn()} />);
    typeInto(screen.getByRole('combobox', { name: 'Viðburður' }), 'sig');
    expect(await screen.findByText('Náði ekki að sækja viðburði.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByText('Sigur Rós')).toBeInTheDocument();
  });

  it('offers the inline manual event form when nothing is found and selects the created event', async () => {
    searchEvents.mockResolvedValue([]);
    const onChange = vi.fn();
    wrap(<EventPicker value={null} onChange={onChange} />);
    typeInto(screen.getByRole('combobox', { name: 'Viðburður' }), 'Nýr viðburður');
    expect(await screen.findByText('Ekkert fannst fyrir „Nýr viðburður“')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Bæta við viðburði' })[0]);
    const title = (await screen.findByLabelText('Heiti viðburðar')) as HTMLInputElement;
    expect(title.value).toBe('Nýr viðburður');
    typeInto(screen.getByLabelText('Dagsetning'), '2030-11-14');
    typeInto(screen.getByLabelText('Tími'), '20:00');
    typeInto(screen.getByLabelText(/Staður/), 'Harpa');
    typeInto(screen.getByLabelText(/Tengill á tix.is/), 'tix.is/is/event/1/');
    fireEvent.click(screen.getByRole('button', { name: 'Vista viðburð' }));
    await waitFor(() =>
      expect(createManualEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nýr viðburður',
          category: 'tonleikar',
          venue_name: 'Harpa',
          city: null,
          tix_url: 'https://tix.is/is/event/1/',
          face_value_min: null,
        }),
      ),
    );
    const call = createManualEvent.mock.calls[0][0];
    expect(new Date(call.starts_at).getFullYear()).toBe(2030);
    expect(toastMock.success).toHaveBeenCalledWith('Viðburðinum hefur verið bætt við.');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'e9', title: 'Nýr viðburður', tickets_available: 0 }));
  });

  it('validates the manual form inline and cancels back to search', async () => {
    searchEvents.mockResolvedValue([]);
    wrap(<EventPicker value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bæta við viðburði' }));
    await screen.findByLabelText('Heiti viðburðar');
    typeInto(screen.getByLabelText('Dagsetning'), '2020-01-01');
    fireEvent.click(screen.getByRole('button', { name: 'Vista viðburð' }));
    expect(await screen.findByText('Sláðu inn heiti viðburðar (a.m.k. 2 stafir).')).toBeInTheDocument();
    expect(screen.getByText('Viðburðurinn þarf að vera í framtíðinni.')).toBeInTheDocument();
    expect(createManualEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hætta við' }));
    expect(screen.getByRole('combobox', { name: 'Viðburður' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ListingForm / SellPage
// ---------------------------------------------------------------------------
describe('ListingForm', () => {
  const fillPrices = (face: string, asking: string) => {
    typeInto(screen.getByLabelText('Miðaverð (á miða)'), face);
    typeInto(screen.getByLabelText('Söluverð (á miða)'), asking);
  };

  it('creates a listing, toasts and navigates to the event page', async () => {
    wrap(<SellPage />, '/midatorg/selja?event=e1');
    expect(await screen.findByTestId('event-picker-selected')).toHaveTextContent('Sigur Rós');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Selja miða');
    fireEvent.click(screen.getByRole('button', { name: 'Fjölga miðum' }));
    typeInto(screen.getByLabelText(/Tegund miða/), 'Svalir A');
    fillPrices('10000', '9000');
    expect(screen.getByText('−10%')).toBeInTheDocument();
    expect(screen.getByText('undir miðaverði')).toBeInTheDocument();
    expect(screen.getByText('2 miðar á 9.000 kr. hver · samtals 18.000 kr.')).toBeInTheDocument();
    expect(screen.getByText('Miðaverð er 10.000 kr. — hærra verð er ekki leyft.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    await waitFor(() =>
      expect(createListing).toHaveBeenCalledWith({
        event_id: 'e1',
        quantity: 2,
        face_value: 10000,
        asking_price: 9000,
        ticket_type: 'Svalir A',
        seat_info: null,
        notes: null,
        split_allowed: true,
      }),
    );
    expect(uploadProof).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidburdir/e1'));
    expect(toastMock.success).toHaveBeenCalledWith('Miðarnir eru komnir í sölu.');
  });

  it('blocks an asking price above face value client-side', async () => {
    wrap(<ListingForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fillPrices('10000', '12000');
    expect(screen.getByText('Verð má ekki vera hærra en miðaverð.')).toBeInTheDocument();
    expect(screen.getByText('+20%')).toBeInTheDocument();
    expect(screen.getByLabelText('Söluverð (á miða)')).toHaveAttribute('aria-invalid', 'true');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    });
    expect(createListing).not.toHaveBeenCalled();
    typeInto(screen.getByLabelText('Söluverð (á miða)'), '10000');
    await waitFor(() => expect(screen.queryByText('Verð má ekki vera hærra en miðaverð.')).not.toBeInTheDocument());
    expect(screen.getByText('á miðaverði')).toBeInTheDocument();
  });

  it('requires an event and shows the picker error', async () => {
    getMarketEvent.mockResolvedValue(null);
    wrap(<ListingForm />);
    fillPrices('10000', '9000');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    });
    expect(await screen.findByText('Veldu viðburð.')).toBeInTheDocument();
    expect(createListing).not.toHaveBeenCalled();
  });

  it('maps the server PRICE_ABOVE_FACE_VALUE error onto the asking price field', async () => {
    createListing.mockRejectedValueOnce({
      code: '23514',
      message: 'new row for relation "mt_listings" violates check constraint "mt_listings_price_cap"',
    });
    wrap(<ListingForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fillPrices('10000', '9000');
    fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    expect(await screen.findByText('Verð má ekki vera hærra en miðaverð.')).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalledWith('Verð má ekki vera hærra en miðaverð.', undefined);
    expect(screen.getByRole('button', { name: 'Skrá miða til sölu' })).not.toBeDisabled();
  });

  it('uploads the proof after the listing is created', async () => {
    wrap(<ListingForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fillPrices('10000', '9000');
    const file = pdfFile();
    fireEvent.change(screen.getByLabelText('Miðaskjal'), { target: { files: [file] } });
    expect(await screen.findByText(PDF_SHA_SHORT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    await waitFor(() => expect(uploadProof).toHaveBeenCalledWith('l1', file));
    expect(createListing.mock.invocationCallOrder[0]).toBeLessThan(uploadProof.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidburdir/e1'));
  });

  it('explains DUPLICATE_PROOF without creating the listing twice', async () => {
    uploadProof.mockRejectedValueOnce(new Error('DUPLICATE_PROOF'));
    wrap(<ListingForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fillPrices('10000', '9000');
    fireEvent.change(screen.getByLabelText('Miðaskjal'), { target: { files: [pdfFile()] } });
    await screen.findByText('midi.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    expect(await screen.findByTestId('proof-recovery')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Þessi skrá hefur þegar verið notuð fyrir aðra miða á Miðatorgi.');
    expect(createListing).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/selja');

    // retry with another file re-uses the created listing id
    fireEvent.click(screen.getByRole('button', { name: 'Fjarlægja skrá' }));
    const other = new File([new Uint8Array([9, 9])], 'annar.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Miðaskjal'), { target: { files: [other] } });
    fireEvent.click(screen.getByRole('button', { name: 'Reyna aftur' }));
    await waitFor(() => expect(uploadProof).toHaveBeenLastCalledWith('l1', other));
    expect(createListing).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidburdir/e1'));
  });

  it('lets the seller continue without the proof after a failed upload', async () => {
    uploadProof.mockRejectedValueOnce(new Error('Failed to fetch'));
    wrap(<ListingForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fillPrices('10000', '9000');
    fireEvent.change(screen.getByLabelText('Miðaskjal'), { target: { files: [pdfFile()] } });
    await screen.findByText('midi.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Skrá miða til sölu' }));
    await screen.findByTestId('proof-recovery');
    fireEvent.click(screen.getByRole('button', { name: 'Halda áfram án skráar' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidburdir/e1'));
    expect(toastMock.success).toHaveBeenCalledWith('Miðarnir eru komnir í sölu.');
  });

  it('prefills a single known face value and toggles the split switch copy', async () => {
    getMarketEvent.mockResolvedValue(event2);
    wrap(<ListingForm preselectEventId="e2" />);
    await screen.findByTestId('event-picker-selected');
    expect((screen.getByLabelText('Miðaverð (á miða)') as HTMLInputElement).value).toBe('7.900');
    expect(screen.getByText('Kaupendur mega taka færri miða en allan fjöldann.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Má selja sitt í hvoru lagi' }));
    expect(screen.getByText('Miðarnir seljast aðeins allir saman.')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RequestForm / WantPage
// ---------------------------------------------------------------------------
describe('RequestForm', () => {
  it('creates a request, toasts and navigates to the event page', async () => {
    wrap(<WantPage />, '/midatorg/oska?event=e1');
    expect(await screen.findByTestId('event-picker-selected')).toHaveTextContent('Sigur Rós');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ég vil kaupa');
    fireEvent.click(screen.getByRole('button', { name: 'Fjölga miðum' }));
    typeInto(screen.getByLabelText(/Hámarksverð/), '5000');
    typeInto(screen.getByLabelText(/Athugasemd/), ' Helst saman ');
    expect(screen.getByText(/Enginn getur selt yfir miðaverði \(12\.900 kr\.\)\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skrá ósk' }));
    await waitFor(() =>
      expect(createRequest).toHaveBeenCalledWith({ event_id: 'e1', quantity: 2, max_price: 5000, notes: 'Helst saman' }),
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidburdir/e1'));
    expect(toastMock.success).toHaveBeenCalledWith('Óskin þín er skráð.');
  });

  it('rejects a max price above the event face value', async () => {
    wrap(<RequestForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    typeInto(screen.getByLabelText(/Hámarksverð/), '15000');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skrá ósk' }));
    });
    expect(await screen.findByText('Hámarksverð má ekki vera hærra en miðaverð.')).toBeInTheDocument();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('handles REQUEST_EXISTS with an inline notice and links', async () => {
    createRequest.mockRejectedValueOnce(new Error('REQUEST_EXISTS'));
    wrap(<RequestForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fireEvent.click(screen.getByRole('button', { name: 'Skrá ósk' }));
    expect(await screen.findByText('Þú ert nú þegar með ósk fyrir þennan viðburð')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða viðburð' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(screen.getByRole('link', { name: 'Skoða mínar óskir' })).toHaveAttribute('href', '/midatorg/eg');
    expect(toastMock.error).toHaveBeenCalledWith('Þú ert nú þegar með ósk fyrir þennan viðburð.', undefined);
    expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/selja');
    expect(screen.getByRole('button', { name: 'Skrá ósk' })).not.toBeDisabled();
  });

  it('submits without a max price when left empty', async () => {
    wrap(<RequestForm preselectEventId="e1" />);
    await screen.findByTestId('event-picker-selected');
    fireEvent.click(screen.getByRole('button', { name: 'Skrá ósk' }));
    await waitFor(() =>
      expect(createRequest).toHaveBeenCalledWith({ event_id: 'e1', quantity: 1, max_price: null, notes: null }),
    );
  });
});
