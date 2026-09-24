/**
 * Admin / about / notifications module tests. The api modules are mocked with
 * vi.mock, so nothing touches the network.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider, dictionaries } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type {
  DealWithContext,
  MarketEvent,
  Notification,
  Profile,
  PublicProfile,
  ReportWithContext,
  Setting,
} from '../lib/types';

const { authState, toastMock } = vi.hoisted(() => ({
  authState: { current: null as unknown },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return {
    supabase: makeSupabaseMock({ data: [{ id: 'l1', event_id: 'e1' }], error: null, count: null }),
    requireUid: () => Promise.resolve('admin1'),
    PROOF_BUCKET: 'p',
    AVATAR_BUCKET: 'a',
  };
});

vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return { ...actual, useAuth: () => authState.current as AuthContextValue };
});

vi.mock('../lib/api/admin', () => ({
  listReports: vi.fn(),
  resolveReport: vi.fn(),
  searchUsers: vi.fn(),
  setBan: vi.fn(),
  setVerification: vi.fn(),
  listAllEvents: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  fetchTixEvent: vi.fn(),
  runTixImport: vi.fn(),
  listDisputes: vi.fn(),
  getSettings: vi.fn(),
  setSetting: vi.fn(),
}));

vi.mock('../lib/api/notifications', () => ({
  listNotifications: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscribeNotifications: vi.fn(() => () => undefined),
}));

vi.mock('../lib/api/profiles', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  getPublicProfilesMap: vi.fn(async () => new Map()),
  uploadAvatar: vi.fn(),
}));

vi.mock('../lib/api/deals', () => ({
  withDealContext: vi.fn(),
  reserveListing: vi.fn(),
  transitionDeal: vi.fn(),
  listMyDeals: vi.fn(),
  getDeal: vi.fn(),
  subscribeDeal: vi.fn(() => () => undefined),
}));

import * as adminApi from '../lib/api/admin';
import * as notificationsApi from '../lib/api/notifications';
import * as profilesApi from '../lib/api/profiles';
import * as dealsApi from '../lib/api/deals';
import {
  dealAmount,
  eventToValues,
  fromDateTimeLocal,
  isKnownSettingKey,
  isTixUrl,
  parseEmailList,
  parseWholeNumber,
  settingBoolean,
  settingNumber,
  settingStringList,
  toDateTimeLocal,
  valuesToPatch,
} from '../components/admin/adminUtils';
import { ReportsTable } from '../components/admin/ReportsTable';
import { UsersTable } from '../components/admin/UsersTable';
import { EventsTable } from '../components/admin/EventsTable';
import { ImportPanel } from '../components/admin/ImportPanel';
import { DisputesTable } from '../components/admin/DisputesTable';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import AdminPage from '../pages/AdminPage';
import AboutPage, { CONTACT_EMAIL } from '../pages/AboutPage';
import NotificationsPage from '../pages/NotificationsPage';

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------
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

const adminProfile: Profile = {
  id: 'admin1',
  display_name: 'Stjórnandi',
  avatar_url: null,
  bio: null,
  verification: 'phone',
  phone_verified_at: null,
  role: 'admin',
  banned_at: null,
  ban_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const gudrun: Profile = {
  ...adminProfile,
  id: 'u1',
  display_name: 'Guðrún Jóns',
  role: 'user',
  verification: 'none',
  created_at: '2026-02-01T00:00:00Z',
};
const bjarki: Profile = {
  ...adminProfile,
  id: 'u2',
  display_name: 'Bjarki Þór',
  role: 'user',
  verification: 'phone',
  banned_at: '2026-03-01T00:00:00Z',
  ban_reason: 'Svik',
};

function pub(p: Profile, extra: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    verification: p.verification,
    created_at: p.created_at,
    is_banned: !!p.banned_at,
    rating_avg: 0,
    rating_count: 0,
    sales_count: 0,
    purchases_count: 0,
    ...extra,
  };
}

const event: MarketEvent = {
  id: 'e1',
  title: 'Sigur Rós',
  description: null,
  category: 'tonleikar',
  venue_id: null,
  venue_name: 'Harpa',
  city: 'Reykjavík',
  starts_at: '2026-11-14T20:00:00Z',
  status: 'upcoming',
  source: 'tix',
  tix_event_id: '123',
  tix_url: 'https://tix.is/is/event/123/',
  image_url: null,
  face_value_min: 8900,
  face_value_max: 12900,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  tickets_available: 7,
  listings_active: 4,
  min_ask: 8010,
  avg_ask: 8500,
  requests_active: 6,
  wanted_tickets: 23,
  max_bid: 11900,
  sold_count: 2,
  last_sold_price: 9900,
  last_sold_at: null,
};

const report = (over: Partial<ReportWithContext> = {}): ReportWithContext => ({
  id: 'r1',
  reporter_id: 'u1',
  reported_user_id: 'u2',
  listing_id: 'l1',
  deal_id: 'd1',
  reason: 'fraud',
  details: 'Sendi aldrei miðann.',
  status: 'open',
  resolved_by: null,
  resolved_at: null,
  created_at: '2026-05-01T10:00:00Z',
  reporter: pub(gudrun),
  reported_user: pub(bjarki),
  ...over,
});

const deal: DealWithContext = {
  id: 'd1',
  listing_id: 'l1',
  event_id: 'e1',
  buyer_id: 'u1',
  seller_id: 'u2',
  quantity: 2,
  price_per_ticket: 8900,
  status: 'disputed',
  reserved_until: '2026-05-01T10:30:00Z',
  paid_claimed_at: '2026-05-01T10:10:00Z',
  ticket_sent_at: null,
  completed_at: null,
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: 'Fékk aldrei miðann',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-02T10:00:00Z',
  event: { ...event },
  buyer: pub(gudrun),
  seller: pub(bjarki),
  listing: {
    id: 'l1',
    event_id: 'e1',
    seller_id: 'u2',
    quantity: 2,
    quantity_remaining: 0,
    face_value: 8900,
    asking_price: 8900,
    ticket_type: null,
    seat_info: null,
    notes: null,
    split_allowed: true,
    status: 'reserved',
    expires_at: null,
    created_at: '2026-04-30T10:00:00Z',
    updated_at: '2026-04-30T10:00:00Z',
  } as DealWithContext['listing'],
};

const settings: Setting[] = [
  { key: 'admin_emails', value: ['admin@example.is'], updated_at: '2026-01-01T00:00:00Z' },
  { key: 'max_active_listings', value: 10, updated_at: '2026-01-01T00:00:00Z' },
  { key: 'max_active_requests', value: 10, updated_at: '2026-01-01T00:00:00Z' },
  { key: 'max_active_reservations', value: 5, updated_at: '2026-01-01T00:00:00Z' },
  { key: 'max_quantity_per_listing', value: 10, updated_at: '2026-01-01T00:00:00Z' },
  { key: 'require_phone_to_sell', value: false, updated_at: '2026-01-01T00:00:00Z' },
  { key: 'reservation_minutes', value: 45, updated_at: '2026-01-01T00:00:00Z' },
];

const notification = (over: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  user_id: 'admin1',
  type: 'deal',
  title: 'Miðar teknir frá',
  body: 'Sigur Rós — 2 miðar',
  link: '/midatorg/vidskipti/d1',
  ref_id: 'd1',
  read_at: null,
  created_at: '2026-05-01T10:00:00Z',
  ...over,
});

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function wrap(ui: ReactNode, path = '/midatorg/stjorn') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">
          {ui}
          <LocationDisplay />
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const asAdmin = () =>
  auth({
    user: { id: 'admin1', email: 'admin@example.is' } as AuthContextValue['user'],
    session: {} as AuthContextValue['session'],
    profile: adminProfile,
    isAdmin: true,
  });

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = asAdmin();
  vi.mocked(profilesApi.getPublicProfilesMap).mockResolvedValue(new Map());
  vi.mocked(adminApi.getSettings).mockResolvedValue(settings);
});

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------
describe('adminUtils', () => {
  it('isTixUrl accepts tix.is hosts only', () => {
    expect(isTixUrl('https://tix.is/is/event/123/')).toBe(true);
    expect(isTixUrl('  http://www.tix.is/is/event/1/ ')).toBe(true);
    expect(isTixUrl('https://example.com/tix.is')).toBe(false);
    expect(isTixUrl('https://nottix.is/x')).toBe(false);
    expect(isTixUrl('tix.is/is/event/1/')).toBe(false);
    expect(isTixUrl('javascript:alert(1)')).toBe(false);
    expect(isTixUrl('')).toBe(false);
  });

  it('parseWholeNumber only accepts whole numbers at or above min', () => {
    expect(parseWholeNumber('12')).toBe(12);
    expect(parseWholeNumber(' 7 ')).toBe(7);
    expect(parseWholeNumber('0')).toBe(0);
    expect(parseWholeNumber('0', 1)).toBeNull();
    expect(parseWholeNumber('-3')).toBeNull();
    expect(parseWholeNumber('1.5')).toBeNull();
    expect(parseWholeNumber('abc')).toBeNull();
    expect(parseWholeNumber('')).toBeNull();
  });

  it('datetime-local conversion round-trips and rejects garbage', () => {
    const iso = fromDateTimeLocal('2026-11-14T20:00');
    expect(iso).not.toBeNull();
    expect(toDateTimeLocal(iso)).toBe('2026-11-14T20:00');
    expect(toDateTimeLocal('')).toBe('');
    expect(toDateTimeLocal('not a date')).toBe('');
    expect(fromDateTimeLocal('')).toBeNull();
    expect(fromDateTimeLocal('garbage')).toBeNull();
  });

  it('reads jsonb settings defensively', () => {
    expect(settingNumber(30)).toBe(30);
    expect(settingNumber('30')).toBe(30);
    expect(settingNumber('x')).toBeNull();
    expect(settingNumber(undefined)).toBeNull();
    expect(settingBoolean(true)).toBe(true);
    expect(settingBoolean('true')).toBe(true);
    expect(settingBoolean('nope')).toBe(false);
    expect(settingBoolean(undefined)).toBe(false);
    expect(settingStringList(['a@b.is', 3, 'c@d.is'])).toEqual(['a@b.is', 'c@d.is']);
    expect(settingStringList('one@x.is')).toEqual(['one@x.is']);
    expect(settingStringList(null)).toEqual([]);
    expect(isKnownSettingKey('reservation_minutes')).toBe(true);
    expect(isKnownSettingKey('something_else')).toBe(false);
  });

  it('parseEmailList lower-cases, de-duplicates and reports invalid entries', () => {
    const { emails, invalid } = parseEmailList('Admin@Example.is\nadmin@example.is, other@x.is; bad\n\n');
    expect(emails).toEqual(['admin@example.is', 'other@x.is']);
    expect(invalid).toEqual(['bad']);
  });

  it('dealAmount multiplies quantity by price', () => {
    expect(dealAmount({ quantity: 2, price_per_ticket: 8900 })).toBe(17800);
  });

  it('maps an event to form values and back to a patch', () => {
    const values = eventToValues(event);
    expect(values.title).toBe('Sigur Rós');
    expect(values.face_value_min).toBe('8900');
    expect(values.starts_at).toBe(toDateTimeLocal(event.starts_at));
    const patch = valuesToPatch({ ...values, venue_name: '  ', city: '', tix_url: '', face_value_max: '' });
    expect(patch).toMatchObject({ title: 'Sigur Rós', venue_name: null, city: null, tix_url: null, face_value_min: 8900, face_value_max: null, status: 'upcoming' });
    expect(patch.starts_at).toBe(new Date(event.starts_at).toISOString());
  });
});

describe('admin dictionary', () => {
  it('has the page titles in both languages', () => {
    for (const key of ['admin.title', 'about.title', 'notifPage.subtitle']) {
      expect(dictionaries.admin.is[key]).toBeTruthy();
      expect(dictionaries.admin.en[key]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// AdminPage
// ---------------------------------------------------------------------------
describe('AdminPage', () => {
  it('shows an error state for non-admins even inside the route', () => {
    authState.current = auth({ user: { id: 'u1' } as AuthContextValue['user'], profile: gudrun, isAdmin: false });
    wrap(<AdminPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Enginn aðgangur');
    expect(screen.queryByText('Stjórnborð')).not.toBeInTheDocument();
  });

  it('renders the five tabs with Tilkynningar first and honours ?flipi=', async () => {
    vi.mocked(adminApi.listReports).mockResolvedValue([]);
    vi.mocked(adminApi.getSettings).mockResolvedValue(settings);
    wrap(<AdminPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Stjórnborð');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Tilkynningar', 'Notendur', 'Viðburðir', 'Ágreiningur', 'Stillingar']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Engar opnar tilkynningar')).toBeInTheDocument();
  });

  it('opens the settings tab from the URL', async () => {
    wrap(<AdminPage />, '/midatorg/stjorn?flipi=stillingar');
    expect(screen.getByRole('tab', { name: 'Stillingar' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('Frátektartími')).toHaveValue(45);
  });
});

// ---------------------------------------------------------------------------
// ReportsTable
// ---------------------------------------------------------------------------
describe('ReportsTable', () => {
  it('lists open reports with target links and resolves one', async () => {
    vi.mocked(adminApi.listReports).mockResolvedValue([report(), report({ id: 'r2', reason: 'other', details: null, listing_id: null, deal_id: null })]);
    vi.mocked(adminApi.resolveReport).mockResolvedValue(undefined);
    wrap(<ReportsTable />);
    expect(await screen.findByText('Svik / falskur miði')).toBeInTheDocument();
    expect(screen.getByText('Annað')).toBeInTheDocument();
    expect(screen.getByText('Engin lýsing fylgdi.')).toBeInTheDocument();
    expect(screen.getAllByTestId('report-row')).toHaveLength(2);

    const first = screen.getAllByTestId('report-row')[0];
    expect(within(first).getByRole('link', { name: 'Guðrún Jóns' })).toHaveAttribute('href', '/midatorg/notendur/u1');
    expect(await within(first).findByRole('link', { name: 'Viðburður miðanna' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(first).getByRole('link', { name: 'Notandasíða' })).toHaveAttribute('href', '/midatorg/notendur/u2');
    expect(within(first).getByRole('link', { name: 'Viðskiptaherbergi' })).toHaveAttribute('href', '/midatorg/vidskipti/d1');

    fireEvent.click(within(first).getByRole('button', { name: 'Leysa' }));
    await waitFor(() => expect(adminApi.resolveReport).toHaveBeenCalledWith('r1', 'resolved'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Tilkynning merkt leyst.'));
  });

  it('dismisses a report and switches the filter', async () => {
    vi.mocked(adminApi.listReports).mockResolvedValue([report()]);
    vi.mocked(adminApi.resolveReport).mockResolvedValue(undefined);
    wrap(<ReportsTable />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hafna' }));
    await waitFor(() => expect(adminApi.resolveReport).toHaveBeenCalledWith('r1', 'dismissed'));
    fireEvent.click(screen.getByRole('button', { name: 'Allar' }));
    await waitFor(() => expect(adminApi.listReports).toHaveBeenLastCalledWith('all'));
    expect(screen.getByRole('button', { name: 'Allar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the empty state and the error state with retry', async () => {
    vi.mocked(adminApi.listReports).mockResolvedValueOnce([]);
    const { unmount } = wrap(<ReportsTable />);
    expect(await screen.findByText('Engar opnar tilkynningar')).toBeInTheDocument();
    unmount();

    vi.mocked(adminApi.listReports).mockRejectedValueOnce(new Error('NETWORK')).mockResolvedValueOnce([report()]);
    wrap(<ReportsTable />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Náði ekki sambandi við Miðatorg');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByText('Svik / falskur miði')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// UsersTable
// ---------------------------------------------------------------------------
describe('UsersTable', () => {
  it('lists users with rating, sales and ban status, and bans with a reason', async () => {
    vi.mocked(adminApi.searchUsers).mockResolvedValue([gudrun, bjarki]);
    vi.mocked(profilesApi.getPublicProfilesMap).mockResolvedValue(
      new Map([
        ['u1', pub(gudrun, { rating_avg: 4.87, rating_count: 12, sales_count: 9 })],
        ['u2', pub(bjarki)],
      ]),
    );
    vi.mocked(adminApi.setBan).mockResolvedValue(undefined);
    wrap(<UsersTable />);

    const rows = await screen.findAllByTestId('user-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('link', { name: 'Guðrún Jóns' })).toHaveAttribute('href', '/midatorg/notendur/u1');
    expect(await within(rows[0]).findByText('4,9')).toBeInTheDocument();
    expect(within(rows[0]).getByText('9')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Virkur')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Lokaður')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ástæða: Svik')).toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: 'Opna aðgang' })).toBeInTheDocument();
    expect(within(rows[0]).getByRole('combobox', { name: 'Staðfestingarstig — Guðrún Jóns' })).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Loka aðgangi' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Loka aðgangi — Guðrún Jóns');
    fireEvent.change(within(dialog).getByLabelText(/Ástæða/), { target: { value: 'Endurtekin svik' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Loka aðgangi' }));
    await waitFor(() => expect(adminApi.setBan).toHaveBeenCalledWith('u1', true, 'Endurtekin svik'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Aðgangi lokað.'));
  });

  it('lifts a ban without a reason and searches by the typed query', async () => {
    vi.mocked(adminApi.searchUsers).mockResolvedValue([bjarki]);
    vi.mocked(adminApi.setBan).mockResolvedValue(undefined);
    wrap(<UsersTable />);
    fireEvent.click(await screen.findByRole('button', { name: 'Opna aðgang' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Opna aðgang' }));
    await waitFor(() => expect(adminApi.setBan).toHaveBeenCalledWith('u2', false, null));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Leita að notanda' }), { target: { value: 'bjarki' } });
    await waitFor(() => expect(adminApi.searchUsers).toHaveBeenCalledWith('bjarki'), { timeout: 2000 });
  });

  it('shows the empty state', async () => {
    vi.mocked(adminApi.searchUsers).mockResolvedValue([]);
    wrap(<UsersTable />);
    expect(await screen.findByText('Engir notendur fundust')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EventsTable + EventEditDialog
// ---------------------------------------------------------------------------
describe('EventsTable', () => {
  it('renders event rows and deletes after confirmation', async () => {
    vi.mocked(adminApi.listAllEvents).mockResolvedValue([event]);
    vi.mocked(adminApi.deleteEvent).mockResolvedValue(undefined);
    wrap(<EventsTable />);
    const row = await screen.findByTestId('event-row');
    expect(within(row).getByRole('link', { name: 'Sigur Rós' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(row).getByText('Harpa')).toBeInTheDocument();
    expect(within(row).getByText('Tónleikar')).toBeInTheDocument();
    expect(within(row).getByText('Væntanlegur')).toBeInTheDocument();
    expect(within(row).getByText('tix.is')).toBeInTheDocument();
    expect(within(row).getByText('4 seljendur · 7 miðar')).toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Eyða viðburði: Sigur Rós' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Eyða viðburðinum „Sigur Rós“?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eyða' }));
    await waitFor(() => expect(adminApi.deleteEvent).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Viðburði eytt.'));
  });

  it('edits an event: validates the title, then saves a patch', async () => {
    vi.mocked(adminApi.listAllEvents).mockResolvedValue([event]);
    vi.mocked(adminApi.updateEvent).mockResolvedValue({ ...event });
    wrap(<EventsTable />);
    const row = await screen.findByTestId('event-row');
    fireEvent.click(within(row).getByRole('button', { name: 'Breyta viðburði: Sigur Rós' }));
    const dialog = await screen.findByRole('dialog');
    const title = within(dialog).getByLabelText('Titill');
    expect(title).toHaveValue('Sigur Rós');
    expect(within(dialog).getByLabelText('Miðaverð, lægst')).toHaveValue(8900);

    fireEvent.change(title, { target: { value: 'X' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vista' }));
    expect(await within(dialog).findByText('Titill þarf að vera 2–200 stafir.')).toBeInTheDocument();
    expect(adminApi.updateEvent).not.toHaveBeenCalled();

    fireEvent.change(title, { target: { value: 'Sigur Rós – aukatónleikar' } });
    fireEvent.change(within(dialog).getByLabelText('Miðaverð, hæst'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vista' }));
    await waitFor(() => expect(adminApi.updateEvent).toHaveBeenCalledTimes(1));
    const [id, patch] = vi.mocked(adminApi.updateEvent).mock.calls[0];
    expect(id).toBe('e1');
    expect(patch).toMatchObject({ title: 'Sigur Rós – aukatónleikar', category: 'tonleikar', venue_name: 'Harpa', face_value_min: 8900, face_value_max: null, status: 'upcoming' });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Viðburður vistaður.'));
  });

  it('shows an empty state', async () => {
    vi.mocked(adminApi.listAllEvents).mockResolvedValue([]);
    wrap(<EventsTable />);
    expect(await screen.findByText('Engir viðburðir fundust')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ImportPanel
// ---------------------------------------------------------------------------
describe('ImportPanel', () => {
  it('rejects non tix.is URLs client-side and imports valid ones', async () => {
    vi.mocked(adminApi.fetchTixEvent).mockResolvedValue({ eventId: 'e9' });
    wrap(<ImportPanel />);
    const input = screen.getByLabelText('Slóð á viðburð á tix.is');
    fireEvent.change(input, { target: { value: 'https://example.com/event' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sækja viðburð' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Slóðin þarf að vera á tix.is.');
    expect(adminApi.fetchTixEvent).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'https://tix.is/is/event/999/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sækja viðburð' }));
    await waitFor(() => expect(adminApi.fetchTixEvent).toHaveBeenCalledWith('https://tix.is/is/event/999/'));
    expect(await screen.findByRole('link', { name: 'Opna viðburðinn' })).toHaveAttribute('href', '/midatorg/vidburdir/e9');
  });

  it('shows the edge-function error inline', async () => {
    vi.mocked(adminApi.fetchTixEvent).mockRejectedValue(new Error('NOT_ALLOWED'));
    wrap(<ImportPanel />);
    fireEvent.change(screen.getByLabelText('Slóð á viðburð á tix.is'), { target: { value: 'https://tix.is/is/event/1/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sækja viðburð' }));
    expect(await screen.findByText('Þú hefur ekki heimild til þess.')).toBeInTheDocument();
  });

  it('runs the importer and shows the counts', async () => {
    vi.mocked(adminApi.runTixImport).mockResolvedValue({ scanned: 12, inserted: 3, updated: 4, errors: ['event 5: no JSON-LD'] });
    wrap(<ImportPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyra innflutning núna' }));
    await waitFor(() => expect(adminApi.runTixImport).toHaveBeenCalled());
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Innflutningi lokið');
    expect(within(status).getByText('12')).toBeInTheDocument();
    expect(within(status).getByText('3')).toBeInTheDocument();
    expect(within(status).getByText('4')).toBeInTheDocument();
    expect(within(status).getByText('event 5: no JSON-LD')).toBeInTheDocument();
  });

  it('renders `{ id, message }` error objects from the edge function as text instead of crashing', async () => {
    vi.mocked(adminApi.runTixImport).mockResolvedValue({
      scanned: 60,
      inserted: 0,
      updated: 59,
      errors: [{ id: 'tix-41207', message: 'HTTP 500' }, { id: 'category/leikhus', message: 'PARSE_FAILED' }],
    } as unknown as Awaited<ReturnType<typeof adminApi.runTixImport>>);
    wrap(<ImportPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyra innflutning núna' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Innflutningi lokið');
    expect(within(status).getByText('2')).toBeInTheDocument();
    expect(within(status).getByText('tix-41207: HTTP 500')).toBeInTheDocument();
    expect(within(status).getByText('category/leikhus: PARSE_FAILED')).toBeInTheDocument();
  });

  it('copes with a result that carries no counts or error list', async () => {
    vi.mocked(adminApi.runTixImport).mockResolvedValue({} as Awaited<ReturnType<typeof adminApi.runTixImport>>);
    wrap(<ImportPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyra innflutning núna' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Innflutningi lokið');
    expect(within(status).getAllByText('0')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// DisputesTable
// ---------------------------------------------------------------------------
describe('DisputesTable', () => {
  it('lists disputes with parties and amount, and completes one', async () => {
    vi.mocked(adminApi.listDisputes).mockResolvedValue([deal]);
    vi.mocked(dealsApi.transitionDeal).mockResolvedValue({ ...deal, status: 'completed' });
    wrap(<DisputesTable />);
    const row = await screen.findByTestId('dispute-row');
    expect(within(row).getByRole('link', { name: 'Sigur Rós' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(row).getByRole('link', { name: /Guðrún Jóns/ })).toHaveAttribute('href', '/midatorg/notendur/u1');
    expect(within(row).getByText('Kaupandi')).toBeInTheDocument();
    expect(within(row).getByText('Seljandi')).toBeInTheDocument();
    expect(within(row).getByText('17.800 kr.')).toBeInTheDocument();
    expect(within(row).getByText('2 × 8.900 kr.')).toBeInTheDocument();
    expect(within(row).getByText('Fékk aldrei miðann')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Opna viðskipti' })).toHaveAttribute('href', '/midatorg/vidskipti/d1');

    fireEvent.click(within(row).getByRole('button', { name: 'Ljúka viðskiptum' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ljúka viðskiptum' }));
    await waitFor(() => expect(dealsApi.transitionDeal).toHaveBeenCalledWith('d1', 'admin_complete', null));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Viðskiptum lokið.'));
  });

  it('cancels with a reason', async () => {
    vi.mocked(adminApi.listDisputes).mockResolvedValue([deal]);
    vi.mocked(dealsApi.transitionDeal).mockResolvedValue({ ...deal, status: 'cancelled' });
    wrap(<DisputesTable />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fella niður' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText(/Ástæða/), { target: { value: 'Seljandi svaraði ekki' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fella niður' }));
    await waitFor(() => expect(dealsApi.transitionDeal).toHaveBeenCalledWith('d1', 'admin_cancel', 'Seljandi svaraði ekki'));
  });

  it('shows the empty state', async () => {
    vi.mocked(adminApi.listDisputes).mockResolvedValue([]);
    wrap(<DisputesTable />);
    expect(await screen.findByText('Enginn opinn ágreiningur')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------
describe('SettingsPanel', () => {
  it('saves a changed number, toggles the switch and validates the email list', async () => {
    vi.mocked(adminApi.setSetting).mockImplementation(async (key, value) => ({ key, value, updated_at: '2026-06-01T00:00:00Z' }));
    wrap(<SettingsPanel />);
    const minutes = await screen.findByLabelText('Frátektartími');
    expect(minutes).toHaveValue(45);
    const minutesForm = minutes.closest('form') as HTMLFormElement;
    const save = within(minutesForm).getByRole('button', { name: 'Vista' });
    expect(save).toBeDisabled();
    fireEvent.change(minutes, { target: { value: '0' } });
    expect(screen.getByText('Sláðu inn heila tölu, 1 eða hærri.')).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(minutes, { target: { value: '20' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(adminApi.setSetting).toHaveBeenCalledWith('reservation_minutes', 20));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Stilling vistuð.'));

    const toggle = screen.getByRole('switch', { name: 'Krefjast staðfests símanúmers til að selja' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    await waitFor(() => expect(adminApi.setSetting).toHaveBeenCalledWith('require_phone_to_sell', true));

    const emails = screen.getByLabelText('Netföng stjórnenda');
    expect(emails).toHaveValue('admin@example.is');
    const emailsSave = within(emails.closest('form') as HTMLFormElement).getByRole('button', { name: 'Vista' });
    fireEvent.change(emails, { target: { value: 'admin@example.is\nekki-netfang' } });
    expect(screen.getByText('Ógild netföng: ekki-netfang')).toBeInTheDocument();
    expect(emailsSave).toBeDisabled();
    fireEvent.change(emails, { target: { value: 'admin@example.is\nNy@Example.is' } });
    fireEvent.click(emailsSave);
    await waitFor(() => expect(adminApi.setSetting).toHaveBeenCalledWith('admin_emails', ['admin@example.is', 'ny@example.is']));
  });

  it('shows the error state with retry', async () => {
    vi.mocked(adminApi.getSettings).mockRejectedValueOnce(new Error('fetch failed'));
    wrap(<SettingsPanel />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('button', { name: 'Reyna aftur' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NotificationsPage
// ---------------------------------------------------------------------------
describe('NotificationsPage', () => {
  it('lists notifications newest first, marks one read on click and navigates', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([
      notification(),
      notification({ id: 'n2', title: 'Þú fékkst einkunn', body: null, link: '/midatorg/notendur/admin1', read_at: '2026-04-30T00:00:00Z', type: 'rating' }),
    ]);
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(1);
    vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tilkynningar');
    const rows = await screen.findAllByTestId('notification-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-unread', 'true');
    expect(rows[1]).not.toHaveAttribute('data-unread');
    expect(within(rows[0]).getByRole('img', { name: 'Ólesin' })).toBeInTheDocument();
    expect(await screen.findByText('1 ólesin')).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button'));
    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith('n1'));
    expect(screen.getByTestId('location')).toHaveTextContent('/midatorg/vidskipti/d1');
  });

  it('marks everything read', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([notification()]);
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(1);
    vi.mocked(notificationsApi.markAllRead).mockResolvedValue(undefined);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    const button = await screen.findByRole('button', { name: 'Merkja allt lesið' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(notificationsApi.markAllRead).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Allar tilkynningar merktar lesnar.'));
  });

  it('shows the empty state with a link to the market', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([]);
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    expect(await screen.findByText('Engar tilkynningar enn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða viðburði' })).toHaveAttribute('href', '/midatorg');
    expect(screen.getByRole('button', { name: 'Allt lesið' })).toBeDisabled();
  });

  it('shows the error state', async () => {
    vi.mocked(notificationsApi.listNotifications).mockRejectedValue(new Error('fetch failed'));
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    expect(await screen.findByRole('alert')).toHaveTextContent('Náði ekki sambandi við Miðatorg');
  });

  it('offers "Sækja eldri" when the window is full and widens the limit', async () => {
    const full = Array.from({ length: 50 }, (_, i) => notification({ id: `n${i}`, read_at: '2026-04-30T00:00:00Z' }));
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce(full).mockResolvedValueOnce([...full, notification({ id: 'old', title: 'Gömul tilkynning', read_at: '2026-04-30T00:00:00Z' })]);
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    expect(await screen.findAllByTestId('notification-row')).toHaveLength(50);
    expect(notificationsApi.listNotifications).toHaveBeenLastCalledWith(50);
    fireEvent.click(screen.getByRole('button', { name: 'Sækja eldri' }));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenLastCalledWith(100));
    expect(await screen.findByText('Gömul tilkynning')).toBeInTheDocument();
    expect(screen.getAllByTestId('notification-row')).toHaveLength(51);
    // 51 < 100: nothing older to fetch
    expect(screen.queryByRole('button', { name: 'Sækja eldri' })).not.toBeInTheDocument();
  });

  it('pluralises the unread line the Icelandic way (21 ólesin)', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue([notification()]);
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(21);
    wrap(<NotificationsPage />, '/midatorg/tilkynningar');
    expect(await screen.findByText('21 ólesin')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AboutPage
// ---------------------------------------------------------------------------
describe('AboutPage', () => {
  it('renders every section, the footer anchors, the live reservation time and the contact link', async () => {
    authState.current = auth({});
    wrap(<AboutPage />, '/midatorg/um#reglur');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Um Miðatorg');
    for (const id of ['hvernig', 'reglur', 'oryggi', 'tix', 'samband']) {
      expect(document.getElementById(id)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Hvernig virkar Miðatorg' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reglur' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Öryggisráð' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Um tix.is' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hafa samband' })).toBeInTheDocument();
    expect(screen.getByText('Verð aldrei hærra en miðaverð')).toBeInTheDocument();
    expect(await screen.findByText(/fráteknir fyrir þig í 45 mínútur/)).toBeInTheDocument();
    if (CONTACT_EMAIL) {
      expect(screen.getByRole('link', { name: 'Senda tölvupóst' })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    } else {
      // no monitored mailbox yet: a marked placeholder, never a dead mailto
      expect(screen.queryByRole('link', { name: 'Senda tölvupóst' })).not.toBeInTheDocument();
      expect(screen.getByTestId('contact-pending')).toHaveTextContent('[netfang]');
    }
    expect(screen.getByRole('link', { name: /Fara á tix.is/ })).toHaveAttribute('href', 'https://tix.is');
    expect(screen.getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja');
  });

  it('falls back to 30 minutes when settings are unavailable and reads in English', async () => {
    authState.current = auth({});
    vi.mocked(adminApi.getSettings).mockRejectedValueOnce(new Error('fetch failed'));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/midatorg/um']}>
        <QueryClientProvider client={qc}>
          <I18nProvider initialLocale="en">
            <AboutPage />
          </I18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About Miðatorg');
    expect(screen.getByText(/held for you for 30 minutes/)).toBeInTheDocument();
  });
});
