import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type { Alert, Deal, ListingWithSeller, MarketEvent, PriceSnapshot, PublicProfile, RequestWithBuyer } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks: no network. supabase is a chainable stub, the api modules return fixtures.
// ---------------------------------------------------------------------------
const { authState, api } = vi.hoisted(() => ({
  authState: { current: null as unknown },
  api: {
    getMarketEvent: vi.fn(),
    listPriceSnapshots: vi.fn(),
    listCompletedDealPrices: vi.fn(),
    listEventListings: vi.fn(),
    listEventRequests: vi.fn(),
    reserveListing: vi.fn(),
    getMyAlert: vi.fn(),
    upsertAlert: vi.fn(),
    removeAlert: vi.fn(),
    getSettings: vi.fn(),
  },
}));

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return { supabase: makeSupabaseMock(), requireUid: () => Promise.resolve('u1'), PROOF_BUCKET: 'p', AVATAR_BUCKET: 'a' };
});

vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return { ...actual, useAuth: () => authState.current as AuthContextValue };
});

vi.mock('../lib/api/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/events')>();
  return {
    ...actual,
    getMarketEvent: api.getMarketEvent,
    listPriceSnapshots: api.listPriceSnapshots,
    listCompletedDealPrices: api.listCompletedDealPrices,
  };
});
vi.mock('../lib/api/listings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/listings')>();
  return { ...actual, listEventListings: api.listEventListings };
});
vi.mock('../lib/api/requests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/requests')>();
  return { ...actual, listEventRequests: api.listEventRequests };
});
vi.mock('../lib/api/deals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/deals')>();
  return { ...actual, reserveListing: api.reserveListing };
});
vi.mock('../lib/api/alerts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/alerts')>();
  return { ...actual, getMyAlert: api.getMyAlert, upsertAlert: api.upsertAlert, removeAlert: api.removeAlert };
});
vi.mock('../lib/api/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/admin')>();
  return { ...actual, getSettings: api.getSettings };
});

import {
  chartYDomain,
  clampQuantity,
  cumulativeDepth,
  eventFaceValue,
  filterByRange,
  isEventOpen,
  isNewListing,
  pickTicks,
  priceChange,
  reservationMinutes,
  toChartPoints,
} from '../components/event/eventUtils';
import { StatTile } from '../components/event/StatTile';
import { StatsRow } from '../components/event/StatsRow';
import { EventHeader } from '../components/event/EventHeader';
import { OrderBook } from '../components/event/OrderBook';
import { PriceChart } from '../components/event/PriceChart';
import { BuyDialog } from '../components/event/BuyDialog';
import { AlertButton } from '../components/event/AlertButton';
import { HowItWorks } from '../components/event/HowItWorks';
import EventPage from '../pages/EventPage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const NOW = new Date('2026-09-23T12:00:00Z');

function profile(over: Partial<PublicProfile> & { id: string; display_name: string }): PublicProfile {
  return {
    avatar_url: null,
    bio: null,
    verification: 'none',
    created_at: '2026-01-01T00:00:00Z',
    is_banned: false,
    rating_avg: 0,
    rating_count: 0,
    sales_count: 0,
    purchases_count: 0,
    ...over,
  };
}

const gudrun = profile({ id: 'u-gudrun', display_name: 'Guðrún H.', verification: 'phone', rating_avg: 4.87, rating_count: 12 });
const olafur = profile({ id: 'u-olafur', display_name: 'Ólafur K.', rating_avg: 4.7, rating_count: 5 });
const anna = profile({ id: 'u-anna', display_name: 'Anna Lísa', verification: 'eid', rating_avg: 5, rating_count: 8 });
const elin = profile({ id: 'u-elin', display_name: 'Elín M.' });

const event: MarketEvent = {
  id: 'ev-1',
  tix_event_id: '123',
  title: 'Sinfóníuhljómsveit Íslands: Vínartónleikar',
  description: 'Valsar og polkar.',
  category: 'tonleikar',
  venue_id: null,
  venue_name: 'Harpa – Eldborg',
  city: 'Reykjavík',
  starts_at: '2027-01-08T19:30:00Z',
  image_url: null,
  tix_url: 'https://tix.is/is/event/123/',
  face_value_min: 11900,
  face_value_max: 11900,
  status: 'upcoming',
  source: 'tix',
  created_by: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  tickets_available: 3,
  listings_active: 2,
  min_ask: 9900,
  avg_ask: 10200,
  requests_active: 2,
  wanted_tickets: 4,
  max_bid: 11900,
  sold_count: 15,
  last_sold_price: 9900,
  last_sold_at: '2026-09-20T14:02:00Z',
};

function listing(over: Partial<ListingWithSeller> & { id: string; seller: PublicProfile }): ListingWithSeller {
  return {
    event_id: 'ev-1',
    seller_id: over.seller.id,
    quantity: 2,
    quantity_remaining: 2,
    ticket_type: 'Svalir A',
    seat_info: 'röð 3',
    face_value: 11900,
    asking_price: 9900,
    split_allowed: true,
    notes: null,
    status: 'active',
    expires_at: '2027-01-08T19:30:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

const listings: ListingWithSeller[] = [
  listing({ id: 'l-1', seller: gudrun, asking_price: 9900, quantity_remaining: 2 }),
  listing({ id: 'l-2', seller: olafur, asking_price: 10500, quantity: 1, quantity_remaining: 1, ticket_type: 'Salur', seat_info: 'röð 12', split_allowed: false }),
];

function request(over: Partial<RequestWithBuyer> & { id: string; buyer: PublicProfile }): RequestWithBuyer {
  return {
    event_id: 'ev-1',
    buyer_id: over.buyer.id,
    quantity: 2,
    max_price: 11900,
    notes: null,
    status: 'active',
    created_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    ...over,
  };
}

const requests: RequestWithBuyer[] = [
  request({ id: 'r-1', buyer: anna, max_price: 11900, quantity: 2, notes: 'hvaða sæti sem er' }),
  request({ id: 'r-2', buyer: elin, max_price: null, quantity: 2 }),
];

function snapshot(date: string, min: number | null, avg: number | null = min): PriceSnapshot {
  return { id: `s-${date}`, event_id: 'ev-1', captured_at: date, min_ask: min, avg_ask: avg, max_bid: null, listings_count: 4, requests_count: 6 };
}

const snapshots: PriceSnapshot[] = [
  snapshot('2026-08-25', 11900),
  snapshot('2026-09-01', 11200),
  snapshot('2026-09-08', 10900),
  snapshot('2026-09-15', 10400),
  snapshot('2026-09-22', 9900),
];

const noop = async () => undefined;
function auth(partial: Partial<AuthContextValue>): AuthContextValue {
  return {
    session: null,
    user: null,
    profile: null,
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
const signedIn = () => auth({ user: { id: 'u1', email: 'x@y.is' } as AuthContextValue['user'], session: {} as AuthContextValue['session'] });

function LocationProbe() {
  const loc = useLocation();
  return <p data-testid="location">{loc.pathname + loc.search}</p>;
}

function wrap(ui: ReactNode, path = '/midatorg/vidburdir/ev-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">
          <Routes>
            <Route path="/midatorg/vidburdir/:eventId" element={<>{ui}<LocationProbe /></>} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

beforeAll(() => {
  // Recharts' ResponsiveContainer and Radix popper need ResizeObserver; jsdom has none.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
  vi.setSystemTime(NOW);
});

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = auth({});
  setMatchMedia(true);
  api.getMarketEvent.mockResolvedValue(event);
  api.listPriceSnapshots.mockResolvedValue(snapshots);
  api.listCompletedDealPrices.mockResolvedValue([{ price: 9900, at: '2026-09-20T14:02:00Z' }]);
  api.listEventListings.mockResolvedValue(listings);
  api.listEventRequests.mockResolvedValue(requests);
  api.getMyAlert.mockResolvedValue(null);
  api.getSettings.mockResolvedValue([{ key: 'reservation_minutes', value: 30, updated_at: '' }]);
});

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------
describe('eventUtils', () => {
  it('eventFaceValue prefers the upper face value', () => {
    expect(eventFaceValue({ face_value_min: 8900, face_value_max: 11900 })).toBe(11900);
    expect(eventFaceValue({ face_value_min: 8900, face_value_max: null })).toBe(8900);
    expect(eventFaceValue({ face_value_min: null, face_value_max: null })).toBeNull();
    expect(eventFaceValue(null)).toBeNull();
  });

  it('toChartPoints sorts ascending and deduplicates days', () => {
    const pts = toChartPoints([snapshot('2026-09-02', 100), snapshot('2026-09-01', 200), { ...snapshot('2026-09-02', 150), id: 'dup' }]);
    expect(pts.map((p) => p.date)).toEqual(['2026-09-01', '2026-09-02']);
    expect(pts[1].min).toBe(150);
    expect(pts[0].ts).toBeLessThan(pts[1].ts);
  });

  it('filterByRange keeps the last 7 / 30 days or everything', () => {
    const pts = toChartPoints(snapshots);
    expect(filterByRange(pts, 'week', NOW).map((p) => p.date)).toEqual(['2026-09-22']);
    expect(filterByRange(pts, 'month', NOW).map((p) => p.date)).toEqual(['2026-08-25', '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']);
    expect(filterByRange(pts, 'all', NOW)).toHaveLength(5);
  });

  it('chartYDomain follows DESIGN.md and keeps the data inside', () => {
    const pts = toChartPoints(snapshots);
    expect(chartYDomain(pts, 11900)).toEqual([8000, 12500]);
    expect(chartYDomain(toChartPoints([snapshot('2026-09-01', 5000)]), 11900)[0]).toBeLessThanOrEqual(5000);
    const [lo, hi] = chartYDomain(pts, null);
    expect(lo).toBeLessThanOrEqual(9900);
    expect(hi).toBeGreaterThanOrEqual(11900);
    expect(chartYDomain([], null)).toEqual([0, 1000]);
  });

  it('pickTicks spreads ticks over the range and keeps the ends', () => {
    const pts = toChartPoints(snapshots);
    const ticks = pickTicks(pts, 3);
    expect(ticks).toEqual([pts[0].ts, pts[2].ts, pts[4].ts]);
    expect(pickTicks(pts, 10)).toHaveLength(5);
    expect(pickTicks([], 5)).toEqual([]);
  });

  it('priceChange compares the first and last priced points', () => {
    const pts = toChartPoints(snapshots);
    expect(priceChange(pts)).toEqual({ first: 11900, last: 9900, diff: -2000, pct: expect.closeTo(-16.8, 1) });
    expect(priceChange(pts.slice(0, 1))).toBeNull();
    expect(priceChange(toChartPoints([snapshot('2026-09-01', null), snapshot('2026-09-02', 100)]))).toBeNull();
  });

  it('cumulativeDepth returns cumulative percentages', () => {
    expect(cumulativeDepth([2, 1, 2, 2])).toEqual([29, 43, 71, 100]);
    expect(cumulativeDepth([])).toEqual([]);
    expect(cumulativeDepth([0, 0])).toEqual([0, 0]);
  });

  it('clampQuantity respects quantity_remaining and split_allowed', () => {
    expect(clampQuantity(5, { quantity_remaining: 3, split_allowed: true })).toBe(3);
    expect(clampQuantity(0, { quantity_remaining: 3, split_allowed: true })).toBe(1);
    expect(clampQuantity(NaN, { quantity_remaining: 3, split_allowed: true })).toBe(1);
    expect(clampQuantity(1, { quantity_remaining: 3, split_allowed: false })).toBe(3);
    expect(clampQuantity(2.7, { quantity_remaining: 4, split_allowed: true })).toBe(2);
  });

  it('isNewListing, reservationMinutes and isEventOpen', () => {
    expect(isNewListing('2026-09-23T02:00:00Z', NOW.getTime())).toBe(true);
    expect(isNewListing('2026-09-20T02:00:00Z', NOW.getTime())).toBe(false);
    expect(reservationMinutes([{ key: 'reservation_minutes', value: 45, updated_at: '' }])).toBe(45);
    expect(reservationMinutes([{ key: 'reservation_minutes', value: '20', updated_at: '' }])).toBe(20);
    expect(reservationMinutes(undefined)).toBe(30);
    expect(isEventOpen(event, NOW.getTime())).toBe(true);
    expect(isEventOpen({ ...event, status: 'past' }, NOW.getTime())).toBe(false);
    expect(isEventOpen({ ...event, starts_at: '2020-01-01T00:00:00Z' }, NOW.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
describe('StatTile / StatsRow', () => {
  it('shows "—" for a missing value and hides the unit', () => {
    wrap(<StatTile label="Lægsta verð" value={null} unit="kr." sub="engir miðar" />);
    expect(screen.getByTestId('stat-value')).toHaveTextContent('—');
    expect(screen.queryByText('kr.')).not.toBeInTheDocument();
    expect(screen.getByTestId('stat-sub')).toHaveTextContent('engir miðar');
  });

  it('renders the five tiles from the market row', () => {
    wrap(<StatsRow event={event} listings={listings} />);
    const tiles = screen.getAllByTestId('stat-tile');
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveTextContent('Lægsta verð');
    expect(tiles[0]).toHaveTextContent('9.900 kr.');
    expect(tiles[0]).toHaveTextContent('−17%');
    expect(tiles[1]).toHaveTextContent('11.900 kr.');
    expect(tiles[1]).toHaveTextContent('Hámark skv. tix.is');
    expect(tiles[2]).toHaveTextContent('3');
    expect(tiles[2]).toHaveTextContent('frá 2 seljendum');
    expect(tiles[3]).toHaveTextContent('4');
    expect(tiles[3]).toHaveTextContent('hæsta boð 11.900 kr.');
    expect(tiles[4]).toHaveTextContent('15');
    expect(tiles[4]).toHaveTextContent('síðast á 9.900 kr.');
  });

  it('shows dashes for an empty market and a face-value range', () => {
    wrap(
      <StatsRow
        event={{ ...event, min_ask: null, avg_ask: null, tickets_available: 0, listings_active: 0, wanted_tickets: 0, requests_active: 0, max_bid: null, sold_count: 0, last_sold_price: null, face_value_min: 8900, face_value_max: 11900, source: 'manual' }}
      />,
    );
    const tiles = screen.getAllByTestId('stat-tile');
    expect(within(tiles[0]).getByTestId('stat-value')).toHaveTextContent('—');
    expect(tiles[0]).toHaveTextContent('engir miðar til sölu');
    expect(tiles[1]).toHaveTextContent('8.900–11.900 kr.');
    expect(tiles[1]).toHaveTextContent('Hámarksverð á miða');
    expect(tiles[4]).toHaveTextContent('engin sala enn');
  });
});

describe('EventHeader', () => {
  it('renders title, venue, date, tix link, CTAs and the report button', () => {
    const onReport = vi.fn();
    wrap(<EventHeader event={event} onReport={onReport} alertButton={<button type="button">VAKTA</button>} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sinfóníuhljómsveit Íslands: Vínartónleikar');
    expect(screen.getByText('Harpa – Eldborg · Reykjavík')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sjá á tix.is/ })).toHaveAttribute('href', 'https://tix.is/is/event/123/');
    expect(screen.getByRole('link', { name: /Selja miða á þennan viðburð/ })).toHaveAttribute('href', '/midatorg/selja?event=ev-1');
    expect(screen.getByRole('link', { name: 'Ég vil kaupa' })).toHaveAttribute('href', '/midatorg/oska?event=ev-1');
    expect(screen.getByText('VAKTA')).toBeInTheDocument();
    expect(screen.getByText('11.900 kr.')).toBeInTheDocument();
    expect(screen.getByTestId('event-thumb')).toHaveTextContent('SÍ');
    fireEvent.click(screen.getByRole('button', { name: /Tilkynna viðburð/ }));
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('navigation', { name: 'Slóð' })).toHaveTextContent('Tónleikar');
  });

  it('hides the CTAs and explains when the event is past', () => {
    wrap(<EventHeader event={{ ...event, status: 'past' }} onReport={() => undefined} />);
    expect(screen.queryByRole('link', { name: /Selja miða/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Viðburðurinn er liðinn');
    expect(screen.getByText('Liðinn')).toBeInTheDocument();
  });
});

describe('OrderBook', () => {
  it('desktop: two columns with sell and want rows', () => {
    const onBuy = vi.fn();
    authState.current = signedIn();
    wrap(<OrderBook event={event} listings={listings} requests={requests} onBuy={onBuy} currentUserId="u1" />);
    expect(screen.getByRole('heading', { name: 'Skráningar' })).toBeInTheDocument();
    expect(screen.getByText('3 miðar til sölu · 4 vilja kaupa')).toBeInTheDocument();
    const sellRows = screen.getAllByTestId('sell-row');
    expect(sellRows).toHaveLength(2);
    expect(sellRows[0]).toHaveAttribute('data-depth', '67');
    expect(sellRows[1]).toHaveAttribute('data-depth', '100');
    expect(within(sellRows[0]).getByRole('link', { name: 'Guðrún H.' })).toHaveAttribute('href', '/midatorg/notendur/u-gudrun');
    expect(within(sellRows[0]).getByText('Staðfestur')).toBeInTheDocument();
    expect(within(sellRows[0]).getByText('4,9')).toBeInTheDocument();
    expect(within(sellRows[0]).getByText('Svalir A, röð 3')).toBeInTheDocument();
    expect(within(sellRows[0]).getByText('2 miðar')).toBeInTheDocument();
    expect(within(sellRows[0]).getByText('9.900 kr.')).toBeInTheDocument();
    expect(within(sellRows[0]).getByText('−17%')).toBeInTheDocument();
    expect(within(sellRows[1]).getByText('1 miði')).toBeInTheDocument();
    expect(within(sellRows[1]).getByText('aðeins saman')).toBeInTheDocument();
    fireEvent.click(within(sellRows[0]).getByRole('button', { name: 'Kaupa af Guðrún H.' }));
    expect(onBuy).toHaveBeenCalledWith(listings[0]);

    const wantRows = screen.getAllByTestId('want-row');
    expect(wantRows).toHaveLength(2);
    expect(within(wantRows[0]).getByText('11.900 kr.')).toBeInTheDocument();
    expect(within(wantRows[0]).getByText('Hámark')).toBeInTheDocument();
    expect(within(wantRows[1]).getByText('ekkert hámark')).toBeInTheDocument();
    expect(within(wantRows[0]).getByRole('link', { name: 'Selja til Anna Lísa' })).toHaveAttribute('href', '/midatorg/selja?event=ev-1');
    expect(screen.getByRole('link', { name: 'Lesa reglurnar' })).toHaveAttribute('href', '/midatorg/um#reglur');
  });

  it('marks the viewer’s own listing and request', () => {
    wrap(<OrderBook event={event} listings={listings} requests={requests} onBuy={() => undefined} currentUserId="u-gudrun" />);
    expect(screen.getByText('Þín skráning')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Kaupa af/ })).toHaveLength(1);
  });

  it('empty columns offer an alert link and the want form', () => {
    wrap(<OrderBook event={event} listings={[]} requests={[]} onBuy={() => undefined} />);
    expect(screen.getByText('Engir miðar til sölu núna.')).toBeInTheDocument();
    expect(screen.getByText('2 manns bíða.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Láta vita' })).toHaveAttribute('href', '/midatorg/vidburdir/ev-1?vakta=1');
    expect(screen.getByText('Enginn hefur óskað eftir miða enn.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ég vil kaupa' })).toHaveAttribute('href', '/midatorg/oska?event=ev-1');
  });

  it('shows an error state with retry', () => {
    const retry = vi.fn();
    wrap(<OrderBook event={event} listings={undefined} requests={undefined} error={new Error('failed to fetch')} retry={retry} onBuy={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Náði ekki sambandi við Miðatorg');
    fireEvent.click(screen.getByRole('button', { name: 'Reyna aftur' }));
    expect(retry).toHaveBeenCalled();
  });

  it('phone: the two sides become tabs', () => {
    setMatchMedia(false);
    wrap(<OrderBook event={event} listings={listings} requests={requests} onBuy={() => undefined} />);
    expect(screen.getByRole('tab', { name: 'Til sölu (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('sell-row')).toHaveLength(2);
    expect(screen.queryByTestId('want-row')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Óskað eftir (2)' }));
    expect(screen.getAllByTestId('want-row')).toHaveLength(2);
    expect(screen.queryByTestId('sell-row')).not.toBeInTheDocument();
  });
});

describe('PriceChart', () => {
  it('shows the empty state with the ceiling when fewer than two points', () => {
    wrap(<PriceChart snapshots={[snapshot('2026-09-22', 9900)]} faceValue={11900} range="month" onRangeChange={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('Engin sölusaga enn');
    expect(screen.getByText('Miðaverð 11.900 kr. (hámark)')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-plot')).not.toBeInTheDocument();
  });

  it('renders header numbers, the range selector and the table fallback', () => {
    const onRange = vi.fn();
    wrap(
      <PriceChart
        snapshots={snapshots}
        faceValue={11900}
        range="month"
        onRangeChange={onRange}
        lastSold={{ price: 9900, at: '2026-09-20T14:02:00Z' }}
      />,
    );
    expect(screen.getByTestId('chart-current')).toHaveTextContent('9.900 kr.');
    expect(screen.getByTestId('chart-change')).toHaveTextContent('−2.000 kr. (−16,8%)');
    expect(screen.getByTestId('chart-change')).toHaveTextContent('síðasta mánuð');
    expect(screen.getByTestId('chart-change')).toHaveClass('text-up');
    expect(screen.getByTestId('chart-plot')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Tímabil' });
    expect(within(group).getByRole('button', { name: 'Síðasti mánuður' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Síðasta vika' }));
    expect(onRange).toHaveBeenCalledWith('week');
    expect(screen.getByText('síðast skráð 22. sept.')).toBeInTheDocument();
    expect(screen.getByText('Verð fer aldrei yfir miðaverð, 11.900 kr.')).toBeInTheDocument();
    expect(screen.getByText(/Síðast selt á 9.900 kr./)).toBeInTheDocument();
    // table fallback: one row per day with the delta
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(6); // header + 5
    expect(rows[1]).toHaveTextContent('25. ágúst');
    expect(rows[1]).toHaveTextContent('á miðaverði');
    expect(rows[5]).toHaveTextContent('−17%');
  });

  it('loading and error states', () => {
    const { unmount } = wrap(<PriceChart snapshots={undefined} faceValue={11900} range="month" onRangeChange={() => undefined} loading />);
    expect(screen.getByLabelText('Sæki verðsögu…')).toBeInTheDocument();
    unmount();
    const retry = vi.fn();
    wrap(<PriceChart snapshots={undefined} faceValue={11900} range="month" onRangeChange={() => undefined} error={new Error('x')} retry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reyna aftur' }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('BuyDialog', () => {
  it('bounds the quantity, shows the total and navigates to the deal room on success', async () => {
    authState.current = signedIn();
    api.reserveListing.mockResolvedValue({ id: 'd-1', event_id: 'ev-1' } as Deal);
    const onOpenChange = vi.fn();
    wrap(<BuyDialog listing={listings[0]} open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Taka frá miða');
    expect(dialog).toHaveTextContent('30 mínútur');
    const qty = screen.getByLabelText(/Fjöldi miða/) as HTMLInputElement;
    expect(qty.value).toBe('1');
    expect(screen.getByText('9.900')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fjölga' }));
    expect(qty.value).toBe('2');
    expect(screen.getByText('19.800')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fjölga' })).toBeDisabled();
    fireEvent.change(qty, { target: { value: '9' } });
    expect(qty.value).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Taka frá' }));
    await waitFor(() => expect(api.reserveListing).toHaveBeenCalledWith('l-1', 2));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidskipti/d-1'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('locks the quantity when the seller does not split', async () => {
    authState.current = signedIn();
    wrap(<BuyDialog listing={{ ...listings[1], quantity_remaining: 3 }} open onOpenChange={() => undefined} />);
    await screen.findByRole('dialog');
    const qty = screen.getByLabelText(/Fjöldi miða/) as HTMLInputElement;
    expect(qty.value).toBe('3');
    expect(qty).toBeDisabled();
    expect(screen.getByText('Seljandi selur miðana aðeins saman (3 miðar).')).toBeInTheDocument();
    expect(screen.getByText('31.500')).toBeInTheDocument();
  });

  it('shows guidance for OWN_LISTING and ALREADY_RESERVED', async () => {
    authState.current = signedIn();
    api.reserveListing.mockRejectedValueOnce({ message: 'OWN_LISTING', code: 'P0001' });
    wrap(<BuyDialog listing={listings[0]} open onOpenChange={() => undefined} />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Taka frá' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Þetta er þín eigin skráning');
    expect(within(alert).getByRole('link', { name: 'Fara á Mína síðu' })).toHaveAttribute('href', '/midatorg/eg');
    expect(screen.getByRole('button', { name: 'Taka frá' })).toBeEnabled();

    api.reserveListing.mockRejectedValueOnce({ message: 'ALREADY_RESERVED', code: 'P0001' });
    fireEvent.click(screen.getByRole('button', { name: 'Taka frá' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Þú ert þegar með frátekt'));
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'Skoða viðskiptin mín' })).toHaveAttribute('href', '/midatorg/vidskipti');
  });

  it('sends a signed-out user to the login page', async () => {
    wrap(<BuyDialog listing={listings[0]} open onOpenChange={() => undefined} />, '/midatorg/vidburdir/ev-1?x=1');
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Taka frá' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/innskra?next=%2Fmidatorg%2Fvidburdir%2Fev-1%3Fx%3D1'),
    );
    expect(api.reserveListing).not.toHaveBeenCalled();
  });
});

describe('AlertButton', () => {
  it('signed out: goes to login with vakta=1 in the return URL', () => {
    wrap(<AlertButton eventId="ev-1" faceValue={11900} />);
    fireEvent.click(screen.getByRole('button', { name: 'Láta mig vita' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/innskra?next=%2Fmidatorg%2Fvidburdir%2Fev-1%3Fvakta%3D1');
  });

  it('signed in: saves an alert with an optional max price and validates against face value', async () => {
    authState.current = signedIn();
    api.upsertAlert.mockResolvedValue({ id: 'a-1', user_id: 'u1', event_id: 'ev-1', max_price: 10000, created_at: '' } as Alert);
    wrap(<AlertButton eventId="ev-1" faceValue={11900} />);
    const trigger = await screen.findByRole('button', { name: 'Láta mig vita' });
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(trigger);
    const input = await screen.findByLabelText(/Hámarksverð á miða/);
    fireEvent.change(input, { target: { value: '15000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vakta viðburð' }));
    expect(screen.getByText('Hámark getur ekki verið hærra en miðaverð, 11.900 kr.')).toBeInTheDocument();
    expect(api.upsertAlert).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '10.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vakta viðburð' }));
    await waitFor(() => expect(api.upsertAlert).toHaveBeenCalledWith('ev-1', 10000));
  });

  it('signed in and following: shows the pressed state and can remove the alert', async () => {
    authState.current = signedIn();
    api.getMyAlert.mockResolvedValue({ id: 'a-1', user_id: 'u1', event_id: 'ev-1', max_price: null, created_at: '' } as Alert);
    api.removeAlert.mockResolvedValue(undefined);
    wrap(<AlertButton eventId="ev-1" faceValue={11900} autoOpen />);
    const trigger = await screen.findByRole('button', { name: 'Fylgist með' });
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    // autoOpen: the popover is already open
    expect(await screen.findByTestId('alert-current')).toHaveTextContent('Vaktað – öll verð.');
    fireEvent.click(screen.getByRole('button', { name: 'Hætta að vakta' }));
    await waitFor(() => expect(api.removeAlert).toHaveBeenCalledWith('ev-1'));
  });
});

describe('HowItWorks', () => {
  it('renders three steps with the reservation minutes and the face-value note', () => {
    wrap(<HowItWorks faceValue={11900} reservationMinutes={45} />);
    expect(screen.getByRole('heading', { name: 'Hvernig virkar þetta?' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/frátekin fyrir þig í 45 mínútur/)).toBeInTheDocument();
    expect(screen.getByText(/Verð má aldrei fara yfir miðaverð \(11.900 kr.\)/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
describe('EventPage', () => {
  it('loads the event and renders header, stats, chart, order book and sidebar', async () => {
    wrap(<EventPage />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Vínartónleikar');
    expect(api.getMarketEvent).toHaveBeenCalledWith('ev-1');
    expect(screen.getAllByTestId('stat-tile')).toHaveLength(5);
    expect(await screen.findAllByTestId('sell-row')).toHaveLength(2);
    expect(screen.getAllByTestId('want-row')).toHaveLength(2);
    await waitFor(() => expect(screen.getByTestId('chart-current')).toHaveTextContent('9.900 kr.'));
    expect(screen.getByRole('heading', { name: 'Hvernig virkar þetta?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Um viðburðinn' })).toBeInTheDocument();
    expect(screen.getByTestId('mobile-cta')).toBeInTheDocument();
    expect(document.title).toContain('Vínartónleikar');
  });

  it('signed out: Kaupa sends to the login page with a return URL', async () => {
    wrap(<EventPage />);
    const buy = (await screen.findAllByRole('button', { name: /Kaupa af/ }))[0];
    fireEvent.click(buy);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/innskra?next=%2Fmidatorg%2Fvidburdir%2Fev-1'));
  });

  it('signed in: Kaupa opens the buy dialog for that listing', async () => {
    authState.current = signedIn();
    wrap(<EventPage />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Kaupa af/ }))[1]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Ólafur K.');
    expect(dialog).toHaveTextContent('10.500 kr.');
  });

  it('shows the not-found state', async () => {
    api.getMarketEvent.mockResolvedValue(null);
    wrap(<EventPage />, '/midatorg/vidburdir/missing');
    expect(await screen.findByText('Viðburðurinn fannst ekki')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fara á markaðinn' })).toHaveAttribute('href', '/midatorg');
  });

  it('shows the error state and retries', async () => {
    api.getMarketEvent.mockRejectedValueOnce({ message: 'failed to fetch', name: 'TypeError' });
    wrap(<EventPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Náði ekki sambandi við Miðatorg');
    api.getMarketEvent.mockResolvedValue(event);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reyna aftur' }));
    });
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Vínartónleikar');
  });
});
