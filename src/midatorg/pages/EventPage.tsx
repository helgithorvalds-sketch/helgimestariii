import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarX, ShoppingCart, Tag } from 'lucide-react';
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
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { EventHeader } from '../components/event/EventHeader';
import { StatsRowSkeleton, StatsRow } from '../components/event/StatsRow';
import { PriceChart } from '../components/event/PriceChart';
import { OrderBook, SELL_SECTION_ID } from '../components/event/OrderBook';
import { BuyDialog } from '../components/event/BuyDialog';
import { AlertButton } from '../components/event/AlertButton';
import { HowItWorks } from '../components/event/HowItWorks';
import { eventFaceValue, isEventOpen, reservationMinutes, type ChartRange } from '../components/event/eventUtils';

function EventPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-3 w-48 bg-secondary" />
      <Skeleton className="aspect-video max-h-[360px] w-full rounded-xl bg-secondary" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-20 bg-secondary" />
        <Skeleton className="h-8 w-2/3 bg-secondary" />
        <Skeleton className="h-4 w-1/2 bg-secondary" />
      </div>
      <StatsRowSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-xl bg-secondary" />
          <Skeleton className="h-[160px] w-full rounded-xl bg-secondary" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-xl bg-secondary" />
      </div>
    </div>
  );
}

/** Scrolls to the "Miðar til sölu" list (no-op where scrollIntoView is unavailable, e.g. jsdom). */
function scrollToTickets() {
  const el = document.getElementById(SELL_SECTION_ID);
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** `/vidburdir/:eventId` — hero, title, buttons, summary strip, tickets for sale, wanted, price history, how it works (DESIGN-v2 §4). */
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
      <PageContainer className="py-5 sm:py-8">
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
            <Button asChild variant="outline" size="sm" className={cn('h-10 rounded-lg px-4 text-[14px]', secondaryButtonClass)}>
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
    <PageContainer className={cn('py-5 sm:py-8', open && 'pb-24 md:pb-8')}>
      <EventHeader
        event={event}
        onReport={() => setReportOpen(true)}
        onBuy={scrollToTickets}
        alertButton={open ? <AlertButton eventId={event.id} faceValue={face} autoOpen={autoOpenAlert} /> : undefined}
      />

      <StatsRow event={event} listings={listingsQ.data} className="mt-6" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
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
        </div>
        <aside className="min-w-0 space-y-6" aria-label={t('event.how.title')}>
          <HowItWorks faceValue={face} reservationMinutes={minutes} />
          {event.description && (
            <section className="mt-panel p-4 sm:p-5" aria-labelledby="mt-about-h">
              <h2 id="mt-about-h" className="text-[20px] font-semibold tracking-tight">
                {t('event.about.title')}
              </h2>
              <div className="mt-3 space-y-2 text-[14px] text-muted-foreground">
                <p className="whitespace-pre-line">{event.description}</p>
                {event.source === 'tix' && <p>{t('event.about.tixNote')}</p>}
              </div>
            </section>
          )}
        </aside>
      </div>

      {open && (
        <div
          className="fixed inset-x-0 z-30 border-t border-border bg-background px-4 py-2 md:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
          data-testid="mobile-cta"
        >
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" className="h-11 flex-1 rounded-lg text-[14px] font-semibold" onClick={scrollToTickets}>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {t('event.buy')}
            </Button>
            <Button asChild variant="outline" size="sm" className={cn('h-11 flex-1 rounded-lg text-[14px] font-semibold', secondaryButtonClass)}>
              <Link to={href(`/selja?event=${event.id}`)}>
                <Tag className="h-4 w-4" aria-hidden="true" />
                {t('event.sell')}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <BuyDialog listing={buyListing} open={buyOpen} onOpenChange={setBuyOpen} reservationMinutes={minutes} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} target={{}} contextLabel={venue ? `${event.title} · ${venue}` : event.title} />
    </PageContainer>
  );
}
