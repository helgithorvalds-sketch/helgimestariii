import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type {
  AlertWithEvent,
  EventRow,
  ListingWithEvent,
  MarketEvent,
  Profile,
  PublicProfile,
  RatingWithRater,
  RequestWithEvent,
} from '../lib/types';

// input-otp measures its container; jsdom has no ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

const { authState, toastMock } = vi.hoisted(() => ({
  authState: { current: null as unknown },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return { supabase: makeSupabaseMock(), requireUid: () => Promise.resolve('u1'), PROOF_BUCKET: 'p', AVATAR_BUCKET: 'a' };
});

vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return { ...actual, useAuth: () => authState.current as AuthContextValue };
});

vi.mock('../lib/api/listings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/listings')>()),
  listMyListings: vi.fn(),
  listUserListings: vi.fn(),
  updateListing: vi.fn(),
  cancelListing: vi.fn(),
  getMyProof: vi.fn(),
  uploadProof: vi.fn(),
}));
vi.mock('../lib/api/requests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/requests')>()),
  listMyRequests: vi.fn(),
  cancelRequest: vi.fn(),
}));
vi.mock('../lib/api/alerts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/alerts')>()),
  listMyAlerts: vi.fn(),
  removeAlert: vi.fn(),
}));
vi.mock('../lib/api/ratings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/ratings')>()),
  listRatingsForUser: vi.fn(),
}));
vi.mock('../lib/api/profiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/profiles')>()),
  getPublicProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

import * as listingsApi from '../lib/api/listings';
import * as requestsApi from '../lib/api/requests';
import * as alertsApi from '../lib/api/alerts';
import * as ratingsApi from '../lib/api/ratings';
import * as profilesApi from '../lib/api/profiles';
import LoginPage from '../pages/LoginPage';
import MyPage from '../pages/MyPage';
import PublicProfilePage from '../pages/PublicProfilePage';
import {
  checkAvatarFile,
  checkProofFile,
  formatPhone,
  listingStatusTone,
  loginSchema,
  normalisePhone,
  parseMyTab,
  profileSchema,
  ratingsCountKey,
  requestStatusTone,
  resolveNext,
  setPasswordSchema,
  signupSchema,
  validateAskingPrice,
} from '../components/account/logic';

// ---------------------------------------------------------------------------
// helpers & fixtures
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

const user = { id: 'u1', email: 'gudrun@example.is', email_confirmed_at: '2026-01-15T00:00:00Z' } as AuthContextValue['user'];

const profile: Profile = {
  id: 'u1',
  display_name: 'Guðrún Jóns',
  avatar_url: null,
  bio: 'Tónleikafíkill',
  verification: 'none',
  phone_verified_at: null,
  role: 'user',
  banned_at: null,
  ban_reason: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const event = {
  id: 'e1',
  title: 'Sigur Rós',
  category: 'tonleikar',
  starts_at: '2026-11-14T20:00:00Z',
  venue_name: 'Harpa',
  city: 'Reykjavík',
  face_value_min: 8900,
  face_value_max: 11900,
  status: 'upcoming',
  source: 'seed',
} as EventRow;

const marketEvent = {
  ...event,
  tickets_available: 4,
  listings_active: 2,
  min_ask: 8900,
  avg_ask: 9500,
  requests_active: 3,
  wanted_tickets: 6,
  max_bid: 9000,
  sold_count: 1,
  last_sold_price: 9000,
  last_sold_at: '2026-09-01T10:00:00Z',
} as MarketEvent;

const activeListing = {
  id: 'l1',
  event_id: 'e1',
  seller_id: 'u1',
  quantity: 4,
  quantity_remaining: 2,
  ticket_type: 'Svalir',
  seat_info: 'Röð 4',
  face_value: 11900,
  asking_price: 8900,
  split_allowed: true,
  notes: null,
  status: 'active',
  expires_at: '2026-11-14T19:00:00Z',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  event,
} as ListingWithEvent;

const soldListing = { ...activeListing, id: 'l2', status: 'sold', quantity_remaining: 0, asking_price: 11900 } as ListingWithEvent;

const request = {
  id: 'r1',
  event_id: 'e1',
  buyer_id: 'u1',
  quantity: 2,
  max_price: 9000,
  notes: 'Helst saman',
  status: 'active',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  event,
} as RequestWithEvent;

const alertWithMax = { id: 'a1', user_id: 'u1', event_id: 'e1', max_price: 9000, created_at: '2026-09-01T10:00:00Z', event: marketEvent } as AlertWithEvent;
const alertAnyPrice = {
  ...alertWithMax,
  id: 'a2',
  event_id: 'e2',
  max_price: null,
  event: { ...marketEvent, id: 'e2', title: 'Laddi', min_ask: null, tickets_available: 0 },
} as AlertWithEvent;

const rater: PublicProfile = {
  id: 'u2',
  display_name: 'Bjarki Þór',
  avatar_url: null,
  bio: null,
  verification: 'phone',
  created_at: '2026-01-15T00:00:00Z',
  is_banned: false,
  rating_avg: 4.8,
  rating_count: 12,
  sales_count: 7,
  purchases_count: 3,
};

const rating = {
  id: 'rt1',
  deal_id: 'd1',
  rater_id: 'u2',
  ratee_id: 'u1',
  score: 5,
  comment: 'Frábær viðskipti, miðinn kom strax.',
  created_at: '2026-09-02T10:00:00Z',
  rater,
} as RatingWithRater;

function wrap(ui: ReactNode, path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">{ui}</I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const loc = useLocation();
  return <p data-testid="location">{loc.pathname + loc.search}</p>;
}

function renderLogin(path = '/midatorg/innskra') {
  return wrap(
    <Routes>
      <Route path="/midatorg/innskra" element={<LoginPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    path,
  );
}

function renderMyPage(path = '/midatorg/eg') {
  return wrap(
    <Routes>
      <Route path="/midatorg/eg" element={<MyPage />} />
    </Routes>,
    path,
  );
}

function renderProfile(id = 'u2') {
  return wrap(
    <Routes>
      <Route path="/midatorg/notendur/:userId" element={<PublicProfilePage />} />
    </Routes>,
    `/midatorg/notendur/${id}`,
  );
}

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const selectTab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = auth({});
  vi.mocked(listingsApi.getMyProof).mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// pure logic
// ---------------------------------------------------------------------------
describe('account logic', () => {
  it('resolveNext only accepts in-app paths', () => {
    expect(resolveNext(null)).toBe('/midatorg');
    expect(resolveNext('/midatorg/selja')).toBe('/midatorg/selja');
    expect(resolveNext('/selja?event=1')).toBe('/midatorg/selja?event=1');
    expect(resolveNext('https://evil.example')).toBe('/midatorg');
    expect(resolveNext('//evil.example')).toBe('/midatorg');
    expect(resolveNext('/midatorg/innskra?next=x')).toBe('/midatorg');
    expect(resolveNext('/x y')).toBe('/midatorg');
  });

  it('parseMyTab falls back to the overview', () => {
    expect(parseMyTab('solur')).toBe('solur');
    expect(parseMyTab('einkunnir')).toBe('einkunnir');
    expect(parseMyTab('nope')).toBe('yfirlit');
    expect(parseMyTab(null)).toBe('yfirlit');
  });

  it('normalises Icelandic and international phone numbers to E.164', () => {
    expect(normalisePhone('666 1234')).toBe('+3546661234');
    expect(normalisePhone('+354 666-1234')).toBe('+3546661234');
    expect(normalisePhone('00354 666 1234')).toBe('+3546661234');
    expect(normalisePhone('3546661234')).toBe('+3546661234');
    expect(normalisePhone('+45 12 34 56 78')).toBe('+4512345678');
    expect(normalisePhone('12345')).toBeNull();
    expect(normalisePhone('abc1234')).toBeNull();
    expect(normalisePhone('')).toBeNull();
    expect(formatPhone('+3546661234')).toBe('+354 666 1234');
    expect(formatPhone('+4512345678')).toBe('+4512345678');
  });

  it('validates the inline asking price against face value', () => {
    expect(validateAskingPrice('8.900', 11900)).toEqual({ ok: true, price: 8900 });
    expect(validateAskingPrice(11900, 11900)).toEqual({ ok: true, price: 11900 });
    expect(validateAskingPrice('12000', 11900)).toEqual({ ok: false, key: 'account.validation.priceAboveFace' });
    expect(validateAskingPrice('', 11900)).toEqual({ ok: false, key: 'account.validation.priceRequired' });
    expect(validateAskingPrice('0', 11900)).toEqual({ ok: false, key: 'account.validation.pricePositive' });
    expect(validateAskingPrice('abc', 11900)).toEqual({ ok: false, key: 'account.validation.pricePositive' });
  });

  it('schemas report i18n keys as messages', () => {
    const login = loginSchema.safeParse({ email: 'nope', password: '' });
    expect(login.success).toBe(false);
    const loginMessages = login.success ? [] : login.error.issues.map((i) => i.message);
    expect(loginMessages).toContain('errors.INVALID_EMAIL');
    expect(loginMessages).toContain('account.validation.passwordRequired');

    const signup = signupSchema.safeParse({ displayName: 'G', email: 'a@b.is', password: '123' });
    const signupMessages = signup.success ? [] : signup.error.issues.map((i) => i.message);
    expect(signupMessages).toContain('account.validation.nameMin');
    expect(signupMessages).toContain('errors.PASSWORD_TOO_SHORT');

    const pw = setPasswordSchema.safeParse({ password: 'leyni123', confirm: 'leyni124' });
    expect(pw.success).toBe(false);
    if (!pw.success) {
      expect(pw.error.issues[0].path).toEqual(['confirm']);
      expect(pw.error.issues[0].message).toBe('account.validation.passwordMismatch');
    }

    const ok = profileSchema.safeParse({ display_name: '  Guðrún  ', bio: '' });
    expect(ok.success && ok.data.display_name).toBe('Guðrún');
  });

  it('checks avatar and proof files client-side', () => {
    const png = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    const pdf = new File([new Uint8Array(10)], 'a.pdf', { type: 'application/pdf' });
    const big = new File([new Uint8Array(10)], 'b.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    expect(checkAvatarFile(png)).toBeNull();
    expect(checkAvatarFile(gif)).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(checkAvatarFile(big)).toBe('FILE_TOO_LARGE');
    expect(checkProofFile(pdf)).toBeNull();
    expect(checkProofFile(gif)).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('status tones and Icelandic plural for ratings', () => {
    expect(listingStatusTone('active')).toContain('text-up');
    expect(listingStatusTone('cancelled')).toContain('text-muted-foreground');
    expect(requestStatusTone('active')).toContain('text-bid');
    expect(ratingsCountKey(1, 'is')).toBe('account.ratings.countOne');
    expect(ratingsCountKey(11, 'is')).toBe('account.ratings.countMany');
    expect(ratingsCountKey(21, 'is')).toBe('account.ratings.countOne');
    expect(ratingsCountKey(21, 'en')).toBe('account.ratings.countMany');
    expect(ratingsCountKey(1, 'en')).toBe('account.ratings.countOne');
  });
});

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------
describe('LoginPage', () => {
  it('renders the tabs, the login form, the passwordless options and the trust list', () => {
    renderLogin();
    expect(screen.getByRole('tab', { name: 'Innskrá' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Nýskrá' })).toBeInTheDocument();
    expect(screen.getByLabelText('Netfang')).toBeInTheDocument();
    expect(screen.getByLabelText('Lykilorð')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Innskrá' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Senda innskráningartengil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gleymt lykilorð?' })).toBeInTheDocument();
    expect(screen.getByText('Engin þóknun')).toBeInTheDocument();
  });

  it('validates locally before calling signIn', async () => {
    const signIn = vi.fn(noop);
    authState.current = auth({ signIn });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Innskrá' }));
    expect(await screen.findByText('Netfang vantar.')).toBeInTheDocument();
    expect(screen.getByText('Lykilorð vantar.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Netfang')).toHaveAttribute('aria-invalid', 'true');
  });

  it('signs in and follows ?next=', async () => {
    const signIn = vi.fn(noop);
    authState.current = auth({ signIn });
    renderLogin('/midatorg/innskra?next=%2Fmidatorg%2Fselja');
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    type(screen.getByLabelText('Lykilorð'), 'leyni123');
    fireEvent.click(screen.getByRole('button', { name: 'Innskrá' }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('gudrun@example.is', 'leyni123'));
    expect(await screen.findByTestId('location')).toHaveTextContent('/midatorg/selja');
    expect(toastMock.success).toHaveBeenCalledWith('Þú ert innskráð(ur)');
  });

  it('shows Supabase auth errors translated, inline and as a toast', async () => {
    const signIn = vi.fn(async () => {
      throw { message: 'Invalid login credentials', status: 400 };
    });
    authState.current = auth({ signIn });
    renderLogin();
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    type(screen.getByLabelText('Lykilorð'), 'rangt');
    fireEvent.click(screen.getByRole('button', { name: 'Innskrá' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rangt netfang eða lykilorð.');
    expect(toastMock.error).toHaveBeenCalledWith('Rangt netfang eða lykilorð.');
    // the button returns to its idle label
    expect(screen.getByRole('button', { name: 'Innskrá' })).toBeEnabled();
  });

  it('signs up with a display name and shows "Staðfestu netfangið þitt" when confirmation is needed', async () => {
    const signUp = vi.fn(async () => ({ needsConfirmation: true, user: null }));
    authState.current = auth({ signUp });
    renderLogin();
    selectTab('Nýskrá');
    type(await screen.findByLabelText('Nafn'), 'Guðrún Jóns');
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    type(screen.getByLabelText('Lykilorð'), 'leyni123');
    fireEvent.click(screen.getByRole('button', { name: 'Stofna aðgang' }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith('gudrun@example.is', 'leyni123', 'Guðrún Jóns'));
    expect(await screen.findByText('Staðfestu netfangið þitt')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('gudrun@example.is');
    expect(screen.queryByRole('button', { name: 'Senda aftur' })).not.toBeInTheDocument();
  });

  it('translates "user already registered" and "weak password" on signup', async () => {
    const signUp = vi.fn(async () => {
      throw { message: 'User already registered', status: 422 };
    });
    authState.current = auth({ signUp });
    renderLogin();
    selectTab('Nýskrá');
    type(await screen.findByLabelText('Nafn'), 'Guðrún Jóns');
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    type(screen.getByLabelText('Lykilorð'), 'leyni123');
    fireEvent.click(screen.getByRole('button', { name: 'Stofna aðgang' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Þetta netfang er þegar skráð.');

    signUp.mockImplementationOnce(async () => {
      throw { code: 'weak_password', message: 'Password is too weak' };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stofna aðgang' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Lykilorðið er of veikt.'));
  });

  it('sends a magic link and offers to resend', async () => {
    const sendMagicLink = vi.fn(noop);
    authState.current = auth({ sendMagicLink });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Senda innskráningartengil' }));
    expect(screen.getByRole('heading', { name: 'Innskráningartengill' })).toBeInTheDocument();
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    fireEvent.click(screen.getByRole('button', { name: 'Senda tengil' }));
    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledWith('gudrun@example.is'));
    expect(await screen.findByText('Tengill sendur')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('gudrun@example.is');
    fireEvent.click(screen.getByRole('button', { name: 'Senda aftur' }));
    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledTimes(2));
    expect(toastMock.success).toHaveBeenCalledWith('Tengill sendur aftur');
    fireEvent.click(screen.getByRole('button', { name: 'Til baka í innskráningu' }));
    expect(screen.getByRole('button', { name: 'Innskrá' })).toBeInTheDocument();
  });

  it('sends a password reset link', async () => {
    const resetPassword = vi.fn(noop);
    authState.current = auth({ resetPassword });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Gleymt lykilorð?' }));
    expect(screen.getByRole('heading', { name: 'Gleymt lykilorð' })).toBeInTheDocument();
    type(screen.getByLabelText('Netfang'), 'gudrun@example.is');
    fireEvent.click(screen.getByRole('button', { name: 'Senda tengil' }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('gudrun@example.is'));
    expect(await screen.findByText('Tengill sendur')).toBeInTheDocument();
  });

  it('redirects a signed-in user to ?next=', async () => {
    authState.current = auth({ user, profile, session: {} as AuthContextValue['session'] });
    renderLogin('/midatorg/innskra?next=%2Fmidatorg%2Fvidskipti');
    expect(await screen.findByTestId('location')).toHaveTextContent('/midatorg/vidskipti');
  });
});

// ---------------------------------------------------------------------------
// MyPage
// ---------------------------------------------------------------------------
describe('MyPage', () => {
  beforeEach(() => {
    authState.current = auth({ user, profile, session: {} as AuthContextValue['session'] });
  });

  it('overview: profile form prefilled and verification rows', () => {
    renderMyPage();
    expect(screen.getByRole('heading', { name: 'Notandasíða' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða opinbera síðu' })).toHaveAttribute('href', '/midatorg/notendur/u1');
    expect(screen.getByLabelText('Nafn')).toHaveValue('Guðrún Jóns');
    expect(screen.getByLabelText(/Kynning/)).toHaveValue('Tónleikafíkill');
    expect(screen.getByText('14/300')).toBeInTheDocument();
    const verification = screen.getByRole('region', { name: 'Staðfesting' });
    expect(verification).toHaveTextContent('gudrun@example.is');
    expect(within(verification).getByText('Staðfest')).toBeInTheDocument();
    expect(within(verification).getByRole('button', { name: 'Staðfesta símanúmer' })).toBeInTheDocument();
    expect(within(verification).getByText('Væntanlegt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vista' })).toBeDisabled();
  });

  it('overview: saves display name and bio', async () => {
    vi.mocked(profilesApi.updateMyProfile).mockResolvedValue({ ...profile, display_name: 'Guðrún J.' });
    renderMyPage();
    type(screen.getByLabelText('Nafn'), 'Guðrún J.');
    fireEvent.click(screen.getByRole('button', { name: 'Vista' }));
    await waitFor(() =>
      expect(profilesApi.updateMyProfile).toHaveBeenCalledWith({ display_name: 'Guðrún J.', bio: 'Tónleikafíkill' }),
    );
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Breytingar vistaðar'));
  });

  it('phone verification: normalises the number, sends the code and verifies the OTP', async () => {
    const startPhoneVerification = vi.fn(noop);
    const verifyPhone = vi.fn(noop);
    authState.current = auth({ user, profile, startPhoneVerification, verifyPhone });
    renderMyPage();
    fireEvent.click(screen.getByRole('button', { name: 'Staðfesta símanúmer' }));
    expect(screen.getByText(/SMS-sendingar geta verið óvirkar/)).toBeInTheDocument();
    type(screen.getByLabelText('Símanúmer'), '666 1234');
    fireEvent.click(screen.getByRole('button', { name: 'Senda kóða' }));
    await waitFor(() => expect(startPhoneVerification).toHaveBeenCalledWith('+3546661234'));
    expect(await screen.findByText('Kóði sendur á +354 666 1234')).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('Kóði sendur á +354 666 1234');

    type(screen.getByLabelText('Staðfestingarkóði'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Staðfesta kóða' }));
    await waitFor(() => expect(verifyPhone).toHaveBeenCalledWith('123456', '+3546661234'));
    expect(toastMock.success).toHaveBeenCalledWith('Símanúmerið er staðfest');
  });

  it('phone verification: rejects a bad number locally and shows the server error verbatim', async () => {
    const startPhoneVerification = vi.fn(async () => {
      throw { code: 'sms_send_failed', message: 'Error sending sms: provider not configured' };
    });
    authState.current = auth({ user, profile, startPhoneVerification });
    renderMyPage();
    fireEvent.click(screen.getByRole('button', { name: 'Staðfesta símanúmer' }));
    type(screen.getByLabelText('Símanúmer'), '12');
    fireEvent.click(screen.getByRole('button', { name: 'Senda kóða' }));
    expect(await screen.findByText('Símanúmerið er ekki gilt.')).toBeInTheDocument();
    expect(startPhoneVerification).not.toHaveBeenCalled();

    type(screen.getByLabelText('Símanúmer'), '666 1234');
    fireEvent.click(screen.getByRole('button', { name: 'Senda kóða' }));
    await waitFor(() => expect(startPhoneVerification).toHaveBeenCalled());
    expect(await screen.findByTestId('phone-server-error')).toHaveTextContent(
      'Villa frá þjóni: Error sending sms: provider not configured',
    );
    expect(toastMock.error).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Senda kóða' })).toBeEnabled();
  });

  it('listings tab: rows with status, inline price edit capped at face value, cancel with confirm', async () => {
    vi.mocked(listingsApi.listMyListings).mockResolvedValue([activeListing, soldListing]);
    vi.mocked(listingsApi.updateListing).mockResolvedValue({ ...activeListing, asking_price: 9000 });
    vi.mocked(listingsApi.cancelListing).mockResolvedValue({ ...activeListing, status: 'cancelled' });
    renderMyPage('/midatorg/eg?flipi=solur');

    const rows = await screen.findAllByTestId('my-listing-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('link', { name: 'Sigur Rós' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(rows[0]).getByText('Virk')).toBeInTheDocument();
    expect(within(rows[0]).getByText('2 af 4 eftir')).toBeInTheDocument();
    expect(within(rows[0]).getByText('8.900 kr.')).toBeInTheDocument();
    expect(within(rows[0]).getByText('−25%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Seld')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: 'Breyta verði' })).not.toBeInTheDocument();
    expect(await within(rows[0]).findByText('Ekkert miðaskjal enn')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: 'Hlaða upp miðaskjali' })).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: 'Hlaða upp miðaskjali' })).not.toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Breyta verði' }));
    const priceInput = within(rows[0]).getByLabelText('Nýtt verð á miða');
    expect(priceInput).toHaveValue('8900');
    type(priceInput, '12000');
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Vista' }));
    expect(await within(rows[0]).findByText('Verð má ekki vera hærra en miðaverð (11.900 kr.).')).toBeInTheDocument();
    expect(listingsApi.updateListing).not.toHaveBeenCalled();

    type(priceInput, '9.000');
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Vista' }));
    await waitFor(() => expect(listingsApi.updateListing).toHaveBeenCalledWith('l1', { asking_price: 9000 }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Verð uppfært'));
    await waitFor(() => expect(within(rows[0]).queryByLabelText('Nýtt verð á miða')).not.toBeInTheDocument());

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Taka úr sölu' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Taka miðana úr sölu?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taka úr sölu' }));
    await waitFor(() => expect(listingsApi.cancelListing).toHaveBeenCalledWith('l1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Miðarnir teknir úr sölu'));
  });

  it('listings tab: empty state links to the sell form; error state retries', async () => {
    vi.mocked(listingsApi.listMyListings).mockResolvedValueOnce([]);
    const { unmount } = renderMyPage('/midatorg/eg?flipi=solur');
    expect(await screen.findByText('Þú hefur ekki skráð neina miða')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja');
    unmount();

    vi.mocked(listingsApi.listMyListings).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce([activeListing]);
    renderMyPage('/midatorg/eg?flipi=solur');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Eitthvað fór úrskeiðis');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByTestId('my-listing-row')).toBeInTheDocument();
  });

  it('requests tab: rows with max price and cancel', async () => {
    vi.mocked(requestsApi.listMyRequests).mockResolvedValue([request, { ...request, id: 'r2', max_price: null, status: 'fulfilled', notes: null }]);
    vi.mocked(requestsApi.cancelRequest).mockResolvedValue({ ...request, status: 'cancelled' });
    renderMyPage('/midatorg/eg?flipi=oskir');
    const rows = await screen.findAllByTestId('my-request-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('2 miðar')).toBeInTheDocument();
    expect(within(rows[0]).getByText('9.000 kr.')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Helst saman')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ekkert hámark')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Uppfyllt')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: 'Hætta við ósk' })).not.toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Hætta við ósk' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hætta við ósk' }));
    await waitFor(() => expect(requestsApi.cancelRequest).toHaveBeenCalledWith('r1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Ósk afturkölluð'));
  });

  it('alerts tab: shows the max price and the current lowest price, removes with confirm', async () => {
    vi.mocked(alertsApi.listMyAlerts).mockResolvedValue([alertWithMax, alertAnyPrice]);
    vi.mocked(alertsApi.removeAlert).mockResolvedValue(undefined);
    renderMyPage('/midatorg/eg?flipi=vaktanir');
    const rows = await screen.findAllByTestId('my-alert-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Miðar á 9.000 kr. eða minna')).toBeInTheDocument();
    expect(within(rows[0]).getByText('8.900 kr.')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Öll verð')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Engir miðar til sölu')).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Hætta að láta vita' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Hætta að láta vita?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fjarlægja' }));
    await waitFor(() => expect(alertsApi.removeAlert).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Þú færð ekki lengur tilkynningar'));
  });

  it('alerts tab: empty state', async () => {
    vi.mocked(alertsApi.listMyAlerts).mockResolvedValue([]);
    renderMyPage('/midatorg/eg?flipi=vaktanir');
    expect(await screen.findByText('Þú fylgist ekki með neinum viðburði')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða viðburði' })).toHaveAttribute('href', '/midatorg');
  });

  it('ratings tab: received ratings and the own-empty copy', async () => {
    vi.mocked(ratingsApi.listRatingsForUser).mockResolvedValueOnce([rating]);
    const { unmount } = renderMyPage('/midatorg/eg?flipi=einkunnir');
    const row = await screen.findByTestId('rating-row');
    expect(within(row).getByRole('link', { name: 'Bjarki Þór' })).toHaveAttribute('href', '/midatorg/notendur/u2');
    expect(within(row).getByRole('img', { name: 'Einkunn 5 af 5' })).toBeInTheDocument();
    expect(within(row).getByText('Frábær viðskipti, miðinn kom strax.')).toBeInTheDocument();
    expect(ratingsApi.listRatingsForUser).toHaveBeenCalledWith('u1');
    unmount();

    vi.mocked(ratingsApi.listRatingsForUser).mockResolvedValueOnce([]);
    renderMyPage('/midatorg/eg?flipi=einkunnir');
    expect(await screen.findByText('Engar einkunnir enn')).toBeInTheDocument();
    expect(screen.getByText('Ljúktu viðskiptum og hinn aðilinn getur gefið þér einkunn.')).toBeInTheDocument();
  });

  it('?reset=1 shows the new-password card, validates the repeat and saves', async () => {
    const updatePassword = vi.fn(noop);
    authState.current = auth({ user, profile, updatePassword });
    renderMyPage('/midatorg/eg?reset=1');
    expect(screen.getByRole('heading', { name: 'Veldu nýtt lykilorð' })).toBeInTheDocument();
    type(screen.getByLabelText('Nýtt lykilorð'), 'nyttlykilord');
    type(screen.getByLabelText('Endurtaka lykilorð'), 'annad');
    fireEvent.click(screen.getByRole('button', { name: 'Vista lykilorð' }));
    expect(await screen.findByText('Lykilorðin stemma ekki.')).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();

    type(screen.getByLabelText('Endurtaka lykilorð'), 'nyttlykilord');
    fireEvent.click(screen.getByRole('button', { name: 'Vista lykilorð' }));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('nyttlykilord'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Lykilorðið er vistað'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Veldu nýtt lykilorð' })).not.toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// PublicProfilePage
// ---------------------------------------------------------------------------
describe('PublicProfilePage', () => {
  beforeEach(() => {
    authState.current = auth({ user, profile, session: {} as AuthContextValue['session'] });
    vi.mocked(profilesApi.getPublicProfile).mockResolvedValue(rater);
    vi.mocked(listingsApi.listUserListings).mockResolvedValue([{ ...activeListing, id: 'l9', seller_id: 'u2', quantity_remaining: 3 }]);
    vi.mocked(ratingsApi.listRatingsForUser).mockResolvedValue([{ ...rating, rater: { ...rater, id: 'u1', display_name: 'Guðrún Jóns' } }]);
  });

  it('renders header, stats, active listings, ratings and the report button', async () => {
    renderProfile('u2');
    expect(await screen.findByRole('heading', { name: 'Bjarki Þór' })).toBeInTheDocument();
    expect(screen.getByText('Staðfestur sími')).toBeInTheDocument();
    expect(screen.getByText('Meðlimur síðan jan. 2026')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Einkunn 4,8 af 5 úr 12 viðskiptum' })).toBeInTheDocument();
    expect(screen.getByText('Sölur').nextElementSibling).toHaveTextContent('7');
    expect(screen.getByText('Kaup').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('(12 einkunnir)')).toBeInTheDocument();
    expect(profilesApi.getPublicProfile).toHaveBeenCalledWith('u2');

    const listing = await screen.findByTestId('user-listing-row');
    expect(within(listing).getByRole('link', { name: 'Sigur Rós' })).toHaveAttribute('href', '/midatorg/vidburdir/e1');
    expect(within(listing).getByText('3 miðar')).toBeInTheDocument();
    expect(within(listing).getByText('8.900 kr.')).toBeInTheDocument();
    expect(listingsApi.listUserListings).toHaveBeenCalledWith('u2');

    expect(await screen.findByTestId('rating-row')).toHaveTextContent('Guðrún Jóns');
    expect(screen.queryByText('Þetta ert þú')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tilkynna notanda' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Varðar: Bjarki Þór');
  });

  it('own profile: no report button, edit link instead', async () => {
    vi.mocked(profilesApi.getPublicProfile).mockResolvedValue({ ...rater, id: 'u1', display_name: 'Guðrún Jóns', verification: 'none', rating_count: 1 });
    renderProfile('u1');
    expect(await screen.findByRole('heading', { name: 'Guðrún Jóns' })).toBeInTheDocument();
    expect(screen.getByText('Þetta ert þú')).toBeInTheDocument();
    expect(screen.getByText('Óstaðfestur')).toBeInTheDocument();
    expect(screen.getByText('(1 einkunn)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Breyta prófíl' })).toHaveAttribute('href', '/midatorg/eg');
    expect(screen.queryByRole('button', { name: 'Tilkynna notanda' })).not.toBeInTheDocument();
  });

  it('shows the banned banner and the empty listings copy', async () => {
    vi.mocked(profilesApi.getPublicProfile).mockResolvedValue({ ...rater, is_banned: true });
    vi.mocked(listingsApi.listUserListings).mockResolvedValue([]);
    renderProfile('u2');
    expect(await screen.findByRole('alert')).toHaveTextContent('Þessi notandi hefur verið lokaður');
    expect(await screen.findByText('Bjarki Þór er ekki með miða til sölu núna.')).toBeInTheDocument();
  });

  it('not found and error states', async () => {
    vi.mocked(profilesApi.getPublicProfile).mockResolvedValueOnce(null);
    const { unmount } = renderProfile('nope');
    expect(await screen.findByText('Notandi fannst ekki')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða viðburði' })).toHaveAttribute('href', '/midatorg');
    unmount();

    vi.mocked(profilesApi.getPublicProfile).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce(rater);
    renderProfile('u2');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Náði ekki sambandi við Miðatorg');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByRole('heading', { name: 'Bjarki Þór' })).toBeInTheDocument();
  });
});
