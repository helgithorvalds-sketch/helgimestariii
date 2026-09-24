import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { MarketEvent } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks: never hit the network. lib/api/events is automocked and driven per test.
// ---------------------------------------------------------------------------
vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return {
    supabase: makeSupabaseMock(),
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
import { SortMenu } from '../components/market/SortMenu';
import { buildHomeParams, cardStateOf, eventMeta, isSingular, parseHomeParams, pluralSuffix } from '../components/market/helpers';

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
  window.localStorage.clear();
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

describe('card state and number agreement', () => {
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

  it('applies the Icelandic singular rule (1, 21, 101 but not 11)', () => {
    expect(isSingular(1, 'is')).toBe(true);
    expect(isSingular(21, 'is')).toBe(true);
    expect(isSingular(11, 'is')).toBe(false);
    expect(isSingular(2, 'is')).toBe(false);
    expect(isSingular(21, 'en')).toBe(false);
    expect(isSingular(1, 'en')).toBe(true);
    expect(pluralSuffix(1, 'is')).toBe('One');
    expect(pluralSuffix(12, 'is')).toBe('Many');
  });

  it('meta line is "date · venue" (city when there is no venue)', () => {
    expect(eventMeta({ venue_name: 'Harpa', city: 'Reykjavík' }, 'fös. 14. nóv.')).toBe('fös. 14. nóv. · Harpa');
    expect(eventMeta({ venue_name: null, city: 'Akureyri' }, 'x')).toBe('x · Akureyri');
    expect(eventMeta({ venue_name: null, city: null }, 'x')).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
describe('MarketCard', () => {
  it('has listings: "Frá" price, green delta, counts, category chip, whole card is the link', () => {
    wrap(<MarketCard event={listing()} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'listings');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Sinfóníuhljómsveit Íslands: Vínartónleikar');
    expect(screen.getByRole('link', { name: 'Sinfóníuhljómsveit Íslands: Vínartónleikar' })).toHaveAttribute('href', '/midatorg/vidburdir/listing');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Frá 9.900 kr.')).toBeInTheDocument();
    expect(screen.getByText('−23%')).toBeInTheDocument();
    expect(screen.getByText('undir miðaverði')).toBeInTheDocument();
    expect(card).toHaveTextContent('7 miðar til sölu · vantar 23 miða');
    expect(card).toHaveTextContent('fim. 14. nóv. · Harpa');
    expect(screen.getByText('Tónleikar')).toBeInTheDocument();
    expect(screen.getByTestId('market-card-placeholder')).toHaveTextContent('SÍ');
    expect(screen.queryByTestId('market-card-img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('no delta when the lowest price sits at face value', () => {
    wrap(<MarketCard event={makeEvent({ min_ask: 12900 })} />);
    expect(screen.getByText('Frá 12.900 kr.')).toBeInTheDocument();
    expect(screen.queryByText('á miðaverði')).not.toBeInTheDocument();
  });

  it('no listings: "Engir miðar til sölu" and how many tickets are wanted', () => {
    wrap(<MarketCard event={waitlist()} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'waitlist');
    expect(screen.getByText('Engir miðar til sölu')).toBeInTheDocument();
    expect(card).toHaveTextContent('vantar 41 miða');
    expect(card).not.toHaveTextContent('Frá');
    expect(card).not.toHaveTextContent('til sölu ·');
  });

  it('no listings and nobody waiting: no counts line at all', () => {
    wrap(<MarketCard event={makeEvent({ min_ask: null, tickets_available: 0, wanted_tickets: 0, face_value_min: null })} />);
    expect(screen.getByText('Engir miðar til sölu')).toBeInTheDocument();
    expect(screen.getByTestId('market-card')).not.toHaveTextContent('vantar');
  });

  it('past event: "Liðinn" chip, last sold price, sold count, still a link', () => {
    wrap(<MarketCard event={pastEvent()} />);
    const card = screen.getByTestId('market-card');
    expect(card).toHaveAttribute('data-state', 'past');
    expect(screen.getByText('Liðinn')).toBeInTheDocument();
    expect(card).toHaveTextContent('Seldist síðast á 9.900 kr.');
    expect(card).toHaveTextContent('15 miðar seldir hér');
    expect(screen.getByRole('link', { name: 'Liðinn viðburður' })).toHaveAttribute('href', '/midatorg/vidburdir/past');
  });

  it('renders the tix.is image lazily over the placeholder when image_url is set', () => {
    wrap(<MarketCard event={makeEvent({ image_url: 'https://cdn.tixly.com/is/tix/EventImages/Event_19476.jpg' })} />);
    const img = screen.getByTestId('market-card-img');
    expect(img).toHaveAttribute('src', 'https://cdn.tixly.com/is/tix/EventImages/Event_19476.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveClass('object-cover');
    expect(screen.getByTestId('market-card-placeholder')).toBeInTheDocument();
    fireEvent.error(img);
    expect(screen.queryByTestId('market-card-img')).not.toBeInTheDocument();
  });

  it('compact: thumb, title link and meta only', () => {
    wrap(<MarketCard event={makeEvent({ image_url: 'https://x/e.jpg' })} compact />);
    const img = screen.getByTestId('event-thumb-image');
    expect(img).toHaveAttribute('src', 'https://x/e.jpg');
    expect(screen.getByTestId('market-card')).toHaveAttribute('data-compact', 'true');
    expect(screen.queryByText(/Frá/)).not.toBeInTheDocument();
  });

  it('speaks English too', () => {
    wrap(<MarketCard event={waitlist()} />, '/midatorg', 'en');
    expect(screen.getByText('No tickets for sale')).toBeInTheDocument();
    expect(screen.getByTestId('market-card')).toHaveTextContent('41 wanted');
    expect(screen.getByText('Concerts')).toBeInTheDocument();
  });
});

describe('CategoryChips / SortMenu', () => {
  it('chips are pressed toggles in the DESIGN order and report the category (null for Allt)', () => {
    const onChange = vi.fn();
    wrap(<CategoryChips value="leikhus" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Flokkar' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Allt', 'Tónleikar', 'Leikhús', 'Íþróttir', 'Hátíðir', 'Uppistand', 'Annað']);
    expect(within(group).getByRole('button', { name: 'Leikhús' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Tónleikar' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(group).getByRole('button', { name: 'Íþróttir' }));
    expect(onChange).toHaveBeenCalledWith('ithrottir');
    fireEvent.click(within(group).getByRole('button', { name: 'Allt' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('sort menu shows the current option with a label', () => {
    wrap(<SortMenu value="price" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Raða eftir' })).toHaveTextContent('Lægsta verð');
    expect(screen.getByText('Raða eftir', { selector: 'label' })).toBeInTheDocument();
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

  it('renders cards and the "Sýna fleiri" button', () => {
    const onLoadMore = vi.fn();
    wrap(<MarketGrid events={[listing(), waitlist()]} hasMore onLoadMore={onLoadMore} />);
    expect(screen.getAllByTestId('market-card')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Sýna fleiri' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------
describe('HomePage', () => {
  it('loads the events from the URL params and shows title, intro, pills, sort and cards', async () => {
    listMock().mockResolvedValue([listing(), waitlist()]);
    wrap(<HomePage />, '/midatorg?flokkur=tonleikar&rada=price');

    expect(screen.getByTestId('market-grid-loading')).toBeInTheDocument();
    expect(await screen.findAllByTestId('market-card')).toHaveLength(2);

    expect(listMock()).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'tonleikar', sort: 'price', limit: 24, offset: 0, q: undefined }),
    );
    expect(listMock()).not.toHaveBeenCalledWith(expect.objectContaining({ sort: 'demand' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Viðburðir');
    expect(screen.getByTestId('home-intro')).toHaveTextContent('Kauptu og seldu miða á viðburði á tix.is');
    expect(screen.getByRole('button', { name: 'Tónleikar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'Raða eftir' })).toHaveTextContent('Lægsta verð');
    expect(screen.queryByRole('button', { name: 'Sýna fleiri' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-query')).not.toBeInTheDocument();
  });

  it('the intro can be closed and stays closed', async () => {
    listMock().mockResolvedValue([listing()]);
    const { unmount } = wrap(<HomePage />);
    await screen.findAllByTestId('market-card');
    fireEvent.click(screen.getByRole('button', { name: 'Loka kynningu' }));
    expect(screen.queryByTestId('home-intro')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('midatorg-intro-dismissed')).toBe('1');
    unmount();
    wrap(<HomePage />);
    await screen.findAllByTestId('market-card');
    expect(screen.queryByTestId('home-intro')).not.toBeInTheDocument();
  });

  it('pill and sort changes update the URL (replace) and refetch', async () => {
    listMock().mockResolvedValue([listing()]);
    wrap(<HomePage />);
    await screen.findAllByTestId('market-card');

    fireEvent.click(screen.getByRole('button', { name: 'Leikhús' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg?flokkur=leikhus'));
    await waitFor(() => expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ category: 'leikhus', sort: 'date' })));

    fireEvent.click(screen.getByRole('button', { name: 'Allt' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('flokkur');
  });

  it('search: ?q= drives the query, shows the query line and can be cleared', async () => {
    listMock().mockResolvedValue([listing()]);
    wrap(<HomePage />, '/midatorg?q=sigur');
    await screen.findAllByTestId('market-card');
    expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ q: 'sigur' }));
    expect(screen.getByTestId('home-query')).toHaveTextContent('Leitarniðurstöður fyrir „sigur“');

    fireEvent.click(within(screen.getByTestId('home-query')).getByRole('button', { name: 'Hreinsa leit' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('q=');
    expect(screen.queryByTestId('home-query')).not.toBeInTheDocument();
  });

  it('paginates with "Sýna fleiri" (24 per page)', async () => {
    const page1 = Array.from({ length: 24 }, (_, i) => makeEvent({ id: `p1-${i}` }));
    const page2 = Array.from({ length: 3 }, (_, i) => makeEvent({ id: `p2-${i}` }));
    listMock().mockImplementation(async (params) => (params?.offset === 0 ? page1 : page2));
    wrap(<HomePage />);
    expect(await screen.findAllByTestId('market-card')).toHaveLength(24);

    fireEvent.click(screen.getByRole('button', { name: 'Sýna fleiri' }));
    await waitFor(() => expect(screen.getAllByTestId('market-card')).toHaveLength(27));
    expect(listMock()).toHaveBeenCalledWith(expect.objectContaining({ offset: 24, limit: 24 }));
    expect(screen.queryByRole('button', { name: 'Sýna fleiri' })).not.toBeInTheDocument();
  });

  it('empty category → "Sýna allt"; empty search → clear + request an event; empty market → sell link', async () => {
    listMock().mockResolvedValue([]);
    const { unmount } = wrap(<HomePage />, '/midatorg?flokkur=hatidir');
    expect(await screen.findByText('Engir viðburðir fundust')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sýna allt' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(await screen.findByText('Engir viðburðir enn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja');
    unmount();

    wrap(<HomePage />, '/midatorg?q=xyz');
    const status = (await screen.findByText('Engir viðburðir fundust')).closest('[role="status"]') as HTMLElement;
    expect(status).toHaveTextContent('Ekkert fannst fyrir „xyz“');
    expect(screen.getByRole('link', { name: 'Biðja um viðburð' })).toHaveAttribute('href', '/midatorg/um#samband');
    fireEvent.click(within(status).getByRole('button', { name: 'Hreinsa leit' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/midatorg'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('q=');
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
