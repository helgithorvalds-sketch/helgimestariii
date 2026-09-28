import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { MarketEvent } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks: no network, no Leaflet (jsdom has no layout). EventMap becomes a list of
// buttons, one per pinned event, so selection can be driven from tests.
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
vi.mock('../components/map/EventMap', () => ({
  default: ({ points, onSelect }: { points: { event: MarketEvent }[]; onSelect: (id: string) => void }) => (
    <div data-testid="event-map-stub">
      {points.map((p) => (
        <button key={p.event.id} type="button" data-testid="pin" onClick={() => onSelect(p.event.id)}>
          {p.event.title}
        </button>
      ))}
    </div>
  ),
}));

import * as eventsApi from '../lib/api/events';
import HomePage from '../pages/HomePage';
import MapPage from '../pages/MapPage';
import { DayPicker } from '../components/map/DayPicker';
import { EventSheet } from '../components/map/EventSheet';
import { MapEventList } from '../components/map/MapEventList';
import {
  clusterPoints,
  dayKey,
  dayOptions,
  escapeHtml,
  hasCoords,
  parseDay,
  rangeFor,
  safeImageUrl,
  splitByLocation,
  type MapPoint,
} from '../components/map/mapUtils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FUTURE = '2030-11-14T20:00:00Z';
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
    wanted_tickets: 2,
    max_bid: 11000,
    sold_count: 0,
    last_sold_price: null,
    last_sold_at: null,
    map_lat: 64.1504,
    map_lng: -21.9327,
    ...overrides,
  };
}

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

function wrap(ui: ReactNode, path = '/midatorg') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">
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
  listMock().mockReset();
  listMock().mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
describe('mapUtils', () => {
  const now = new Date(2026, 8, 28, 15, 30); // Mon 28 Sept 2026, 15:30 local

  it('parses ?dagur: 30 / missing / junk / past → next 30 days; future dates kept', () => {
    expect(parseDay(null, now)).toBe('next30');
    expect(parseDay('30', now)).toBe('next30');
    expect(parseDay('nonsense', now)).toBe('next30');
    expect(parseDay('2026-02-31', now)).toBe('next30');
    expect(parseDay('2026-09-27', now)).toBe('next30');
    expect(parseDay('2026-09-28', now)).toBe('2026-09-28');
    expect(parseDay('2026-10-03', now)).toBe('2026-10-03');
  });

  it('builds [from, to) ranges; today starts now, other days at midnight', () => {
    const today = rangeFor('2026-09-28', now);
    expect(today.from).toBe(now.toISOString());
    expect(today.to).toBe(new Date(2026, 8, 29).toISOString());
    const later = rangeFor('2026-10-03', now);
    expect(later.from).toBe(new Date(2026, 9, 3).toISOString());
    expect(later.to).toBe(new Date(2026, 9, 4).toISOString());
    const next = rangeFor('next30', now);
    expect(next.from).toBe(now.toISOString());
    expect(next.to).toBe(new Date(2026, 9, 29).toISOString());
  });

  it('offers next 30 days, today, tomorrow and then dated chips', () => {
    const opts = dayOptions(now, 5);
    expect(opts.map((o) => o.kind)).toEqual(['next30', 'today', 'tomorrow', 'date', 'date', 'date']);
    expect(opts[1].value).toBe('2026-09-28');
    expect(opts[5].value).toBe(dayKey(new Date(2026, 9, 2)));
  });

  it('splits events by known location', () => {
    const a = makeEvent({ id: 'a' });
    const b = makeEvent({ id: 'b', map_lat: null, map_lng: null });
    const c = makeEvent({ id: 'c', map_lat: undefined, map_lng: undefined });
    const { placed, unplaced } = splitByLocation([a, b, c]);
    expect(placed.map((p) => p.event.id)).toEqual(['a']);
    expect(unplaced.map((e) => e.id)).toEqual(['b', 'c']);
    expect(hasCoords(a)).toBe(true);
  });

  it('clusters points that project into the same grid cell and keeps singles keyed by event id', () => {
    const pts: MapPoint[] = [
      { event: makeEvent({ id: 'p1' }), lat: 0, lng: 0 },
      { event: makeEvent({ id: 'p2' }), lat: 0, lng: 0 },
      { event: makeEvent({ id: 'p3' }), lat: 1, lng: 1 },
    ];
    const xy: Record<string, { x: number; y: number }> = { p1: { x: 10, y: 10 }, p2: { x: 40, y: 50 }, p3: { x: 300, y: 10 } };
    const clusters = clusterPoints(pts, (p) => xy[p.event.id], 56);
    expect(clusters).toHaveLength(2);
    const big = clusters.find((c) => c.points.length === 2)!;
    expect(big.points.map((p) => p.event.id)).toEqual(['p1', 'p2']);
    expect(big.key.startsWith('c:')).toBe(true);
    expect(clusters.find((c) => c.points.length === 1)!.key).toBe('p3');
  });

  it('escapes HTML and only allows https images in marker markup', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
    expect(safeImageUrl('https://cdn.tixly.com/x.jpg')).toBe('https://cdn.tixly.com/x.jpg');
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeImageUrl('http://insecure/x.jpg')).toBeNull();
    expect(safeImageUrl(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
describe('DayPicker', () => {
  it('marks the selected chip and reports changes', () => {
    const onChange = vi.fn();
    wrap(<DayPicker value="next30" onChange={onChange} now={new Date(2026, 8, 28, 12)} />);
    const group = screen.getByRole('group', { name: 'Dagur' });
    expect(within(group).getByRole('button', { name: 'Næstu 30 dagar' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Á morgun' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-29');
    expect(within(group).getByRole('button', { name: /mið\. 30\. sept\./ })).toBeInTheDocument();
  });
});

describe('EventSheet', () => {
  it('shows price, counts and the three actions for an event with tickets', () => {
    const onClose = vi.fn();
    wrap(<EventSheet event={makeEvent({ id: 'e1', title: 'Vínartónleikar', min_ask: 9900, face_value_min: 11900, tickets_available: 3, wanted_tickets: 2 })} onClose={onClose} />);
    const sheet = screen.getByTestId('event-sheet');
    expect(within(sheet).getByRole('heading', { name: 'Vínartónleikar' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Frá 9.900 kr.');
    expect(sheet).toHaveTextContent('3 miðar til sölu');
    expect(sheet).toHaveTextContent('vantar 2 miða');
    expect(within(sheet).getByRole('link', { name: 'Skoða viðburð' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(sheet).getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja?event=e1');
    expect(within(sheet).getByRole('link', { name: /Láta mig vita/ })).toHaveAttribute('href', '/midatorg/vidburdir/e1?vakta=1');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Loka' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('says so when no tickets are for sale', () => {
    wrap(<EventSheet event={makeEvent({ min_ask: null, tickets_available: 0, wanted_tickets: 0 })} onClose={() => undefined} />);
    expect(screen.getByTestId('event-sheet')).toHaveTextContent('Engir miðar til sölu');
  });
});

describe('MapEventList', () => {
  it('lists placed events, then unplaced ones under "Staðsetning óþekkt"', () => {
    const onSelect = vi.fn();
    const a = makeEvent({ id: 'a', title: 'Á korti' });
    const b = makeEvent({ id: 'b', title: 'Óþekkt', map_lat: null, map_lng: null });
    wrap(<MapEventList placed={[a]} unplaced={[b]} selectedId="a" onSelect={onSelect} />);
    const items = screen.getAllByTestId('map-list-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Staðsetning óþekkt')).toBeInTheDocument();
    expect(within(screen.getByTestId('map-list-unplaced')).getByText('Óþekkt')).toBeInTheDocument();
    fireEvent.click(items[1]);
    expect(onSelect).toHaveBeenCalledWith(b);
  });
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
describe('Map view', () => {
  it('home opens on the map by default, queries the next 30 days and opens the sheet from a pin', async () => {
    listMock().mockResolvedValue([makeEvent({ id: 'e1', title: 'Harpa-tónleikar' }), makeEvent({ id: 'e2', title: 'Hvergi', map_lat: null, map_lng: null })]);
    wrap(<HomePage />);
    expect(await screen.findByTestId('map-view')).toBeInTheDocument();
    await waitFor(() => expect(listMock()).toHaveBeenCalled());
    const params = listMock().mock.calls[0][0]!;
    expect(params).toEqual(expect.objectContaining({ sort: 'date', limit: 800 }));
    expect(typeof params.from).toBe('string');
    expect(typeof params.to).toBe('string');

    const pins = await screen.findAllByTestId('pin');
    expect(pins).toHaveLength(1); // the unplaced event is not pinned
    expect(screen.getByTestId('map-count')).toHaveTextContent('2 viðburðir');
    fireEvent.click(pins[0]);
    expect(await screen.findByTestId('event-sheet')).toHaveTextContent('Harpa-tónleikar');
  });

  it('day chips write ?dagur and the toggle switches to the list and remembers it', async () => {
    wrap(<HomePage />);
    await screen.findByTestId('map-view');
    fireEvent.click(screen.getByRole('button', { name: 'Á morgun' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toMatch(/dagur=\d{4}-\d{2}-\d{2}/));
    fireEvent.click(screen.getByRole('button', { name: 'Listi' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Viðburðir' })).toBeInTheDocument();
    expect(window.localStorage.getItem('midatorg-view')).toBe('list');
  });

  it('shows the empty state with a way back to the next 30 days', async () => {
    listMock().mockResolvedValue([]);
    wrap(<MapPage />, '/midatorg/kort?dagur=2099-01-02');
    expect(await screen.findByTestId('map-empty')).toHaveTextContent('Engir viðburðir þennan dag');
    fireEvent.click(screen.getByRole('button', { name: 'Sýna næstu 30 daga' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).not.toMatch(/dagur=/));
  });

  it('a search always shows the list', async () => {
    wrap(<HomePage />, '/midatorg?q=harpa');
    expect(await screen.findByTestId('home-query')).toBeInTheDocument();
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });
});
