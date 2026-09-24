/**
 * Pure deal-state helpers (no React, no network). Everything the deal UI needs
 * to decide what to show is derived here from `(status, role)` so it can be
 * unit-tested exhaustively (src/midatorg/test/deals.test.tsx).
 *
 * The transition rules mirror `mt_deal_transition` in
 * supabase-midatorg/migrations/0002_functions.sql — keep them in sync.
 */
import { OPEN_DEAL_STATUSES } from '../../lib/constants';
import type { Deal, DealAction, DealStatus, DealWithContext, PublicProfile } from '../../lib/types';

export type DealRole = 'buyer' | 'seller' | 'admin' | 'none';
export type DealsTab = 'active' | 'done' | 'all';
export type BadgeTone = 'reserved' | 'progress' | 'done' | 'muted' | 'disputed';
export type StepState = 'done' | 'current' | 'upcoming' | 'halted';
export type ActionTone = 'primary' | 'secondary' | 'destructive';

/** The four stepper milestones, in order (spec §4). */
export const DEAL_STEPS = ['reserved', 'paid_claimed', 'ticket_sent', 'completed'] as const satisfies readonly DealStatus[];
export type StepStatus = (typeof DEAL_STEPS)[number];

/** Statuses rendered as a terminal badge next to the stepper. */
export const TERMINAL_STATUSES = ['cancelled', 'expired', 'disputed'] as const satisfies readonly DealStatus[];
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

/** "Lokið" tab: nothing more will happen. */
export const DONE_STATUSES: readonly DealStatus[] = ['completed', 'cancelled', 'expired'];

/** The buyer may read the seller's proof file from these statuses (RLS on mt_listing_proofs). */
export const PROOF_VISIBLE_STATUSES: readonly DealStatus[] = ['ticket_sent', 'completed', 'disputed'];

export const DEALS_TABS: readonly DealsTab[] = ['active', 'done', 'all'];

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_REASON_LENGTH = 300;
export const MAX_RATING_COMMENT_LENGTH = 300;

// ---------------------------------------------------------------------------
// Role & status
// ---------------------------------------------------------------------------

export function roleFor(
  deal: Pick<Deal, 'buyer_id' | 'seller_id'>,
  userId: string | null | undefined,
  isAdmin = false,
): DealRole {
  if (userId && deal.buyer_id === userId) return 'buyer';
  if (userId && deal.seller_id === userId) return 'seller';
  return isAdmin ? 'admin' : 'none';
}

export function isTerminal(status: DealStatus): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly DealStatus[]).includes(status);
}

/**
 * A reservation past `reserved_until` is expired even before the server has
 * flipped the row (that happens lazily on the next transition or by cron).
 */
export function effectiveStatus(deal: Pick<Deal, 'status' | 'reserved_until'>, now: number = Date.now()): DealStatus {
  if (deal.status !== 'reserved') return deal.status;
  const until = Date.parse(deal.reserved_until);
  return Number.isFinite(until) && until <= now ? 'expired' : 'reserved';
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

export type StepSource = {
  status: DealStatus;
  paid_claimed_at?: string | null;
  ticket_sent_at?: string | null;
  completed_at?: string | null;
};

/**
 * Index (0–3) of the step the deal is at. For terminal statuses the furthest
 * milestone actually reached is inferred from the timestamps.
 */
export function stepIndex(deal: StepSource): number {
  switch (deal.status) {
    case 'reserved':
      return 0;
    case 'paid_claimed':
      return 1;
    case 'ticket_sent':
      return 2;
    case 'completed':
      return 3;
    default:
      if (deal.completed_at) return 3;
      if (deal.ticket_sent_at) return 2;
      if (deal.paid_claimed_at) return 1;
      return 0;
  }
}

/** One state per DEAL_STEPS entry. */
export function stepStates(deal: StepSource): StepState[] {
  const idx = stepIndex(deal);
  const terminal = isTerminal(deal.status);
  return DEAL_STEPS.map((_, i) => {
    if (deal.status === 'completed') return 'done';
    if (terminal) return i <= idx ? 'done' : 'halted';
    if (i < idx) return 'done';
    if (i === idx) return 'current';
    return 'upcoming';
  });
}

export function terminalBadge(status: DealStatus): TerminalStatus | null {
  return isTerminal(status) ? status : null;
}

/** Label key (from the common dict) and colour tone for a status pill. */
export function badgeFor(status: DealStatus): { labelKey: `dealStatus.${DealStatus}`; tone: BadgeTone } {
  const labelKey = `dealStatus.${status}` as const;
  switch (status) {
    case 'reserved':
      return { labelKey, tone: 'reserved' };
    case 'paid_claimed':
    case 'ticket_sent':
      return { labelKey, tone: 'progress' };
    case 'completed':
      return { labelKey, tone: 'done' };
    case 'disputed':
      return { labelKey, tone: 'disputed' };
    case 'cancelled':
    case 'expired':
    default:
      return { labelKey, tone: 'muted' };
  }
}

// ---------------------------------------------------------------------------
// Guidance copy (spec §4)
// ---------------------------------------------------------------------------

export function guidanceKey(status: DealStatus, role: DealRole): string {
  switch (status) {
    case 'reserved':
    case 'paid_claimed':
    case 'ticket_sent':
      return role === 'buyer' || role === 'seller' ? `deals.guidance.${status}.${role}` : 'deals.guidance.admin';
    case 'completed':
      return 'deals.guidance.completed';
    case 'cancelled':
      return 'deals.guidance.cancelled';
    case 'expired':
      return 'deals.guidance.expired';
    case 'disputed':
      return role === 'admin' ? 'deals.guidance.disputed.admin' : 'deals.guidance.disputed';
    default:
      return 'deals.guidance.admin';
  }
}

/** A second, muted line under the guidance (the tix.is transfer reminder for sellers). */
export function secondaryGuidanceKey(status: DealStatus, role: DealRole): string | null {
  if (role === 'seller' && (status === 'paid_claimed' || status === 'ticket_sent')) {
    return 'deals.guidance.sellerTransfer';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Actions (mirrors mt_deal_transition)
// ---------------------------------------------------------------------------

export type DealActionSpec = {
  action: DealAction;
  tone: ActionTone;
  /** Opens a dialog with a reason textarea. */
  needsReason: boolean;
  /** The reason may not be empty. */
  reasonRequired: boolean;
};

type ActionRule = DealActionSpec & { roles: readonly DealRole[]; statuses: readonly DealStatus[] };

const ACTION_RULES: readonly ActionRule[] = [
  { action: 'mark_paid', roles: ['buyer'], statuses: ['reserved'], tone: 'primary', needsReason: false, reasonRequired: false },
  {
    action: 'confirm_payment',
    roles: ['seller'],
    statuses: ['reserved', 'paid_claimed'],
    tone: 'primary',
    needsReason: false,
    reasonRequired: false,
  },
  { action: 'confirm_received', roles: ['buyer'], statuses: ['ticket_sent'], tone: 'primary', needsReason: false, reasonRequired: false },
  { action: 'admin_complete', roles: ['admin'], statuses: ['disputed'], tone: 'primary', needsReason: false, reasonRequired: false },
  {
    action: 'dispute',
    roles: ['buyer', 'seller'],
    statuses: ['paid_claimed', 'ticket_sent'],
    tone: 'secondary',
    needsReason: true,
    reasonRequired: true,
  },
  {
    action: 'cancel',
    roles: ['buyer', 'seller', 'admin'],
    statuses: ['reserved', 'paid_claimed'],
    tone: 'destructive',
    needsReason: true,
    reasonRequired: false,
  },
  { action: 'admin_cancel', roles: ['admin'], statuses: ['disputed'], tone: 'destructive', needsReason: true, reasonRequired: false },
];

/**
 * Buttons for this viewer in this state, primary first. An admin who is also
 * a party gets the party's buttons plus the admin ones (`isAdmin`).
 */
export function actionSpecs(status: DealStatus, role: DealRole, opts: { isAdmin?: boolean } = {}): DealActionSpec[] {
  const roles = new Set<DealRole>([role]);
  if (opts.isAdmin) roles.add('admin');
  return ACTION_RULES.filter((r) => r.statuses.includes(status) && r.roles.some((x) => roles.has(x))).map((r) => ({
    action: r.action,
    // the seller confirming before the buyer has even claimed payment is the exception, not the main path
    tone: r.action === 'confirm_payment' && status === 'reserved' ? 'secondary' : r.tone,
    needsReason: r.needsReason,
    reasonRequired: r.reasonRequired,
  }));
}

export function availableActions(status: DealStatus, role: DealRole, opts: { isAdmin?: boolean } = {}): DealAction[] {
  return actionSpecs(status, role, opts).map((s) => s.action);
}

/**
 * i18n key for the confirm-dialog body. Cancelling after the buyer has marked
 * paid gets its own copy: agree on a refund in the chat first (Miðatorg holds no money).
 */
export function confirmBodyKey(action: DealAction, status: DealStatus): string {
  if (action === 'cancel' && status === 'paid_claimed') return 'deals.confirm.cancel.bodyPaid';
  return `deals.confirm.${action}.body`;
}

// ---------------------------------------------------------------------------
// Lists, amounts, parties
// ---------------------------------------------------------------------------

export function filterDeals<T extends Pick<Deal, 'status' | 'reserved_until'>>(
  deals: readonly T[],
  tab: DealsTab,
  now: number = Date.now(),
): T[] {
  if (tab === 'all') return [...deals];
  return deals.filter((d) => {
    const s = effectiveStatus(d, now);
    return tab === 'active' ? OPEN_DEAL_STATUSES.includes(s) : DONE_STATUSES.includes(s);
  });
}

export function dealTotal(deal: Pick<Deal, 'quantity' | 'price_per_ticket'>): number {
  return deal.quantity * deal.price_per_ticket;
}

/** The other party from the viewer's point of view; null for admins and outsiders. */
export function counterpartOf(deal: Pick<DealWithContext, 'buyer' | 'seller'>, role: DealRole): PublicProfile | null {
  if (role === 'buyer') return deal.seller;
  if (role === 'seller') return deal.buyer;
  return null;
}

/**
 * i18n key explaining why the chat composer is disabled, or null when open.
 * An admin who is not a party can read but not post (mt_messages_insert needs mt_is_deal_party).
 */
export function chatClosedKey(status: DealStatus, role?: DealRole): string | null {
  if (status === 'cancelled') return 'deals.chat.closed.cancelled';
  if (status === 'expired') return 'deals.chat.closed.expired';
  if (role === 'admin') return 'deals.chat.closed.admin';
  return null;
}

export function canDownloadProof(status: DealStatus, role: DealRole, ticketSentAt?: string | null): boolean {
  if (role !== 'buyer') return false;
  if (status === 'disputed') return !!ticketSentAt;
  return PROOF_VISIBLE_STATUSES.includes(status);
}

export function canRate(status: DealStatus, role: DealRole): boolean {
  return status === 'completed' && (role === 'buyer' || role === 'seller');
}
