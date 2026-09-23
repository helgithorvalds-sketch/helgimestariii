import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarX, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '../lib/i18n';
import { useAuth, loginHref } from '../lib/auth';
import { href } from '../lib/paths';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import {
  useCompletedDealPrices,
  useEventListings,
  useEventRequests,
  useMarketEvent,
  usePriceSnapshots,
  useSettings,
} from '../lib/queries';
import type { ListingWithSeller } from '../lib/types';
import { PageContainer } from '../components/layout/PageContainer';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ReportDialog } from '../components/common/ReportDialog';
import { bidButtonClass } from '../components/common/buttonClasses';
import { EventHeader } from '../components/event/EventHeader';
import { StatsRow, StatsRowSkeleton } from '../components/event/StatsRow';
import { PriceChart } from '../components/event/PriceChart';
import { OrderBook } from '../components/event/OrderBook';
import { BuyDialog } from '../components/event/BuyDialog';
import { AlertButton } from '../components/event/AlertButton';
import { HowItWorks } from '../components/event/HowItWorks';
import { eventFaceValue, isEventOpen, reservationMinutes, type ChartRange } from '../components/event/eventUtils';

function EventPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-3 w-48 bg-surface-2" />
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-lg bg-surface-2 sm:h-[72px] sm:w-[72px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20 bg-surface-2" />
          <Skeleton className="h-7 w-2/3 bg-surface-2" />
          <Skeleton className="h-3.5 w-1/2 bg-surface-2" />
        </div>
      </div>
      <StatsRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-[320px] w-full rounded-[10px] bg-surface-2" />
          <Skeleton className="h-[280px] w-full rounded-[10px] bg-surface-2" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-[10px] bg-surface-2" />
      </div>
    </div>
  );
}

/** `/vidburdir/:eventId` — header, stats, chart, order book, CTAs, how-it-works (spec §5). */
export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [params] = useSearchParams();
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const eventQ = useMarketEvent(eventId);
  const listingsQ = useEventListings(eventId);
  const requestsQ = useEventRequests(eventId);
  const snapshotsQ = usePriceSnapshots(eventId, 365);
  const soldQ = useCompletedDealPrices(eventId);
  const settingsQ = useSettings();

  const [range, setRange] = useState<ChartRange>('month');
  const [buyListing, setBuyListing] = useState<ListingWithSeller | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const event = eventQ.data ?? null;
  useDocumentTitle(event?.title ?? null);

  if (!eventId || eventQ.isPending) {
    return (
      <PageContainer className="py-4 sm:py-6">
        <EventPageSkeleton />
      </PageContainer>
    );
  }

  if (eventQ.isError) {
    return (
      <PageContainer className="py-6">
        <ErrorState error={eventQ.error} retry={() => void eventQ.refetch()} />
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer className="py-8">
        <EmptyState
          icon={CalendarX}
          title={t('event.notFoundTitle')}
          body={t('event.notFoundBody')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={href('/')}>{t('common.goHome')}</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const face = eventFaceValue(event);
  const open = isEventOpen(event);
  const minutes = reservationMinutes(settingsQ.data);
  const autoOpenAlert = params.get('vakta') === '1';
  const venue = [event.venue_name, event.city].filter(Boolean).join(' · ');

  const onBuy = (listing: ListingWithSeller) => {
    if (!user) {
      navigate(loginHref(location.pathname + location.search));
      return;
    }
    setBuyListing(listing);
    setBuyOpen(true);
  };

  return (
    <PageContainer className={cn('py-4 sm:py-6', open && 'pb-20 md:pb-6')}>
      <EventHeader
        event={event}
        onReport={() => setReportOpen(true)}
        alertButton={open ? <AlertButton eventId={event.id} faceValue={face} autoOpen={autoOpenAlert} /> : undefined}
      />

      <StatsRow event={event} listings={listingsQ.data} className="mt-5" />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <PriceChart
            snapshots={snapshotsQ.data}
            faceValue={face}
            range={range}
            onRangeChange={setRange}
            loading={snapshotsQ.isPending}
            error={snapshotsQ.isError ? snapshotsQ.error : undefined}
            retry={() => void snapshotsQ.refetch()}
            lastSold={soldQ.data?.[0] ?? null}
          />
          <OrderBook
            event={event}
            listings={listingsQ.data}
            requests={requestsQ.data}
            loading={listingsQ.isPending || requestsQ.isPending}
            error={listingsQ.isError ? listingsQ.error : requestsQ.isError ? requestsQ.error : undefined}
            retry={() => {
              void listingsQ.refetch();
              void requestsQ.refetch();
            }}
            onBuy={onBuy}
            currentUserId={user?.id ?? null}
          />
        </div>
        <aside className="min-w-0 space-y-4" aria-label={t('event.how.title')}>
          <HowItWorks faceValue={face} reservationMinutes={minutes} />
          {event.description && (
            <section className="mt-panel" aria-labelledby="mt-about-h">
              <div className="border-b border-border px-[14px] py-3">
                <h2 id="mt-about-h" className="text-[14px] font-semibold">
                  {t('event.about.title')}
                </h2>
              </div>
              <div className="space-y-2 px-[14px] py-3 text-[13px] text-muted-foreground">
                <p className="whitespace-pre-line">{event.description}</p>
                {event.source === 'tix' && <p>{t('event.about.tixNote')}</p>}
              </div>
            </section>
          )}
        </aside>
      </div>

      {open && (
        <div
          className="fixed inset-x-0 z-30 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
          data-testid="mobile-cta"
        >
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-10 flex-1 text-[13px] font-semibold">
              <Link to={href(`/selja?event=${event.id}`)}>
                <Tag className="h-[15px] w-[15px]" aria-hidden="true" />
                {t('event.sellShort')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className={cn('h-10 flex-1 text-[13px] font-semibold', bidButtonClass)}>
              <Link to={href(`/oska?event=${event.id}`)}>{t('event.want')}</Link>
            </Button>
            <AlertButton eventId={event.id} faceValue={face} compact />
          </div>
        </div>
      )}

      <BuyDialog listing={buyListing} open={buyOpen} onOpenChange={setBuyOpen} reservationMinutes={minutes} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} target={{}} contextLabel={venue ? `${event.title} · ${venue}` : event.title} />
    </PageContainer>
  );
}
