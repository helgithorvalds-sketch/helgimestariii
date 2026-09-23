/**
 * react-query hooks over lib/api. Keys are stable and prefixed ['mt', …] so a
 * feature can invalidate precisely (e.g. `qc.invalidateQueries({ queryKey: mtKeys.listings(eventId) })`).
 * Every mutation toasts errors through useErrorToast; pass your own
 * `onSuccess` / `onError` to `mutate(vars, { … })` when you need more.
 */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './auth';
import { useErrorToast } from './errors';
import { DEFAULT_PAGE_SIZE } from './constants';
import * as events from './api/events';
import * as listings from './api/listings';
import * as requests from './api/requests';
import * as deals from './api/deals';
import * as messages from './api/messages';
import * as ratings from './api/ratings';
import * as profiles from './api/profiles';
import * as alerts from './api/alerts';
import * as notifications from './api/notifications';
import * as reports from './api/reports';
import * as admin from './api/admin';
import type {
  CreateListingInput,
  CreateManualEventInput,
  CreateReportInput,
  CreateRequestInput,
  DealAction,
  Json,
  MarketEventsParams,
  Message,
  ProfilePatch,
  ReportStatus,
  UpdateListingPatch,
  UpdateRequestPatch,
  VerificationLevel,
} from './types';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const mtKeys = {
  all: ['mt'] as const,
  events: (params: MarketEventsParams = {}) => ['mt', 'events', params] as const,
  eventsInfinite: (params: MarketEventsParams = {}) => ['mt', 'events', 'infinite', params] as const,
  event: (id: string) => ['mt', 'event', id] as const,
  eventSearch: (q: string) => ['mt', 'event-search', q] as const,
  venues: ['mt', 'venues'] as const,
  listings: (eventId: string) => ['mt', 'listings', eventId] as const,
  requests: (eventId: string) => ['mt', 'requests', eventId] as const,
  snapshots: (eventId: string, days: number) => ['mt', 'snapshots', eventId, days] as const,
  soldPrices: (eventId: string) => ['mt', 'sold', eventId] as const,
  deals: ['mt', 'deals'] as const,
  deal: (id: string) => ['mt', 'deal', id] as const,
  messages: (dealId: string) => ['mt', 'messages', dealId] as const,
  me: ['mt', 'me'] as const,
  profile: (id: string) => ['mt', 'profile', id] as const,
  myListings: ['mt', 'my-listings'] as const,
  userListings: (userId: string) => ['mt', 'user-listings', userId] as const,
  myRequests: ['mt', 'my-requests'] as const,
  myAlerts: ['mt', 'my-alerts'] as const,
  myAlert: (eventId: string) => ['mt', 'my-alerts', eventId] as const,
  notifications: ['mt', 'notifications'] as const,
  notificationsList: (limit: number) => ['mt', 'notifications', 'list', limit] as const,
  unread: ['mt', 'notifications', 'unread'] as const,
  ratings: (userId: string) => ['mt', 'ratings', userId] as const,
  myRating: (dealId: string) => ['mt', 'my-rating', dealId] as const,
  myProof: (listingId: string) => ['mt', 'proof', listingId] as const,
  proofUrl: (listingId: string) => ['mt', 'proof-url', listingId] as const,
  settings: ['mt', 'settings'] as const,
  admin: {
    reports: (status: ReportStatus | 'all') => ['mt', 'admin', 'reports', status] as const,
    users: (q: string) => ['mt', 'admin', 'users', q] as const,
    events: (q: string) => ['mt', 'admin', 'events', q] as const,
    disputes: ['mt', 'admin', 'disputes'] as const,
  },
};

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;

// ---------------------------------------------------------------------------
// Events / market
// ---------------------------------------------------------------------------
export function useMarketEvents(params: MarketEventsParams = {}, opts?: QueryOpts<Awaited<ReturnType<typeof events.listMarketEvents>>>) {
  return useQuery({
    queryKey: mtKeys.events(params),
    queryFn: () => events.listMarketEvents(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    ...opts,
  });
}

/** Infinite version for the "Sýna fleiri" grid. `hasNextPage` is true while a page came back full. */
export function useInfiniteMarketEvents(params: Omit<MarketEventsParams, 'offset'> = {}) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: mtKeys.eventsInfinite({ ...params, limit }),
    queryFn: ({ pageParam }) => events.listMarketEvents({ ...params, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length < limit ? undefined : pages.length * limit),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useMarketEvent(id: string | undefined) {
  return useQuery({
    queryKey: mtKeys.event(id ?? ''),
    queryFn: () => events.getMarketEvent(id as string),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useEventSearch(q: string, limit = 10) {
  return useQuery({
    queryKey: mtKeys.eventSearch(q.trim()),
    queryFn: () => events.searchEvents(q, limit),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useVenues() {
  return useQuery({ queryKey: mtKeys.venues, queryFn: events.listVenues, staleTime: 5 * 60_000 });
}

export function useEventListings(eventId: string | undefined) {
  return useQuery({
    queryKey: mtKeys.listings(eventId ?? ''),
    queryFn: () => listings.listEventListings(eventId as string),
    enabled: !!eventId,
    staleTime: 10_000,
  });
}

export function useEventRequests(eventId: string | undefined) {
  return useQuery({
    queryKey: mtKeys.requests(eventId ?? ''),
    queryFn: () => requests.listEventRequests(eventId as string),
    enabled: !!eventId,
    staleTime: 10_000,
  });
}

export function usePriceSnapshots(eventId: string | undefined, days = 90) {
  return useQuery({
    queryKey: mtKeys.snapshots(eventId ?? '', days),
    queryFn: () => events.listPriceSnapshots(eventId as string, days),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
  });
}

export function useCompletedDealPrices(eventId: string | undefined) {
  return useQuery({
    queryKey: mtKeys.soldPrices(eventId ?? ''),
    queryFn: () => events.listCompletedDealPrices(eventId as string),
    enabled: !!eventId,
    staleTime: 60_000,
  });
}

export function useCreateManualEvent() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (input: CreateManualEventInput) => events.createManualEvent(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
      void qc.invalidateQueries({ queryKey: ['mt', 'event-search'] });
    },
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
function invalidateListing(qc: ReturnType<typeof useQueryClient>, eventId?: string) {
  void qc.invalidateQueries({ queryKey: mtKeys.myListings });
  void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
  if (eventId) {
    void qc.invalidateQueries({ queryKey: mtKeys.listings(eventId) });
    void qc.invalidateQueries({ queryKey: mtKeys.event(eventId) });
  } else {
    void qc.invalidateQueries({ queryKey: ['mt', 'listings'] });
    void qc.invalidateQueries({ queryKey: ['mt', 'event'] });
  }
}

export function useMyListings() {
  const { user } = useAuth();
  return useQuery({ queryKey: mtKeys.myListings, queryFn: listings.listMyListings, enabled: !!user });
}

export function useUserListings(userId: string | undefined) {
  return useQuery({
    queryKey: mtKeys.userListings(userId ?? ''),
    queryFn: () => listings.listUserListings(userId as string),
    enabled: !!userId,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (input: CreateListingInput) => listings.createListing(input),
    onSuccess: (listing) => invalidateListing(qc, listing.event_id),
    onError: (err) => void showError(err),
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateListingPatch }) => listings.updateListing(id, patch),
    onSuccess: (listing) => invalidateListing(qc, listing.event_id),
    onError: (err) => void showError(err),
  });
}

export function useCancelListing() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => listings.cancelListing(id),
    onSuccess: (listing) => invalidateListing(qc, listing.event_id),
    onError: (err) => void showError(err),
  });
}

export function useMyProof(listingId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.myProof(listingId ?? ''),
    queryFn: () => listings.getMyProof(listingId as string),
    enabled: !!user && !!listingId,
  });
}

export function useProofSignedUrl(listingId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.proofUrl(listingId ?? ''),
    queryFn: () => listings.getProofSignedUrl(listingId as string),
    enabled: !!user && !!listingId && enabled,
    staleTime: 4 * 60_000,
  });
}

export function useUploadProof() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ listingId, file }: { listingId: string; file: File }) => listings.uploadProof(listingId, file),
    onSuccess: (proof) => {
      void qc.invalidateQueries({ queryKey: mtKeys.myProof(proof.listing_id) });
      void qc.invalidateQueries({ queryKey: mtKeys.proofUrl(proof.listing_id) });
      void qc.invalidateQueries({ queryKey: mtKeys.myListings });
    },
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
function invalidateRequest(qc: ReturnType<typeof useQueryClient>, eventId?: string) {
  void qc.invalidateQueries({ queryKey: mtKeys.myRequests });
  void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
  if (eventId) {
    void qc.invalidateQueries({ queryKey: mtKeys.requests(eventId) });
    void qc.invalidateQueries({ queryKey: mtKeys.event(eventId) });
  } else {
    void qc.invalidateQueries({ queryKey: ['mt', 'requests'] });
    void qc.invalidateQueries({ queryKey: ['mt', 'event'] });
  }
}

export function useMyRequests() {
  const { user } = useAuth();
  return useQuery({ queryKey: mtKeys.myRequests, queryFn: requests.listMyRequests, enabled: !!user });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (input: CreateRequestInput) => requests.createRequest(input),
    onSuccess: (r) => invalidateRequest(qc, r.event_id),
    onError: (err) => void showError(err),
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRequestPatch }) => requests.updateRequest(id, patch),
    onSuccess: (r) => invalidateRequest(qc, r.event_id),
    onError: (err) => void showError(err),
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => requests.cancelRequest(id),
    onSuccess: (r) => invalidateRequest(qc, r.event_id),
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------
export function useMyDeals() {
  const { user } = useAuth();
  return useQuery({ queryKey: mtKeys.deals, queryFn: deals.listMyDeals, enabled: !!user, staleTime: 10_000 });
}

/** Loads a deal with context and keeps it fresh through the realtime channel. */
export function useDeal(id: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: mtKeys.deal(id ?? ''),
    queryFn: () => deals.getDeal(id as string),
    enabled: !!user && !!id,
  });
  useEffect(() => {
    if (!user || !id) return;
    return deals.subscribeDeal(id, () => {
      void qc.invalidateQueries({ queryKey: mtKeys.deal(id) });
      void qc.invalidateQueries({ queryKey: mtKeys.deals });
    });
  }, [user, id, qc]);
  return query;
}

export function useReserveListing() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ listingId, quantity }: { listingId: string; quantity: number }) =>
      deals.reserveListing(listingId, quantity),
    onSuccess: (deal) => {
      qc.setQueryData(mtKeys.deal(deal.id), undefined);
      void qc.invalidateQueries({ queryKey: mtKeys.deals });
      invalidateListing(qc, deal.event_id);
    },
    onError: (err) => void showError(err),
  });
}

export function useTransitionDeal() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ dealId, action, reason }: { dealId: string; action: DealAction; reason?: string | null }) =>
      deals.transitionDeal(dealId, action, reason),
    onSuccess: (deal) => {
      void qc.invalidateQueries({ queryKey: mtKeys.deal(deal.id) });
      void qc.invalidateQueries({ queryKey: mtKeys.deals });
      void qc.invalidateQueries({ queryKey: mtKeys.admin.disputes });
      invalidateListing(qc, deal.event_id);
    },
    onError: (err, vars) => {
      void showError(err);
      // a RESERVATION_EXPIRED etc. still changed the row server-side
      void qc.invalidateQueries({ queryKey: mtKeys.deal(vars.dealId) });
      void qc.invalidateQueries({ queryKey: mtKeys.deals });
    },
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
/** Chat for a deal; realtime inserts are appended to the cache (deduplicated by id). */
export function useMessages(dealId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: mtKeys.messages(dealId ?? ''),
    queryFn: () => messages.listMessages(dealId as string),
    enabled: !!user && !!dealId,
  });
  useEffect(() => {
    if (!user || !dealId) return;
    return messages.subscribeMessages(dealId, (msg) => {
      qc.setQueryData<Message[]>(mtKeys.messages(dealId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    });
  }, [user, dealId, qc]);
  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ dealId, body }: { dealId: string; body: string }) => messages.sendMessage(dealId, body),
    onSuccess: (msg) => {
      qc.setQueryData<Message[]>(mtKeys.messages(msg.deal_id), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------
export function useRatingsForUser(userId: string | undefined) {
  return useQuery({
    queryKey: mtKeys.ratings(userId ?? ''),
    queryFn: () => ratings.listRatingsForUser(userId as string),
    enabled: !!userId,
  });
}

export function useMyRatingForDeal(dealId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.myRating(dealId ?? ''),
    queryFn: () => ratings.getMyRatingForDeal(dealId as string),
    enabled: !!user && !!dealId,
  });
}

export function useRateDeal() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ dealId, score, comment }: { dealId: string; score: number; comment?: string | null }) =>
      ratings.rateDeal(dealId, score, comment),
    onSuccess: (rating) => {
      void qc.invalidateQueries({ queryKey: mtKeys.myRating(rating.deal_id) });
      void qc.invalidateQueries({ queryKey: mtKeys.ratings(rating.ratee_id) });
      void qc.invalidateQueries({ queryKey: mtKeys.profile(rating.ratee_id) });
      void qc.invalidateQueries({ queryKey: mtKeys.deal(rating.deal_id) });
    },
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: mtKeys.me, queryFn: profiles.getMyProfile, enabled: !!user });
}

export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: mtKeys.profile(id ?? ''),
    queryFn: () => profiles.getPublicProfile(id as string),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { refreshProfile } = useAuth();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => profiles.updateMyProfile(patch),
    onSuccess: async (p) => {
      qc.setQueryData(mtKeys.me, p);
      void qc.invalidateQueries({ queryKey: mtKeys.profile(p.id) });
      await refreshProfile();
    },
    onError: (err) => void showError(err),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const { refreshProfile, user } = useAuth();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (file: File) => profiles.uploadAvatar(file),
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: mtKeys.me });
      if (user) void qc.invalidateQueries({ queryKey: mtKeys.profile(user.id) });
      await refreshProfile();
    },
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------
export function useMyAlerts() {
  const { user } = useAuth();
  return useQuery({ queryKey: mtKeys.myAlerts, queryFn: alerts.listMyAlerts, enabled: !!user });
}

export function useMyAlert(eventId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.myAlert(eventId ?? ''),
    queryFn: () => alerts.getMyAlert(eventId as string),
    enabled: !!user && !!eventId,
  });
}

export function useUpsertAlert() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ eventId, maxPrice }: { eventId: string; maxPrice: number | null }) =>
      alerts.upsertAlert(eventId, maxPrice),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mtKeys.myAlerts }),
    onError: (err) => void showError(err),
  });
}

export function useRemoveAlert() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (eventId: string) => alerts.removeAlert(eventId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mtKeys.myAlerts }),
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function useNotifications(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.notificationsList(limit),
    queryFn: () => notifications.listNotifications(limit),
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: mtKeys.unread,
    queryFn: notifications.unreadCount,
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

/**
 * Subscribes once to realtime notification inserts and invalidates the
 * notification queries. AppShell mounts it; do not mount it twice.
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    return notifications.subscribeNotifications(() => {
      void qc.invalidateQueries({ queryKey: mtKeys.notifications });
    }, user.id);
  }, [user, qc]);
}

export function useMarkRead() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => notifications.markRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mtKeys.notifications }),
    onError: (err) => void showError(err),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: () => notifications.markAllRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mtKeys.notifications }),
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export function useCreateReport() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (input: CreateReportInput) => reports.createReport(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'reports'] }),
    onError: (err) => void showError(err),
  });
}

// ---------------------------------------------------------------------------
// Settings & admin
// ---------------------------------------------------------------------------
export function useSettings() {
  return useQuery({ queryKey: mtKeys.settings, queryFn: admin.getSettings, staleTime: 5 * 60_000 });
}

export function useSetSetting() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Json }) => admin.setSetting(key, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mtKeys.settings }),
    onError: (err) => void showError(err),
  });
}

export function useAdminReports(status: ReportStatus | 'all' = 'open') {
  const { isAdmin } = useAuth();
  return useQuery({ queryKey: mtKeys.admin.reports(status), queryFn: () => admin.listReports(status), enabled: isAdmin });
}

export function useResolveReport() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<ReportStatus, 'open'> }) =>
      admin.resolveReport(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'reports'] }),
    onError: (err) => void showError(err),
  });
}

export function useAdminUsers(q: string) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: mtKeys.admin.users(q.trim()),
    queryFn: () => admin.searchUsers(q),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

export function useSetBan() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ userId, banned, reason }: { userId: string; banned: boolean; reason?: string | null }) =>
      admin.setBan(userId, banned, reason),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'users'] });
      void qc.invalidateQueries({ queryKey: mtKeys.profile(vars.userId) });
    },
    onError: (err) => void showError(err),
  });
}

export function useSetVerification() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ userId, level }: { userId: string; level: VerificationLevel }) =>
      admin.setVerification(userId, level),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'users'] });
      void qc.invalidateQueries({ queryKey: mtKeys.profile(vars.userId) });
    },
    onError: (err) => void showError(err),
  });
}

export function useAdminEvents(q: string) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: mtKeys.admin.events(q.trim()),
    queryFn: () => admin.listAllEvents(q),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: admin.EventPatch }) => admin.updateEvent(id, patch),
    onSuccess: (event) => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
      void qc.invalidateQueries({ queryKey: mtKeys.event(event.id) });
    },
    onError: (err) => void showError(err),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => admin.deleteEvent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
    },
    onError: (err) => void showError(err),
  });
}

export function useFetchTixEvent() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: (url: string) => admin.fetchTixEvent(url),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
    },
    onError: (err) => void showError(err),
  });
}

export function useRunTixImport() {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: () => admin.runTixImport(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mt', 'admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['mt', 'events'] });
    },
    onError: (err) => void showError(err),
  });
}

export function useDisputes() {
  const { isAdmin } = useAuth();
  return useQuery({ queryKey: mtKeys.admin.disputes, queryFn: admin.listDisputes, enabled: isAdmin });
}
