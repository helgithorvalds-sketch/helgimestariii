import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { MarketEvent } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks: never hit the network. The supabase stand-in serves the sparkline
// query; lib/api/events is automocked and driven per test.
// ---------------------------------------------------------------------------
const { snapshotRows } = vi.hoisted(() => ({
  snapshotRows: { current: [] as { event_id: string; captured_at: string; min_ask: number | null }[] },
}));

vi.mock('../lib/supabase', async () => {
  const { makeQueryBuilder } = await import('./mocks');
  return {
    supabase: {
      from: vi.fn(() => makeQueryBuilder({ data: snapshotRows.current, error: null, count: null })),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
    requireUid: () => Promise.resolve('u1'),
    PROOF_BUCKET: 'mt-ticket-proofs',
    AVATAR_BUCKET: 'mt-avatars',
  };
});

vi.mock('../lib/api/events');

import * as eventsApi from '../lib/api/events';
import HomePage from '../pages/HomePage';
import { MarketCard } from '../components/market/MarketCard';
import { MarketGrid } from '../components/market/MarketGrid';
import { CategoryChips } from '../components/market/CategoryChips';
import { SearchField } from '../components/market/SearchField';
import { SortMenu } from '../components/market/SortMenu';
import { TrendingStrip } from '../components/market/TrendingStrip';
import { Sparkline } from '../components/market/Sparkline';
import { sparklineGeometry } from '../components/market/sparklineGeometry';
import { fetchSparklines } from '../components/market/sparklines';
import {
  buildHomeParams,
  cardStateOf,
  demandScore,
  eventMeta,
  isSingular,
  parseHomeParams,
  rankTrending,
  seriesFromSnapshots,
  sparklineTone,
  summarise,
} from '../components/market/helpers';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FUTURE = '2030-11-14T20:00:00Z';
const PAST = '2020-11-14T20:00:00Z';

let seq = 0;
function makeEvent(overrides: Partial<MarketEvent> = {}): MarketEvent {
  seq += 1;
  return {
    id: overrides.id ?? `evt-${seq}`,
    title: `Viðburður ${seq}`,
    description: null,
    category: 'tonleikar',
    city: 'Reykjavík',
    venue_id: null,
    venue_name: 'Harpa',
    starts_at: FUTURE,
    image_url: null,
    tix_url: null,
    tix_event_id: null,
    face_value_min: 12900,
    face_value_max: 12900,
    status: 'upcoming',
    source: 'seed',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tickets_available: 7,
    listings_active: 3,
    min_ask: 9900,
    avg_ask: 10500,
    requests_active: 5,
    wanted_tickets: 23,
    max_bid: 11000,
    sold_count: 4,
    last_sold_price: 9900,
    last_sold_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

const listing = () => makeEvent({ id: 'listing', title: 'Sinfóníuhljómsveit Íslands: Vínartónleikar' });
const waitlist = () =>
  makeEvent({ id: 'wait', title: 'Laufey – Reykjavík 2027', min_ask: null, tickets_available: 0, listings_active: 0, wanted_tickets: 41, face_value_min: 14900 });
const pastEvent = () =>
  makeEvent({ id: 'past', title: 'Liðinn viðburður', starts_at: PAST, status: 'past', min_ask: null, tickets_available: 0, wanted_tickets: 0, sold_count: 15, last_sold_price: 9900 });

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

function wrap(ui: ReactNode, path = '/midatorg', locale: 'is' | 'en' = 'is') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale={locale}>
          {ui}
          <LocationProbe />
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const listMock = () => vi.mocked(eventsApi.listMarketEvents);

beforeEach(() => {
  seq = 0;
  snapshotRows.current = [];
  vi.mocked(eventsApi.listMarketEvents).mockReset();
  listMock().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
describe('home params', () => {
  it('parses q / flokkur / rada with defaults and ignores junk', () => {
    expect(parseHomeParams(new URLSearchParams(''))).toEqual({ q: '', category: null, sort: 'date' });
    expect(parseHomeParams(new URLSearchParams('q=%20sigur%20&flokkur=leikhus&rada=price'))).toEqual({
      q: 'sigur',
      category: 'leikhus',
      sort: 'price',
    });
    expect(parseHomeParams(new URLSearchParams('flokkur=nope&rada=nope'))).toEqual({ q: '', category: null, sort: 'date' });
  });

  it('builds a clean query string (defaults omitted) that round-trips', () => {
    expect(buildHomeParams({ q: '', category: null, sort: 'date' }).toString()).toBe('');
    const qs = buildHomeParams({ q: 'björk', category: 'tonleikar', sort: 'demand' });
    expect(qs.get('q')).toBe('björk');
    expect(qs.get('flokkur')).toBe('tonleikar');
    expect(qs.get('rada')).toBe('demand');
    expect(parseHomeParams(qs)).toEqual({ q: 'björk', category: 'tonleikar', sort: 'demand' });
  });
});

describe('card state, ranking and number agreement', () => {
  it('derives the three card states', () => {
    expect(cardStateOf(listing())).toBe('listings');
    expect(cardStateOf(waitlist())).toBe('waitlist');
    expect(cardStateOf(pastEvent())).toBe('past');
    // upcoming by status but the date has passed → past
    expect(cardStateOf(makeEvent({ starts_at: PAST }))).toBe('past');
    expect(cardStateOf(makeEvent({ status: 'cancelled' }))).toBe('past');
    // a price with nothing available is not a listing
    expect(cardStateOf(makeEvent({ min_ask: 9900, tickets_available: 0 }))).toBe('waitlist');
  });

  it('ranks trending by wanted + available, ties by date, past and idle events excluded', () => {
    const a = makeEvent({ id: 'a', wanted_tickets: 10, tickets_available: 5 }); // 15
    const b = makeEvent({ id: 'b', wanted_tickets: 30, tickets_available: 0 }); // 30
    const c = makeEvent({ id: 'c', wanted_tickets: 0, tickets_available: 0 }); // 0 → out
    const d = makeEvent({ id: 'd', wanted_tickets: 15, tickets_available: 0, starts_at: '2030-01-01T00:00:00Z' }); // 15, earlier
    const e = makeEvent({ id: 'e', wanted_tickets: 99, tickets_available: 9, starts_at: PAST }); // past → out
    expect(demandScore(a)).toBe(15);
    expect(rankTrending([a, b, c, d, e], 6).map((x) => x.id)).toEqual(['b', 'd', 'a']);
    expect(rankTrending([a, b, d], 2).map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('applies the Icelandic singular rule (1, 21, 101 but not 11)', () => {
    expect(isSingular(1, 'is')).toBe(true);
    expect(isSingular(21, 'is')).toBe(true);
    expect(isSingular(11, 'is')).toBe(false);
    expect(isSingular(2, 'is')).toBe(false);
    expect(isSingular(21, 'en')).toBe(false);
    expect(isSingular(1, 'en')).toBe(true);
  });

  it('sparkline tone, snapshot grouping, meta and summary', () => {
    expect(sparklineTone(9900, 12900)).toBe('up');
    expect(sparklineTone(12900, 12900)).toBe('neutral');
    expect(sparklineTone(9900, null)).toBe('neutral');
    expect(
      seriesFromSnapshots([
        { event_id: 'a', captured_at: '2026-01-01', min_ask: 100 },
        { event_id: 'b', captured_at: '2026-01-01', min_ask: null },
        { event_id: 'a', captured_at: '2026-01-02', min_ask: 90 },
        { event_id: 'b', captured_at: '2026-01-02', min_ask: 50 },
      ]),
    ).toEqual({ a: [100, 90], b: [50] });
    expect(eventMeta({ venue_name: 'Harpa', city: 'Reykjavík' }, 'fös. 14. nóv.')).toBe('Harpa · fös. 14. nóv.');
    expect(eventMeta({ venue_name: null, city: 'Akureyri' }, 'x')).toBe('Akureyri · x');
    expect(eventMeta({ venue_name: null, city: null }, 'x')).toBe('x');
    expect(summarise([listing(), waitlist()])).toEqual({ events: 2, tickets: 7, wanted: 64 });
  });
});

describe('sparklineGeometry', () => {
  it('draws a step-after path with the end dot at the last value', () => {
    const geo = sparklineGeometry([1, 2, 3], 96, 32);
    expect(geo.line.startsWith('M3 29')).toBe(true); // first value = min → bottom
    expect(geo.line.split(' L').length - 1).toBe(4); // 2 segments per step
    expect(geo.end).toEqual({ x: 93, y: 3 }); // last value = max → top
    expect(geo.area.endsWith('Z')).toBe(true);
  });

  it('puts a flat or single-point series on the midline and returns nothing for empty', () => {
    expect(sparklineGeometry([5, 5, 5], 96, 32).end).toEqual({ x: 93, y: 16 });
    expect(sparklineGeometry([7], 96, 32).end).toEqual({ x: 93, y: 16 });
    expect(sparklineGeometry([], 96, 32)).toEqual({ line: '', area: '', end: null });
  });
});

describe('fetchSparklines', () => {
  it('returns {} without ids and groups rows otherwise (one query)', async () => {
    expect(await fetchSparklines([])).toEqual({});
    snapshotRows.current = [
      { event_id: 'a', captured_at: '2026-01-01', min_ask: 9000 },
      { event_id: 'a', captured_at: '2026-01-02', min_ask: 8500 },
    ];
    expect(await fetchSparklines(['a', 'b'])).toEqual({ a: [9000, 8500] });
  });
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
describe('Sparkline', () => {
  it('renders the path and dot with the tone class, or a dashed rule when empty', () => {
    const { container, rerender } = render(<Sparkline points={[1, 2, 3]} tone="up" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('text-up');
    expect(svg.querySelectorAll('path')).toHaveLength(2);
    expect(svg.querySelector('circle')).not.toBeNull();
    rerender(<Sparkline points={[]} />);
    expect(container.querySelector('svg')).toHaveAttribute('data-empty', 'true');
    expect(container.querySelector('line')).toHaveAttribute('stroke-dasharray', '3 4');
  });
});

describe('MarketCard', () => {
  it('has listings: price, delta vs face value, Kaupa and Ég á miða links, counts', () => {
    wrap(<MarketCard event={listing()} sparkline={[12000, 11000, 9900]} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'listings');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Sinfóníuhljómsveit Íslands: Vínartónleikar');
    expect(screen.getByRole('link', { name: 'Sinfóníuhljómsveit Íslands: Vínartónleikar' })).toHaveAttribute('href', '/midatorg/vidburdir/listing');
    expect(screen.getByText('Lægsta verð')).toBeInTheDocument();
    expect(screen.getByText('9.900')).toBeInTheDocument();
    expect(screen.getByText('−23%')).toBeInTheDocument();
    expect(screen.getByText('undir miðaverði')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kaupa' })).toHaveAttribute('href', '/midatorg/vidburdir/listing');
    expect(screen.getByRole('link', { name: 'Ég á miða' })).toHaveAttribute('href', '/midatorg/selja?event=listing');
    expect(screen.getByTestId('sparkline')).toHaveAttribute('data-tone', 'up');
    expect(card).toHaveTextContent('7 til sölu · 23 vilja kaupa');
    expect(card).toHaveTextContent('Harpa · fim. 14. nóv. · 20:00');
    expect(screen.getByText('Tónleikar')).toBeInTheDocument();
    expect(screen.getByTestId('event-thumb-placeholder')).toHaveTextContent('SÍ');
  });

  it('no listings: waitlist count, "Engir miðar til sölu", Láta vita → ?vakta=1, dashed sparkline', () => {
    wrap(<MarketCard event={waitlist()} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'waitlist');
    expect(screen.getByText('Á biðlista')).toBeInTheDocument();
    expect(card.querySelector('.mt-headline')).toHaveClass('text-bid');
    expect(card.querySelector('.mt-headline')).toHaveTextContent('41 vilja kaupa');
    expect(card).toHaveTextContent('Engir miðar til sölu — miðaverð 14.900 kr.');
    expect(screen.getByRole('link', { name: 'Láta vita' })).toHaveAttribute('href', '/midatorg/vidburdir/wait?vakta=1');
    expect(screen.getByRole('link', { name: 'Ég á miða' })).toHaveAttribute('href', '/midatorg/selja?event=wait');
    expect(screen.queryByRole('link', { name: 'Kaupa' })).not.toBeInTheDocument();
    expect(screen.getByTestId('sparkline')).toHaveAttribute('data-empty', 'true');
    expect(card).toHaveTextContent('0 til sölu · 41 vilja kaupa');
  });

  it('no listings and nobody waiting: "Enginn á biðlista"', () => {
    wrap(<MarketCard event={makeEvent({ min_ask: null, tickets_available: 0, wanted_tickets: 0, face_value_min: null })} />);
    expect(screen.getByText('Enginn á biðlista')).toBeInTheDocument();
    expect(screen.getByText('Engir miðar til sölu')).toBeInTheDocument();
    expect(screen.getByTestId('market-card')).not.toHaveTextContent('miðaverð');
  });

  it('past event: dimmed, "Liðinn", last sold price, no action buttons, title still links', () => {
    wrap(<MarketCard event={pastEvent()} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'past');
    expect(screen.getByText('Liðinn')).toBeInTheDocument();
    expect(card).toHaveTextContent('seldist síðast 9.900 kr.');
    expect(card).toHaveTextContent('15 seldir');
    expect(screen.queryByRole('link', { name: 'Kaupa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Láta vita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ég á miða' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Liðinn viðburður' })).toHaveAttribute('href', '/midatorg/vidburdir/past');
    expect(card.querySelector('.opacity-60')).not.toBeNull();
  });

  it('renders the image when image_url is set, and the compact head only', () => {
    wrap(<MarketCard event={makeEvent({ image_url: 'https://x/e.jpg' })} compact />);
    const img = screen.getByTestId('event-thumb-image');
    expect(img).toHaveAttribute('src', 'https://x/e.jpg');
    expect(img).toHaveAttribute('alt', '');
    expect(screen.getByTestId('market-card')).toHaveAttribute('data-compact', 'true');
    expect(screen.queryByText('Lægsta verð')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Kaupa' })).not.toBeInTheDocument();
  });

  it('speaks English too', () => {
    wrap(<MarketCard event={waitlist()} />, '/midatorg', 'en');
    expect(screen.getByText('Waitlist')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notify me' })).toBeInTheDocument();
    expect(screen.getByTestId('market-card')).toHaveTextContent('No tickets for sale — face value 14.900 kr.');
  });
});

describe('TrendingStrip', () => {
  it('shows at most six ranked items with ordinals, price + delta or waitlist count', () => {
    const events = [
      listing(),
      waitlist(),
      ...Array.from({ length: 6 }, (_, i) => makeEvent({ id: `t${i}`, wanted_tickets: 1 + i, tickets_available: 0, min_ask: null })),
      makeEvent({ id: 'idle', wanted_tickets: 0, tickets_available: 0, min_ask: null }),
    ];
    wrap(<TrendingStrip events={events} />);
    const strip = screen.getByRole('region', { name: 'Vinsælt núna' });
    const items = within(strip).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent('01');
    expect(items[0]).toHaveTextContent('Laufey – Reykjavík 2027');
    expect(items[0]).toHaveTextContent('41');
    expect(items[0]).toHaveTextContent('á biðlista');
    expect(items[1]).toHaveTextContent('9.900 kr.');
    expect(items[1]).toHaveTextContent('−23%');
    expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/midatorg/vidburdir/listing');
    expect(strip).not.toHaveTextContent('Viðburður 9'); // the idle one
  });

  it('renders nothing without demand', () => {
    const { container } = wrap(<TrendingStrip events={[makeEvent({ wanted_tickets: 0, tickets_available: 0, min_ask: null })]} />);
    expect(container.querySelector('[data-testid="trending-strip"]')).toBeNull();
  });
});

describe('CategoryChips / SortMenu / SearchField', () => {
  it('chips are pressed toggles in the DESIGN order and report the category (null for Allt)', () => {
    const onChange = vi.fn();
    wrap(<CategoryChips value="leikhus" onChange={onChange} counts={{ all: 16 }} />);
    const group = screen.getByRole('group', { name: 'Flokkar' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Allt16', 'Tónleikar', 'Leikhús', 'Íþróttir', 'Hátíðir', 'Uppistand', 'Annað']);
    expect(within(group).getByRole('button', { name: /Leikhús/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /Tónleikar/ })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(group).getByRole('button', { name: /Íþróttir/ }));
    expect(onChange).toHaveBeenCalledWith('ithrottir');
    fireEvent.click(within(group).getByRole('button', { name: /Allt/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('sort menu shows the current dative option with a label', () => {
    wrap(<SortMenu value="price" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Raða eftir' })).toHaveTextContent('Lægsta verði');
    expect(screen.getByText('Raða eftir', { selector: 'label' })).toBeInTheDocument();
  });

  it('search field debounces, commits on Enter, clears with the button, mirrors the prop', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { rerender } = wrap(<SearchField value="" onChange={onChange} />);
    const input = screen.getByRole('searchbox', { name: 'Leita á markaðnum' });
    fireEvent.change(input, { target: { value: 'sig' } });
    fireEvent.change(input, { target: { value: 'sigur' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('sigur');

    fireEvent.change(input, { target: { value: 'sigur rós' } });
    fireEvent.submit(input.closest('form')!);
    expect(onChange).toHaveBeenLastCalledWith('sigur rós');
    expect(onChange).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Hreinsa leit' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');

    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <I18nProvider initialLocale="is">
            <SearchField value="björk" onChange={onChange} />
          </I18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('searchbox')).toHaveValue('björk');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onChange).toHaveBeenCalledTimes(3); // the mirrored value is not re-emitted
  });
});

describe('MarketGrid', () => {
  it('shows skeletons while loading', () => {
    wrap(<MarketGrid events={[]} isLoading skeletonCount={3} />);
    expect(screen.getByTestId('market-grid-loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('market-card-skeleton')).toHaveLength(3);
  });

  it('shows the translated error with a retry button', () => {
    const onRetry = vi.fn();
    wrap(<MarketGrid events={[]} error={{ message: 'Failed to fetch', name: 'TypeError' }} onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Náði ekki sambandi við Miðatorg.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders cards with sparklines and the "Sýna fleiri" button', () => {
    const onLoadMore = vi.fn();
    wrap(<MarketGrid events={[listing(), waitlist()]} sparklines={{ listing: [1, 2] }} hasMore onLoadMore={onLoadMore} />);
    expect(screen.getAllByTestId('market-card')).toHaveLength(2);
    const sparks = screen.getAllByTestId('sparkline');
    expect(sparks[0]).not.toHaveAttribute('data-empty');
    expect(sparks[1]).toHaveAttribute('data-empty', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Sýna fleiri' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------
describe('HomePage', () => {
  it('loads the market from the URL params, shows trending, summary and cards', async () => {
    snapshotRows.current = [
      { event_id: 'listing', captured_at: '2026-01-01', min_ask: 11000 },
      { event_id: 'listing', captured_at: '2026-01-02', min_ask: 9900 },
    ];
    listMock().mockImplementation(async (params) => {
      if (params?.sort === 'demand') return [waitlist(), listing()];
      return [listing(), waitlist()];
    });
    wrap(<HomePage />, '/midatorg?flokkur=tonleikar&rada=price');

    expect(screen.getByTestId('market-grid-loading')).toBeInTheDocument();
    expect(await screen.findAllByTestId('market-card')).toHaveLength(2);

    expect(listMock()).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'tonleikar', sort: 'price', limit: 24, offset: 0, q: undefined }),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Markaðurinn');
    expect(screen.getByTestId('market-summary')).toHaveTextContent('2 viðburðir · 7 miðar til sölu · 64 vilja kaupa');
    expect(screen.getByRole('button', { name: /Tónleikar/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'Raða eftir' })).toHaveTextContent('Lægsta verði');
    expect(screen.getByRole('region', { name: 'Vinsælt núna' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sýna fleiri' })).not.toBeInTheDocument();
    expect(screen.getByText('Verð aldrei hærra en miðaverð · Engin þóknun · Greitt beint á milli fólks')).toBeInTheDocument();

    // sparkline series reached the card in one query
    await waitFor(() => {
      const card = screen.getAllByTestId('market-card')[0];
      expect(within(card).getByTestId('sparkline')).not.toHaveAttribute('data-empty');
    });
  });

  it('chip and sort changes update the URL (replace) and refetch', async () => {
    listMock().mockResolvedValue([listing()]);
    wrap(<HomePage />);
    await screen.findAllByTestId('market-card');

    fireEvent.click(screen.getByRole('button', { name: /Leikhús/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg?flokkur=leikhus'));
    await waitFor(() => expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ category: 'leikhus', sort: 'date' })));

    fireEvent.click(screen.getByRole('button', { name: /Allt/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('flokkur');
  });

  it('search: ?q= prefills the field, hides trending and drives the query', async () => {
    listMock().mockResolvedValue([listing()]);
    wrap(<HomePage />, '/midatorg?q=sigur');
    await screen.findAllByTestId('market-card');
    expect(screen.getByRole('searchbox', { name: 'Leita á markaðnum' })).toHaveValue('sigur');
    expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ q: 'sigur' }));
    expect(listMock()).not.toHaveBeenCalledWith(expect.objectContaining({ sort: 'demand' }));
    expect(screen.queryByRole('region', { name: 'Vinsælt núna' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hreinsa leit' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('q=');
  });

  it('paginates with "Sýna fleiri" (24 per page)', async () => {
    const page1 = Array.from({ length: 24 }, (_, i) => makeEvent({ id: `p1-${i}` }));
    const page2 = Array.from({ length: 3 }, (_, i) => makeEvent({ id: `p2-${i}` }));
    listMock().mockImplementation(async (params) => {
      if (params?.sort === 'demand') return [];
      return params?.offset === 0 ? page1 : page2;
    });
    wrap(<HomePage />);
    expect(await screen.findAllByTestId('market-card')).toHaveLength(24);
    expect(screen.getByTestId('market-summary')).toHaveTextContent('Sýni 24 viðburði');

    fireEvent.click(screen.getByRole('button', { name: 'Sýna fleiri' }));
    await waitFor(() => expect(screen.getAllByTestId('market-card')).toHaveLength(27));
    expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ offset: 24, limit: 24 }));
    expect(screen.queryByRole('button', { name: 'Sýna fleiri' })).not.toBeInTheDocument();
    expect(screen.getByTestId('market-summary')).toHaveTextContent('27 viðburðir');
  });

  it('empty category → "Sýna allt"; empty search → request an event; empty market → sell link', async () => {
    listMock().mockResolvedValue([]);
    const { unmount } = wrap(<HomePage />, '/midatorg?flokkur=hatidir');
    expect(await screen.findByText('Engir viðburðir í þessum flokki')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sýna allt' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(await screen.findByText('Engir viðburðir enn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja');
    unmount();

    wrap(<HomePage />, '/midatorg?q=xyz');
    expect(await screen.findByText('Ekkert fannst fyrir „xyz“')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Biðja um viðburð' })).toHaveAttribute('href', '/midatorg/um#samband');
  });

  it('shows the error state with a working retry', async () => {
    listMock().mockRejectedValueOnce({ message: 'Failed to fetch', name: 'TypeError' });
    listMock().mockResolvedValue([listing()]);
    wrap(<HomePage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Náði ekki sambandi við Miðatorg.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findAllByTestId('market-card')).toHaveLength(1);
  });
});
