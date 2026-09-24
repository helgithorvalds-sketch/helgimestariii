import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider, hasKey } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type { Deal, DealAction, DealStatus, DealWithContext, EventRow, Listing, Message, Profile, PublicProfile, Rating } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks: the api modules (never the network), auth and sonner
// ---------------------------------------------------------------------------
const { authState, mocks } = vi.hoisted(() => {
  const unsubscribe = () => undefined;
  return {
    authState: { current: null as unknown },
    mocks: {
      getDeal: vi.fn(),
      listMyDeals: vi.fn(),
      transitionDeal: vi.fn(),
      reserveListing: vi.fn(),
      withDealContext: vi.fn(),
      subscribeDeal: vi.fn((_id: string, _cb: (d: Deal) => void) => unsubscribe),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      subscribeMessages: vi.fn((_id: string, _cb: (m: Message) => void) => unsubscribe),
      getMyRatingForDeal: vi.fn(),
      rateDeal: vi.fn(),
      listRatingsForUser: vi.fn(),
      getProofSignedUrl: vi.fn(),
      getMyProof: vi.fn(),
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
      toastInfo: vi.fn(),
    },
  };
});

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  return { supabase: makeSupabaseMock(), requireUid: () => Promise.resolve('buyer-1'), PROOF_BUCKET: 'p', AVATAR_BUCKET: 'a' };
});
vi.mock('../lib/api/deals', () => ({
  getDeal: mocks.getDeal,
  listMyDeals: mocks.listMyDeals,
  transitionDeal: mocks.transitionDeal,
  reserveListing: mocks.reserveListing,
  withDealContext: mocks.withDealContext,
  subscribeDeal: mocks.subscribeDeal,
}));
vi.mock('../lib/api/messages', () => ({
  listMessages: mocks.listMessages,
  sendMessage: mocks.sendMessage,
  subscribeMessages: mocks.subscribeMessages,
}));
vi.mock('../lib/api/ratings', () => ({
  getMyRatingForDeal: mocks.getMyRatingForDeal,
  rateDeal: mocks.rateDeal,
  listRatingsForUser: mocks.listRatingsForUser,
}));
vi.mock('../lib/api/listings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/listings')>()),
  getProofSignedUrl: mocks.getProofSignedUrl,
  getMyProof: mocks.getMyProof,
}));
vi.mock('../lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/auth')>()),
  useAuth: () => authState.current as AuthContextValue,
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo }),
}));

import DealsPage from '../pages/DealsPage';
import DealRoomPage from '../pages/DealRoomPage';
import { DealCard } from '../components/deals/DealCard';
import { DealChat } from '../components/deals/DealChat';
import { DealStepper } from '../components/deals/DealStepper';
import { RatingDialog } from '../components/deals/RatingDialog';
import { ProofDownload } from '../components/deals/ProofDownload';
import {
  DEAL_STEPS,
  actionSpecs,
  availableActions,
  badgeFor,
  canDownloadProof,
  canRate,
  chatClosedKey,
  confirmBodyKey,
  counterpartOf,
  dealTotal,
  effectiveStatus,
  filterDeals,
  guidanceKey,
  roleFor,
  secondaryGuidanceKey,
  stepIndex,
  stepStates,
  terminalBadge,
  type DealRole,
} from '../components/deals/dealState';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const NOW = Date.now();
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();

const STATUSES: DealStatus[] = ['reserved', 'paid_claimed', 'ticket_sent', 'completed', 'cancelled', 'expired', 'disputed'];
const ROLES: DealRole[] = ['buyer', 'seller', 'admin', 'none'];
const ACTIONS: DealAction[] = ['mark_paid', 'confirm_payment', 'confirm_received', 'cancel', 'dispute', 'admin_complete', 'admin_cancel'];

const buyer: PublicProfile = {
  id: 'buyer-1',
  display_name: 'Guðrún Jóns',
  avatar_url: null,
  bio: null,
  verification: 'phone',
  created_at: '2026-01-10T00:00:00Z',
  is_banned: false,
  rating_avg: 4.8,
  rating_count: 12,
  sales_count: 3,
  purchases_count: 9,
};
const seller: PublicProfile = {
  id: 'seller-1',
  display_name: 'Kári Stef',
  avatar_url: null,
  bio: null,
  verification: 'none',
  created_at: '2026-03-02T00:00:00Z',
  is_banned: false,
  rating_avg: 0,
  rating_count: 0,
  sales_count: 0,
  purchases_count: 0,
};
const event: EventRow = {
  id: 'ev-1',
  title: 'Sigur Rós í Hörpu',
  category: 'tonleikar',
  city: 'Reykjavík',
  created_at: '2026-08-01T00:00:00Z',
  created_by: null,
  description: null,
  face_value_max: 8900,
  face_value_min: 8900,
  image_url: null,
  source: 'seed',
  starts_at: '2026-11-14T20:00:00Z',
  status: 'upcoming',
  tix_event_id: null,
  tix_url: null,
  updated_at: '2026-08-01T00:00:00Z',
  venue_id: null,
  venue_name: 'Harpa',
};
const listing: Listing = {
  id: 'li-1',
  event_id: 'ev-1',
  seller_id: 'seller-1',
  quantity: 2,
  quantity_remaining: 0,
  face_value: 8900,
  asking_price: 8010,
  ticket_type: 'Svalir A',
  seat_info: 'Röð 4',
  notes: null,
  split_allowed: true,
  status: 'reserved',
  expires_at: '2026-11-14T20:00:00Z',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

function makeDeal(over: Partial<DealWithContext> = {}): DealWithContext {
  return {
    id: 'deal-1',
    listing_id: 'li-1',
    event_id: 'ev-1',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    quantity: 2,
    price_per_ticket: 8010,
    status: 'reserved',
    reserved_until: minutes(25),
    paid_claimed_at: null,
    ticket_sent_at: null,
    completed_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    created_at: minutes(-5),
    updated_at: minutes(-5),
    event,
    buyer,
    seller,
    listing,
    ...over,
  };
}

function makeMessage(over: Partial<Message> = {}): Message {
  return { id: 'm-1', deal_id: 'deal-1', sender_id: 'seller-1', body: 'Hæ!', created_at: minutes(-3), ...over };
}

const noop = async () => undefined;
const profileOf = (p: PublicProfile, role: Profile['role'] = 'user'): Profile => ({
  id: p.id,
  display_name: p.display_name,
  avatar_url: null,
  bio: null,
  verification: p.verification,
  phone_verified_at: null,
  role,
  banned_at: null,
  ban_reason: null,
  created_at: p.created_at,
  updated_at: p.created_at,
});

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
const signedInAs = (p: PublicProfile, opts: { isAdmin?: boolean; isBanned?: boolean } = {}) =>
  auth({
    user: { id: p.id, email: `${p.id}@example.is` } as AuthContextValue['user'],
    session: {} as AuthContextValue['session'],
    profile: profileOf(p, opts.isAdmin ? 'admin' : 'user'),
    isAdmin: !!opts.isAdmin,
    isBanned: !!opts.isBanned,
  });

function wrap(ui: ReactNode, path = '/midatorg/vidskipti') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">{ui}</I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
const renderRoom = (path = '/midatorg/vidskipti/deal-1') =>
  wrap(
    <Routes>
      <Route path="/midatorg/vidskipti/:dealId" element={<DealRoomPage />} />
    </Routes>,
    path,
  );

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = signedInAs(buyer);
  mocks.listMessages.mockResolvedValue([]);
  mocks.getMyRatingForDeal.mockResolvedValue(null);
  mocks.getProofSignedUrl.mockResolvedValue(null);
  mocks.getMyProof.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// dealState — pure logic, every status × role
// ---------------------------------------------------------------------------
describe('dealState.availableActions (mirrors mt_deal_transition)', () => {
  const none: DealAction[] = [];
  const expected: Record<DealStatus, Record<DealRole, DealAction[]>> = {
    reserved: { buyer: ['mark_paid', 'cancel'], seller: ['confirm_payment', 'cancel'], admin: ['cancel'], none },
    paid_claimed: { buyer: ['dispute', 'cancel'], seller: ['confirm_payment', 'dispute', 'cancel'], admin: ['cancel'], none },
    ticket_sent: { buyer: ['confirm_received', 'dispute'], seller: ['dispute'], admin: none, none },
    completed: { buyer: none, seller: none, admin: none, none },
    cancelled: { buyer: none, seller: none, admin: none, none },
    expired: { buyer: none, seller: none, admin: none, none },
    disputed: { buyer: none, seller: none, admin: ['admin_complete', 'admin_cancel'], none },
  };
  for (const status of STATUSES) {
    for (const role of ROLES) {
      it(`${status} × ${role}`, () => {
        expect(availableActions(status, role)).toEqual(expected[status][role]);
      });
    }
  }
  it('an admin who is also a party gets both sets', () => {
    expect(availableActions('disputed', 'buyer', { isAdmin: true })).toEqual(['admin_complete', 'admin_cancel']);
    expect(availableActions('reserved', 'seller', { isAdmin: true })).toEqual(['confirm_payment', 'cancel']);
  });
  it('tones and reason rules', () => {
    expect(actionSpecs('reserved', 'seller')[0]).toMatchObject({ action: 'confirm_payment', tone: 'secondary' });
    expect(actionSpecs('paid_claimed', 'seller')[0]).toMatchObject({ action: 'confirm_payment', tone: 'primary' });
    expect(actionSpecs('reserved', 'buyer')).toEqual([
      { action: 'mark_paid', tone: 'primary', needsReason: false, reasonRequired: false },
      { action: 'cancel', tone: 'destructive', needsReason: true, reasonRequired: false },
    ]);
    expect(actionSpecs('ticket_sent', 'seller')).toEqual([{ action: 'dispute', tone: 'secondary', needsReason: true, reasonRequired: true }]);
    expect(actionSpecs('disputed', 'admin').map((s) => s.tone)).toEqual(['primary', 'destructive']);
  });
  it('every action has a label, confirm copy and success toast in the dictionary', () => {
    for (const a of ACTIONS) {
      for (const key of [`deals.action.${a}`, `deals.confirm.${a}.title`, `deals.confirm.${a}.body`, `deals.confirm.${a}.confirm`, `deals.toast.${a}`]) {
        expect(hasKey(key, 'is'), key).toBe(true);
        expect(hasKey(key, 'en'), key).toBe(true);
      }
    }
  });
});

describe('dealState.guidanceKey (spec §4 copy)', () => {
  const expected: Record<DealStatus, Record<DealRole, string>> = {
    reserved: {
      buyer: 'deals.guidance.reserved.buyer',
      seller: 'deals.guidance.reserved.seller',
      admin: 'deals.guidance.admin',
      none: 'deals.guidance.admin',
    },
    paid_claimed: {
      buyer: 'deals.guidance.paid_claimed.buyer',
      seller: 'deals.guidance.paid_claimed.seller',
      admin: 'deals.guidance.admin',
      none: 'deals.guidance.admin',
    },
    ticket_sent: {
      buyer: 'deals.guidance.ticket_sent.buyer',
      seller: 'deals.guidance.ticket_sent.seller',
      admin: 'deals.guidance.admin',
      none: 'deals.guidance.admin',
    },
    completed: Object.fromEntries(ROLES.map((r) => [r, 'deals.guidance.completed'])) as Record<DealRole, string>,
    cancelled: Object.fromEntries(ROLES.map((r) => [r, 'deals.guidance.cancelled'])) as Record<DealRole, string>,
    expired: Object.fromEntries(ROLES.map((r) => [r, 'deals.guidance.expired'])) as Record<DealRole, string>,
    disputed: {
      buyer: 'deals.guidance.disputed',
      seller: 'deals.guidance.disputed',
      admin: 'deals.guidance.disputed.admin',
      none: 'deals.guidance.disputed',
    },
  };
  for (const status of STATUSES) {
    for (const role of ROLES) {
      it(`${status} × ${role} → existing key`, () => {
        const key = guidanceKey(status, role);
        expect(key).toBe(expected[status][role]);
        expect(hasKey(key, 'is'), key).toBe(true);
        expect(hasKey(key, 'en'), key).toBe(true);
      });
    }
  }
  it('reminds only the seller to transfer the ticket, once payment is claimed', () => {
    expect(secondaryGuidanceKey('paid_claimed', 'seller')).toBe('deals.guidance.sellerTransfer');
    expect(secondaryGuidanceKey('ticket_sent', 'seller')).toBe('deals.guidance.sellerTransfer');
    expect(secondaryGuidanceKey('reserved', 'seller')).toBeNull();
    expect(secondaryGuidanceKey('ticket_sent', 'buyer')).toBeNull();
  });
});

describe('dealState.stepIndex / stepStates / badges', () => {
  it('maps active statuses to the current step', () => {
    expect(stepIndex({ status: 'reserved' })).toBe(0);
    expect(stepIndex({ status: 'paid_claimed' })).toBe(1);
    expect(stepIndex({ status: 'ticket_sent' })).toBe(2);
    expect(stepIndex({ status: 'completed' })).toBe(3);
    expect(stepStates({ status: 'reserved' })).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(stepStates({ status: 'paid_claimed' })).toEqual(['done', 'current', 'upcoming', 'upcoming']);
    expect(stepStates({ status: 'ticket_sent' })).toEqual(['done', 'done', 'current', 'upcoming']);
    expect(stepStates({ status: 'completed' })).toEqual(['done', 'done', 'done', 'done']);
  });
  it('infers the furthest milestone from timestamps for terminal statuses', () => {
    expect(stepIndex({ status: 'cancelled' })).toBe(0);
    expect(stepStates({ status: 'cancelled' })).toEqual(['done', 'halted', 'halted', 'halted']);
    expect(stepIndex({ status: 'cancelled', paid_claimed_at: '2026-09-01T00:00:00Z' })).toBe(1);
    expect(stepStates({ status: 'cancelled', paid_claimed_at: '2026-09-01T00:00:00Z' })).toEqual(['done', 'done', 'halted', 'halted']);
    expect(stepIndex({ status: 'disputed', paid_claimed_at: 'x', ticket_sent_at: '2026-09-01T00:00:00Z' })).toBe(2);
    expect(stepStates({ status: 'disputed', ticket_sent_at: '2026-09-01T00:00:00Z' })).toEqual(['done', 'done', 'done', 'halted']);
    expect(stepIndex({ status: 'expired' })).toBe(0);
    expect(DEAL_STEPS).toEqual(['reserved', 'paid_claimed', 'ticket_sent', 'completed']);
  });
  it('terminal badge and tones', () => {
    expect(terminalBadge('cancelled')).toBe('cancelled');
    expect(terminalBadge('expired')).toBe('expired');
    expect(terminalBadge('disputed')).toBe('disputed');
    for (const s of ['reserved', 'paid_claimed', 'ticket_sent', 'completed'] as DealStatus[]) expect(terminalBadge(s)).toBeNull();
    expect(badgeFor('reserved')).toEqual({ labelKey: 'dealStatus.reserved', tone: 'reserved' });
    expect(badgeFor('paid_claimed').tone).toBe('progress');
    expect(badgeFor('ticket_sent').tone).toBe('progress');
    expect(badgeFor('completed').tone).toBe('done');
    expect(badgeFor('cancelled').tone).toBe('muted');
    expect(badgeFor('expired').tone).toBe('muted');
    expect(badgeFor('disputed').tone).toBe('disputed');
    for (const s of STATUSES) expect(hasKey(badgeFor(s).labelKey, 'is')).toBe(true);
  });
});

describe('dealState.roles, status, lists, parties', () => {
  it('roleFor', () => {
    const d = makeDeal();
    expect(roleFor(d, 'buyer-1')).toBe('buyer');
    expect(roleFor(d, 'seller-1')).toBe('seller');
    expect(roleFor(d, 'seller-1', true)).toBe('seller');
    expect(roleFor(d, 'admin-1', true)).toBe('admin');
    expect(roleFor(d, 'other-1')).toBe('none');
    expect(roleFor(d, null)).toBe('none');
    expect(roleFor(d, undefined, true)).toBe('admin');
  });
  it('effectiveStatus treats a stale reservation as expired', () => {
    expect(effectiveStatus({ status: 'reserved', reserved_until: minutes(1) }, NOW)).toBe('reserved');
    expect(effectiveStatus({ status: 'reserved', reserved_until: minutes(-1) }, NOW)).toBe('expired');
    expect(effectiveStatus({ status: 'paid_claimed', reserved_until: minutes(-1) }, NOW)).toBe('paid_claimed');
    expect(effectiveStatus({ status: 'reserved', reserved_until: 'not-a-date' }, NOW)).toBe('reserved');
  });
  it('filterDeals per tab', () => {
    const deals = [
      makeDeal({ id: 'a', status: 'reserved' }),
      makeDeal({ id: 'stale', status: 'reserved', reserved_until: minutes(-2) }),
      makeDeal({ id: 'b', status: 'paid_claimed' }),
      makeDeal({ id: 'c', status: 'ticket_sent' }),
      makeDeal({ id: 'd', status: 'disputed' }),
      makeDeal({ id: 'e', status: 'completed' }),
      makeDeal({ id: 'f', status: 'cancelled' }),
      makeDeal({ id: 'g', status: 'expired' }),
    ];
    const ids = (tab: 'active' | 'done' | 'all') => filterDeals(deals, tab, NOW).map((d) => d.id);
    expect(ids('active')).toEqual(['a', 'b', 'c', 'd']);
    expect(ids('done')).toEqual(['stale', 'e', 'f', 'g']);
    expect(ids('all')).toHaveLength(8);
  });
  it('dealTotal, counterpartOf, chat, proof, rating', () => {
    const d = makeDeal();
    expect(dealTotal(d)).toBe(16020);
    expect(counterpartOf(d, 'buyer')).toBe(seller);
    expect(counterpartOf(d, 'seller')).toBe(buyer);
    expect(counterpartOf(d, 'admin')).toBeNull();
    expect(counterpartOf(d, 'none')).toBeNull();
    expect(chatClosedKey('cancelled')).toBe('deals.chat.closed.cancelled');
    expect(chatClosedKey('expired')).toBe('deals.chat.closed.expired');
    for (const s of ['reserved', 'paid_claimed', 'ticket_sent', 'completed', 'disputed'] as DealStatus[]) expect(chatClosedKey(s)).toBeNull();
    // an admin who is not a party can read but not post; the parties keep the composer
    expect(chatClosedKey('reserved', 'admin')).toBe('deals.chat.closed.admin');
    expect(chatClosedKey('cancelled', 'admin')).toBe('deals.chat.closed.cancelled');
    expect(chatClosedKey('reserved', 'buyer')).toBeNull();
    // cancelling after the buyer marked paid gets the refund-first copy
    expect(confirmBodyKey('cancel', 'paid_claimed')).toBe('deals.confirm.cancel.bodyPaid');
    expect(confirmBodyKey('cancel', 'reserved')).toBe('deals.confirm.cancel.body');
    expect(confirmBodyKey('mark_paid', 'reserved')).toBe('deals.confirm.mark_paid.body');
    for (const s of STATUSES) {
      expect(canDownloadProof(s, 'buyer')).toBe(['ticket_sent', 'completed', 'disputed'].includes(s));
      expect(canDownloadProof(s, 'seller')).toBe(false);
      expect(canDownloadProof(s, 'admin')).toBe(false);
      expect(canRate(s, 'buyer')).toBe(s === 'completed');
      expect(canRate(s, 'seller')).toBe(s === 'completed');
      expect(canRate(s, 'admin')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
describe('DealStepper', () => {
  it('renders the four steps with the current one marked', () => {
    wrap(<DealStepper deal={{ status: 'paid_claimed' }} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-step'))).toEqual(['reserved', 'paid_claimed', 'ticket_sent', 'completed']);
    expect(screen.getByText('Tekið frá')).toBeInTheDocument();
    expect(screen.getByText('Miðar sendir')).toBeInTheDocument();
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[3]).toHaveAttribute('data-state', 'upcoming');
  });
  it('shows a terminal badge for cancelled deals', () => {
    wrap(<DealStepper deal={{ status: 'cancelled', paid_claimed_at: 'x' }} />);
    expect(screen.getByText('Hætt við')).toHaveAttribute('data-status', 'cancelled');
    expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('data-state', 'halted');
  });
});

describe('DealCard', () => {
  it('buyer view: title, seller, quantity × price = total, badge, static reserved-until time, link', () => {
    wrap(<DealCard deal={makeDeal()} userId="buyer-1" />);
    expect(screen.getByRole('heading', { name: 'Sigur Rós í Hörpu' })).toBeInTheDocument();
    expect(screen.getByText('Þú kaupir')).toBeInTheDocument();
    expect(screen.getByText('Kári Stef')).toBeInTheDocument();
    expect(screen.getByText('2 miðar × 8.010 kr.')).toBeInTheDocument();
    expect(screen.getByText('16.020')).toBeInTheDocument();
    expect(screen.getByText('Tekið frá')).toHaveAttribute('data-status', 'reserved');
    expect(screen.getByRole('link', { name: 'Sigur Rós í Hörpu – opna viðskipti' })).toHaveAttribute('href', '/midatorg/vidskipti/deal-1');
    // DESIGN-v2 §7: cards never count down — a static time, no ticking <time>
    expect(screen.getByText(/^Frátekið til \d\d:\d\d$/)).toBeInTheDocument();
    expect(document.querySelector('time')).toBeNull();
  });
  it('seller view of a completed deal: no countdown, buyer shown', () => {
    wrap(<DealCard deal={makeDeal({ status: 'completed' })} userId="seller-1" />);
    expect(screen.getByText('Þú selur')).toBeInTheDocument();
    expect(screen.getByText('Guðrún Jóns')).toBeInTheDocument();
    expect(screen.getByText('Lokið')).toHaveAttribute('data-status', 'completed');
    expect(document.querySelector('time')).toBeNull();
  });
  it('a stale reservation reads as expired', () => {
    wrap(<DealCard deal={makeDeal({ reserved_until: minutes(-1) })} userId="buyer-1" />);
    expect(screen.getByText('Rann út')).toHaveAttribute('data-status', 'expired');
  });
});

describe('DealChat', () => {
  it('lists messages by side, sends on Enter and appends realtime inserts', async () => {
    mocks.listMessages.mockResolvedValue([
      makeMessage({ id: 'm-1', sender_id: 'seller-1', body: 'Hæ, ertu enn með áhuga?' }),
      makeMessage({ id: 'm-2', sender_id: 'buyer-1', body: 'Já, sendi greiðslu núna.' }),
    ]);
    let onInsert: ((m: Message) => void) | null = null;
    mocks.subscribeMessages.mockImplementation((_id: string, cb: (m: Message) => void) => {
      onInsert = cb;
      return () => undefined;
    });
    mocks.sendMessage.mockImplementation(async (dealId: string, body: string) => makeMessage({ id: 'm-3', deal_id: dealId, sender_id: 'buyer-1', body }));

    wrap(<DealChat deal={makeDeal()} status="reserved" userId="buyer-1" />);
    expect(await screen.findByText('Hæ, ertu enn með áhuga?')).toBeInTheDocument();
    expect(mocks.subscribeMessages).toHaveBeenCalledWith('deal-1', expect.any(Function));
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('data-own');
    expect(items[1]).toHaveAttribute('data-own', 'true');
    expect(screen.getByText('Kári Stef')).toBeInTheDocument(); // sender name on the other side only
    expect(screen.getByText('0 / 2.000')).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Skilaboð' });
    fireEvent.change(input, { target: { value: 'Hvenær færðu miðana?' } });
    expect(screen.getByText('20 / 2.000')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledWith('deal-1', 'Hvenær færðu miðana?'));
    expect(await screen.findByText('Hvenær færðu miðana?')).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue(''));

    // Shift+Enter does not send
    fireEvent.change(input, { target: { value: 'línu' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);

    // realtime insert from the other side
    act(() => onInsert?.(makeMessage({ id: 'm-4', sender_id: 'seller-1', body: 'Á morgun!' })));
    expect(await screen.findByText('Á morgun!')).toBeInTheDocument();
  });
  it('is closed with an explanation when the deal was cancelled', async () => {
    wrap(<DealChat deal={makeDeal({ status: 'cancelled' })} status="cancelled" userId="buyer-1" />);
    expect(await screen.findByText('Engin skilaboð enn. Byrjaðu samtalið.')).toBeInTheDocument();
    expect(screen.getByText('Spjallið er lokað því viðskiptunum var hætt.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('is read-only for an admin who is not a party', async () => {
    wrap(<DealChat deal={makeDeal()} status="reserved" userId="admin-1" role="admin" />);
    expect(await screen.findByText('Stjórnendur geta lesið spjallið en ekki skrifað í það.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('shows an error state with retry', async () => {
    mocks.listMessages.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce([]);
    wrap(<DealChat deal={makeDeal()} status="reserved" userId="buyer-1" />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Náði ekki sambandi við Miðatorg. Athugaðu nettenginguna og reyndu aftur.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    await waitFor(() => expect(mocks.listMessages).toHaveBeenCalledTimes(2));
  });
});

describe('RatingDialog', () => {
  it('opens, picks stars, submits and toasts', async () => {
    mocks.rateDeal.mockImplementation(
      async (dealId: string, score: number, comment: string | null): Promise<Rating> => ({
        id: 'r-1',
        deal_id: dealId,
        rater_id: 'buyer-1',
        ratee_id: 'seller-1',
        score,
        comment,
        created_at: minutes(0),
      }),
    );
    wrap(<RatingDialog deal={makeDeal({ status: 'completed' })} role="buyer" />);
    expect(await screen.findByRole('heading', { name: 'Gefðu seljanda einkunn' })).toBeInTheDocument();
    expect(screen.getByText('Hvernig gengu viðskiptin? Einkunnin birtist á notandasíðu hins aðilans (Kári Stef).')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gefa einkunn' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Senda einkunn' });
    expect(submit).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: '4 stjörnur' }));
    expect(within(dialog).getByRole('radio', { name: '4 stjörnur' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByRole('radio', { name: '1 stjarna' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Umsögn/), { target: { value: 'Allt gekk vel.' } });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.rateDeal).toHaveBeenCalledWith('deal-1', 4, 'Allt gekk vel.'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Takk fyrir einkunnina.'));
  });
  it('hides the prompt once a rating exists', async () => {
    mocks.getMyRatingForDeal.mockResolvedValue({
      id: 'r-1',
      deal_id: 'deal-1',
      rater_id: 'buyer-1',
      ratee_id: 'seller-1',
      score: 5,
      comment: null,
      created_at: minutes(-1),
    } satisfies Rating);
    wrap(<RatingDialog deal={makeDeal({ status: 'completed' })} role="buyer" />);
    expect(await screen.findByTestId('rating-done')).toHaveTextContent('Þú gafst 5 af 5 stjörnum.');
    expect(screen.queryByRole('button', { name: 'Gefa einkunn' })).not.toBeInTheDocument();
  });
});

describe('ProofDownload', () => {
  it('buyer from ticket_sent: a link to the signed URL', async () => {
    mocks.getProofSignedUrl.mockResolvedValue('https://x/proof.pdf?token=1');
    wrap(<ProofDownload deal={makeDeal({ status: 'ticket_sent' })} status="ticket_sent" role="buyer" />);
    const link = await screen.findByTestId('proof-link');
    expect(link).toHaveAttribute('href', 'https://x/proof.pdf?token=1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveTextContent('Opna miðaskjal seljanda');
    expect(mocks.getProofSignedUrl).toHaveBeenCalledWith('li-1');
  });
  it('buyer before ticket_sent: nothing; buyer without a proof: a note', async () => {
    const { container } = wrap(<ProofDownload deal={makeDeal()} status="reserved" role="buyer" />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.getProofSignedUrl).not.toHaveBeenCalled();
    wrap(<ProofDownload deal={makeDeal({ status: 'completed' })} status="completed" role="buyer" />);
    expect(await screen.findByText('Seljandi hlóð ekki upp miðaskjali. Biddu um miðann í spjallinu.')).toBeInTheDocument();
  });
  it('seller: uploaded / missing states', async () => {
    authState.current = signedInAs(seller);
    mocks.getMyProof.mockResolvedValue({ id: 'p-1', listing_id: 'li-1', seller_id: 'seller-1', path: 'seller-1/li-1.pdf', sha256: 'abc', created_at: minutes(-9) });
    wrap(<ProofDownload deal={makeDeal()} status="reserved" role="seller" />);
    expect(await screen.findByTestId('proof-uploaded')).toHaveTextContent('Miðaskjal hlaðið upp');
    mocks.getMyProof.mockResolvedValue(null);
    wrap(<ProofDownload deal={makeDeal()} status="reserved" role="seller" />);
    expect(await screen.findByText('Ekkert miðaskjal hlaðið upp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mínar sölur' })).toHaveAttribute('href', '/midatorg/eg?flipi=solur');
  });
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
describe('DealsPage', () => {
  it('shows tabs Virk · Lokið · Öll with counts and filters the cards', async () => {
    mocks.listMyDeals.mockResolvedValue([
      makeDeal({ id: 'deal-1', status: 'reserved' }),
      makeDeal({ id: 'deal-2', status: 'completed', event: { ...event, id: 'ev-2', title: 'Baggalútur' } }),
      makeDeal({ id: 'deal-3', status: 'cancelled', buyer_id: 'other-1', seller_id: 'buyer-1', buyer: { ...seller, id: 'other-1' } }),
    ]);
    wrap(<DealsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Viðskiptin mín' })).toBeInTheDocument();
    expect(await screen.findByTestId('tab-count-active')).toHaveTextContent('1');
    expect(screen.getByTestId('tab-count-done')).toHaveTextContent('2');
    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('3');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Sigur Rós í Hörpu' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Lokið/ }), { button: 0 });
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(screen.getByText('Baggalútur')).toBeInTheDocument();
    expect(screen.getByText('Þú selur')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Öll/ }), { button: 0 });
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));
  });
  it('empty state with a link to the market', async () => {
    mocks.listMyDeals.mockResolvedValue([]);
    wrap(<DealsPage />);
    expect(await screen.findByText('Engin virk viðskipti')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skoða viðburði' })).toHaveAttribute('href', '/midatorg');
  });
  it('error state with retry', async () => {
    mocks.listMyDeals.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce([]);
    wrap(<DealsPage />);
    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByText('Engin virk viðskipti')).toBeInTheDocument();
    expect(mocks.listMyDeals).toHaveBeenCalledTimes(2);
  });
});

describe('DealRoomPage', () => {
  it('buyer, reserved: guidance with amount, counterpart, actions, chat, realtime', async () => {
    let onChange: ((d: Deal) => void) | null = null;
    mocks.subscribeDeal.mockImplementation((_id: string, cb: (d: Deal) => void) => {
      onChange = cb;
      return () => undefined;
    });
    const deal = makeDeal();
    mocks.getDeal.mockResolvedValue(deal);
    mocks.transitionDeal.mockResolvedValue({ ...deal, status: 'paid_claimed', paid_claimed_at: minutes(0) });
    renderRoom();

    expect(await screen.findByRole('heading', { level: 1, name: 'Sigur Rós í Hörpu' })).toBeInTheDocument();
    expect(mocks.subscribeDeal).toHaveBeenCalledWith('deal-1', expect.any(Function));
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getByText('Greiddu seljanda 16.020 kr. með Aur eða millifærslu og merktu svo „Ég hef greitt“.')).toBeInTheDocument();
    expect(screen.getByText('Greiðsla fer fram utan Miðatorgs — Aur eða millifærsla')).toBeInTheDocument();
    expect(screen.getByText('2 miðar × 8.010 kr.')).toBeInTheDocument();
    expect(screen.getByText('Frátekið til ' + new Date(deal.reserved_until).toTimeString().slice(0, 5))).toBeInTheDocument();
    const party = screen.getByTestId('party-card');
    expect(within(party).getByText('Seljandi')).toBeInTheDocument();
    expect(within(party).getByRole('link', { name: 'Kári Stef' })).toHaveAttribute('href', '/midatorg/notendur/seller-1');
    expect(within(party).getByText('Nýr notandi')).toBeInTheDocument();
    expect(within(party).getByRole('button', { name: 'Tilkynna: Kári Stef' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Spjall' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ég hef greitt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hætta við' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skrá ágreining' })).not.toBeInTheDocument();
    expect(screen.queryByText('Miðaskjal')).not.toBeInTheDocument();

    // mark paid → confirm → transitionDeal + success toast
    fireEvent.click(screen.getByRole('button', { name: 'Ég hef greitt' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Merkja sem greitt?');
    expect(dialog).toHaveTextContent('16.020 kr.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Já, ég hef greitt' }));
    await waitFor(() => expect(mocks.transitionDeal).toHaveBeenCalledWith('deal-1', 'mark_paid', null));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Merkt sem greitt. Seljandi fær tilkynningu.'));
    await waitFor(() => expect(mocks.getDeal).toHaveBeenCalledTimes(2));

    // realtime update → refetch
    mocks.getDeal.mockResolvedValue({ ...deal, status: 'ticket_sent', paid_claimed_at: minutes(0), ticket_sent_at: minutes(0) });
    act(() => onChange?.({ ...deal, status: 'ticket_sent' }));
    expect(await screen.findByRole('button', { name: 'Ég hef fengið miðana' })).toBeInTheDocument();
    expect(screen.getByText('Seljandi hefur sent miðana. Staðfestu móttöku þegar þú ert með þá.')).toBeInTheDocument();
    expect(screen.getByText('Miðaskjal')).toBeInTheDocument();
  });

  it('cancel asks for a reason and passes it on', async () => {
    const deal = makeDeal();
    mocks.getDeal.mockResolvedValue(deal);
    mocks.transitionDeal.mockResolvedValue({ ...deal, status: 'cancelled' });
    renderRoom();
    fireEvent.click(await screen.findByRole('button', { name: 'Hætta við' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText(/Ástæða/), { target: { value: 'Fann aðra miða' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hætta við viðskiptin' }));
    await waitFor(() => expect(mocks.transitionDeal).toHaveBeenCalledWith('deal-1', 'cancel', 'Fann aðra miða'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Hætt við viðskiptin.'));
  });

  it('INVALID_TRANSITION / RESERVATION_EXPIRED: toast the translated error and refetch', async () => {
    const deal = makeDeal();
    mocks.getDeal.mockResolvedValue(deal);
    mocks.transitionDeal.mockRejectedValueOnce(new Error('RESERVATION_EXPIRED'));
    renderRoom();
    fireEvent.click(await screen.findByRole('button', { name: 'Ég hef greitt' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Já, ég hef greitt' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Frátektin er runnin út. Miðarnir eru aftur komnir í sölu.', undefined));
    await waitFor(() => expect(mocks.getDeal).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    // the button is back to its idle label, never stuck disabled
    expect(screen.getByRole('button', { name: 'Ég hef greitt' })).toBeEnabled();
  });

  it('seller, paid_claimed: confirm/dispute/cancel, transfer reminder, proof state, buyer card', async () => {
    authState.current = signedInAs(seller);
    mocks.getDeal.mockResolvedValue(makeDeal({ status: 'paid_claimed', paid_claimed_at: minutes(-1) }));
    mocks.getMyProof.mockResolvedValue({ id: 'p-1', listing_id: 'li-1', seller_id: 'seller-1', path: 'x', sha256: 'y', created_at: minutes(-9) });
    renderRoom();
    // the amount ends in the "kr." abbreviation, so the sentence continues with a dash rather than a second full stop
    expect(await screen.findByText('Kaupandi segist hafa greitt 16.020 kr. – athugaðu bankann eða Aur, sendu miðana og staðfestu.')).toBeInTheDocument();
    expect(screen.getByText(/flytja miðann á tix.is/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Greiðsla móttekin og miðar sendir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skrá ágreining' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hætta við' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ég hef greitt' })).not.toBeInTheDocument();
    expect(await screen.findByTestId('proof-uploaded')).toBeInTheDocument();
    const party = screen.getByTestId('party-card');
    expect(within(party).getByText('Kaupandi')).toBeInTheDocument();
    expect(within(party).getByRole('link', { name: 'Guðrún Jóns' })).toBeInTheDocument();
    expect(within(party).getByText('Staðfestur')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').find((li) => li.getAttribute('data-step') === 'paid_claimed')).toHaveAttribute('aria-current', 'step');

    // dispute requires a reason
    fireEvent.click(screen.getByRole('button', { name: 'Skrá ágreining' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Skrá ágreining' }));
    expect(await within(dialog).findByText('Ástæða er nauðsynleg.')).toBeInTheDocument();
    expect(mocks.transitionDeal).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Til baka' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    // cancelling after the buyer marked paid: the dialog says so and asks for a refund agreement first
    fireEvent.click(screen.getByRole('button', { name: 'Hætta við' }));
    const cancel = await screen.findByRole('alertdialog');
    expect(cancel).toHaveTextContent('Kaupandi segist þegar hafa greitt. Semjið um endurgreiðslu í spjallinu áður en þú hættir við');
  });

  it('completed buyer: rating prompt and proof link; stepper all done', async () => {
    mocks.getDeal.mockResolvedValue(
      makeDeal({ status: 'completed', paid_claimed_at: minutes(-30), ticket_sent_at: minutes(-20), completed_at: minutes(-10) }),
    );
    mocks.getProofSignedUrl.mockResolvedValue('https://x/proof.pdf');
    renderRoom();
    expect(await screen.findByText('Viðskiptum lokið. Gefðu einkunn.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Gefa einkunn' })).toBeInTheDocument();
    expect(await screen.findByTestId('proof-link')).toHaveAttribute('href', 'https://x/proof.pdf');
    expect(screen.queryByRole('button', { name: 'Ég hef greitt' })).not.toBeInTheDocument();
    for (const li of screen.getAllByRole('listitem').filter((el) => el.hasAttribute('data-step'))) expect(li).toHaveAttribute('data-state', 'done');
  });

  it('admin on a disputed deal: both parties, admin actions, reason shown', async () => {
    authState.current = signedInAs({ ...buyer, id: 'admin-1', display_name: 'Stjóri' }, { isAdmin: true });
    mocks.getDeal.mockResolvedValue(makeDeal({ status: 'disputed', paid_claimed_at: minutes(-30), cancel_reason: 'Fékk aldrei miðana' }));
    renderRoom();
    expect(await screen.findByText(/Ágreiningur\. Skoðaðu spjallið/)).toBeInTheDocument();
    expect(screen.getByText('Ástæða: Fékk aldrei miðana')).toBeInTheDocument();
    expect(screen.getAllByTestId('party-card')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ljúka viðskiptum' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fella niður' })).toBeInTheDocument();
    expect(screen.getAllByText('Ágreiningur').find((el) => el.hasAttribute('data-status'))).toHaveAttribute('data-status', 'disputed');
    expect(screen.queryByRole('button', { name: 'Gefa einkunn' })).not.toBeInTheDocument();
  });

  it('non-party (RLS returns null) and outsider both get "Þú hefur ekki aðgang"', async () => {
    mocks.getDeal.mockResolvedValue(null);
    renderRoom();
    expect(await screen.findByText('Þú hefur ekki aðgang')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Öll viðskipti' })).toHaveAttribute('href', '/midatorg/vidskipti');

    authState.current = signedInAs({ ...buyer, id: 'other-1' });
    mocks.getDeal.mockResolvedValue(makeDeal());
    renderRoom('/midatorg/vidskipti/deal-1');
    expect((await screen.findAllByText('Þú hefur ekki aðgang')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Spjall')).not.toBeInTheDocument();
  });

  it('load error shows a retry', async () => {
    mocks.getDeal.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce(makeDeal());
    renderRoom();
    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reyna aftur' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sigur Rós í Hörpu' })).toBeInTheDocument();
  });

  it('an expired reservation (stale row) shows the expired state and a closed chat', async () => {
    mocks.getDeal.mockResolvedValue(makeDeal({ reserved_until: minutes(-3) }));
    renderRoom();
    expect(await screen.findByText('Frátektin rann út. Miðarnir eru aftur komnir í sölu.')).toBeInTheDocument();
    expect(screen.getByText('Spjallið er lokað því frátektin rann út.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ég hef greitt' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Rann út').length).toBeGreaterThan(0);
  });
});
