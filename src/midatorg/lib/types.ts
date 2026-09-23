import type { Database, Json } from './database.types';

export type { Database, Json };

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];
type Enums = Database['public']['Enums'];

export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type Insert<T extends keyof Tables> = Tables[T]['Insert'];
export type Update<T extends keyof Tables> = Tables[T]['Update'];

// ---------------------------------------------------------------------------
// Table rows
// ---------------------------------------------------------------------------
export type Profile = Row<'mt_profiles'>;
export type Venue = Row<'mt_venues'>;
export type EventRow = Row<'mt_events'>;
export type Listing = Row<'mt_listings'>;
export type ListingProof = Row<'mt_listing_proofs'>;
export type TicketRequest = Row<'mt_requests'>;
export type Deal = Row<'mt_deals'>;
export type Message = Row<'mt_messages'>;
export type Rating = Row<'mt_ratings'>;
export type Report = Row<'mt_reports'>;
export type Alert = Row<'mt_alerts'>;
export type Notification = Row<'mt_notifications'>;
export type PriceSnapshot = Row<'mt_price_snapshots'>;
export type Setting = Row<'mt_settings'>;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type DealStatus = Enums['mt_deal_status'];
export type ListingStatus = Enums['mt_listing_status'];
export type RequestStatus = Enums['mt_request_status'];
export type EventCategory = Enums['mt_event_category'];
export type EventStatus = Enums['mt_event_status'];
export type EventSource = Enums['mt_event_source'];
export type VerificationLevel = Enums['mt_verification_level'];
export type ReportStatus = Enums['mt_report_status'];
export type NotificationType = Enums['mt_notification_type'];

/** Actions accepted by the `mt_deal_transition` RPC. */
export type DealAction =
  | 'mark_paid'
  | 'confirm_payment'
  | 'confirm_received'
  | 'cancel'
  | 'dispute'
  | 'admin_complete'
  | 'admin_cancel';

// ---------------------------------------------------------------------------
// Views. The generator marks every view column nullable; the SQL guarantees
// the columns below (coalesce / not-null source columns), so we narrow them.
// ---------------------------------------------------------------------------
export type EventStatsViewRow = Views['mt_event_stats']['Row'];
export type MarketEventViewRow = Views['mt_events_market']['Row'];
export type PublicProfileViewRow = Views['mt_public_profiles']['Row'];

export type EventStats = {
  event_id: string;
  tickets_available: number;
  listings_active: number;
  min_ask: number | null;
  avg_ask: number | null;
  requests_active: number;
  wanted_tickets: number;
  max_bid: number | null;
  sold_count: number;
  last_sold_price: number | null;
  last_sold_at: string | null;
};

/** Row of `mt_events_market` = every `mt_events` column + the `mt_event_stats` aggregates. */
export type MarketEvent = EventRow & Omit<EventStats, 'event_id'>;

/** Row of `mt_public_profiles`. */
export type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  verification: VerificationLevel;
  created_at: string;
  is_banned: boolean;
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  purchases_count: number;
};

// ---------------------------------------------------------------------------
// Joined shapes returned by lib/api
// ---------------------------------------------------------------------------
export type ListingWithSeller = Listing & { seller: PublicProfile };
export type RequestWithBuyer = TicketRequest & { buyer: PublicProfile };
export type ListingWithEvent = Listing & { event: EventRow };
export type RequestWithEvent = TicketRequest & { event: EventRow };
export type AlertWithEvent = Alert & { event: MarketEvent };
export type RatingWithRater = Rating & { rater: PublicProfile };
export type ReportWithContext = Report & { reporter: PublicProfile | null; reported_user: PublicProfile | null };
export type DealWithContext = Deal & {
  event: EventRow;
  buyer: PublicProfile;
  seller: PublicProfile;
  listing: Listing;
};

// ---------------------------------------------------------------------------
// API inputs
// ---------------------------------------------------------------------------
export type MarketSort = 'date' | 'demand' | 'price';

export type MarketEventsParams = {
  q?: string;
  category?: EventCategory | 'all' | null;
  sort?: MarketSort;
  /** Defaults to 'upcoming'. Pass 'all' for every status (admin). */
  status?: EventStatus | 'all';
  limit?: number;
  offset?: number;
};

export type CreateListingInput = {
  event_id: string;
  quantity: number;
  face_value: number;
  asking_price: number;
  ticket_type?: string | null;
  seat_info?: string | null;
  notes?: string | null;
  split_allowed?: boolean;
};

export type UpdateListingPatch = Partial<
  Pick<Listing, 'asking_price' | 'ticket_type' | 'seat_info' | 'notes' | 'split_allowed'>
>;

export type CreateRequestInput = {
  event_id: string;
  quantity: number;
  max_price?: number | null;
  notes?: string | null;
};

export type UpdateRequestPatch = Partial<Pick<TicketRequest, 'quantity' | 'max_price' | 'notes'>>;

export type CreateManualEventInput = {
  title: string;
  category: EventCategory;
  starts_at: string;
  venue_name?: string | null;
  city?: string | null;
  description?: string | null;
  tix_url?: string | null;
  image_url?: string | null;
  face_value_min?: number | null;
  face_value_max?: number | null;
};

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'bio'>>;

export type CreateReportInput = {
  reported_user_id?: string | null;
  listing_id?: string | null;
  deal_id?: string | null;
  reason: string;
  details?: string | null;
};

export type ReportTarget = { userId?: string; listingId?: string; dealId?: string };
