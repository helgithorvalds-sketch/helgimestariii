import type { DealStatus, EventCategory, ListingStatus, RequestStatus, VerificationLevel } from './types';

export const EVENT_CATEGORIES: EventCategory[] = ['tonleikar', 'leikhus', 'ithrottir', 'hatidir', 'uppistand', 'annad'];

export const DEAL_STATUSES: DealStatus[] = [
  'reserved',
  'paid_claimed',
  'ticket_sent',
  'completed',
  'cancelled',
  'expired',
  'disputed',
];

/** Deals that still need action from one of the parties. */
export const OPEN_DEAL_STATUSES: DealStatus[] = ['reserved', 'paid_claimed', 'ticket_sent', 'disputed'];

export const LISTING_STATUSES: ListingStatus[] = ['active', 'reserved', 'sold', 'cancelled', 'expired'];
export const REQUEST_STATUSES: RequestStatus[] = ['active', 'fulfilled', 'cancelled', 'expired'];
export const VERIFICATION_LEVELS: VerificationLevel[] = ['none', 'phone', 'eid'];

/** Stored in `mt_reports.reason`; labels live under `report.reason.<key>` in i18n. */
export const REPORT_REASONS = ['fraud', 'price_above_face', 'behaviour', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PROOF_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const MAX_TICKETS_PER_LISTING = 10;
export const DEFAULT_PAGE_SIZE = 24;
