import { Link } from 'react-router-dom';
import { MessageCircle, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatISK, formatNumber } from '../../lib/format';
import type { ListingWithSeller, MarketEvent, RequestWithBuyer } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { bidButtonClass } from '../common/buttonClasses';
import { SellRow } from './SellRow';
import { WantRow } from './WantRow';
import { cumulativeDepth, eventFaceValue, isEventOpen } from './eventUtils';
import { MD_QUERY, useMediaQuery } from './useMediaQuery';

export type OrderBookProps = {
  event: MarketEvent;
  listings: ListingWithSeller[] | undefined;
  requests: RequestWithBuyer[] | undefined;
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  onBuy: (listing: ListingWithSeller) => void;
  /** Signed-in user, to mark own rows. */
  currentUserId?: string | null;
  className?: string;
};

const thClass = 'px-[6px] py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:px-3';

function ColumnHead({
  tone,
  title,
  count,
  hint,
}: {
  tone: 'ask' | 'bid';
  title: string;
  count: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-[6px] py-2.5 text-[13px] sm:px-3">
      <span aria-hidden="true" className={cn('inline-block h-2 w-2 shrink-0 rounded-[2px]', tone === 'ask' ? 'bg-ask' : 'bg-bid')} />
      <span className="font-semibold">{title}</span>
      <span className="text-[12px] text-muted-foreground">{count}</span>
      <span className="ml-auto hidden text-[12px] text-muted-foreground sm:inline">{hint}</span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-[30px] w-[30px] rounded-full bg-surface-2" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2 bg-surface-2" />
            <Skeleton className="h-3 w-1/3 bg-surface-2" />
          </div>
          <Skeleton className="h-[34px] w-[70px] bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

type ColumnProps = {
  event: MarketEvent;
  open: boolean;
  loading: boolean;
  currentUserId: string | null | undefined;
};

function SellColumn({
  event,
  listings,
  onBuy,
  open,
  loading,
  currentUserId,
}: ColumnProps & { listings: ListingWithSeller[] | undefined; onBuy: (l: ListingWithSeller) => void }) {
  const t = useT();
  const [locale] = useLocale();
  const rows = listings ?? [];
  const depths = cumulativeDepth(rows.map((l) => l.quantity_remaining));
  const waiting = event.requests_active ?? 0;
  const countLabel = rows.length === 1 ? t('event.book.listingOne') : t('event.book.listings', { count: formatNumber(rows.length, locale) });

  return (
    <div className="min-w-0" data-testid="sell-column">
      <ColumnHead tone="ask" title={t('event.book.sell')} count={countLabel} hint={t('event.book.lowestFirst')} />
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-3 py-5 text-[13px] sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="text-muted-foreground">
            {t('event.book.sellEmpty')}{' '}
            {waiting > 0 && (
              <span className="text-foreground">
                {waiting === 1 ? t('event.book.sellEmptyWaitingOne') : t('event.book.sellEmptyWaiting', { count: formatNumber(waiting, locale) })}
              </span>
            )}
          </p>
          {open && (
            <Button asChild variant="outline" size="sm" className={cn('h-[34px] shrink-0 text-[13px] font-semibold', bidButtonClass)}>
              <Link to={href(`/vidburdir/${event.id}?vakta=1`)}>{t('event.book.alert')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col />
              <col className="w-[74px]" />
              <col className="w-[96px] sm:w-[136px]" />
              <col className="w-[76px] sm:w-[86px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={thClass}>
                  {t('event.book.th.seller')}
                  <span className="hidden sm:inline"> {t('event.book.th.seat')}</span>
                </th>
                <th scope="col" className={thClass}>
                  {t('event.book.th.qty')}
                </th>
                <th scope="col" className={cn(thClass, 'text-right')}>
                  {t('event.book.th.price')}
                </th>
                <th scope="col" className={cn(thClass, 'text-right')}>
                  <span className="sr-only">{t('event.book.th.action')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => (
                <SellRow
                  key={l.id}
                  listing={l}
                  depth={depths[i]}
                  onBuy={onBuy}
                  isOwn={!!currentUserId && l.seller_id === currentUserId}
                  disabled={!open}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-start gap-2 border-t border-border px-3 py-2.5 text-[12px] text-muted-foreground">
        <MessageCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('event.book.sellFoot')}</span>
      </div>
    </div>
  );
}

function WantColumn({
  event,
  requests,
  open,
  loading,
  currentUserId,
}: ColumnProps & { requests: RequestWithBuyer[] | undefined }) {
  const t = useT();
  const [locale] = useLocale();
  const rows = requests ?? [];
  const depths = cumulativeDepth(rows.map((r) => r.quantity));
  const countLabel = rows.length === 1 ? t('event.book.requestOne') : t('event.book.requests', { count: formatNumber(rows.length, locale) });

  return (
    <div className="min-w-0" data-testid="want-column">
      <ColumnHead tone="bid" title={t('event.book.want')} count={countLabel} hint={t('event.book.highestFirst')} />
      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-3 py-5 text-[13px] sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="text-muted-foreground">{t('event.book.wantEmpty')}</p>
          {open && (
            <Button asChild variant="outline" size="sm" className={cn('h-[34px] shrink-0 text-[13px] font-semibold', bidButtonClass)}>
              <Link to={href(`/oska?event=${event.id}`)}>{t('event.want')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col />
              <col className="w-[74px]" />
              <col className="w-[92px] sm:w-[110px]" />
              <col className="w-[84px] sm:w-[96px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={thClass}>
                  {t('event.book.th.buyer')}
                </th>
                <th scope="col" className={thClass}>
                  {t('event.book.th.qty')}
                </th>
                <th scope="col" className={cn(thClass, 'text-right')}>
                  {t('event.book.th.max')}
                </th>
                <th scope="col" className={cn(thClass, 'text-right')}>
                  <span className="sr-only">{t('event.book.th.action')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <WantRow key={r.id} request={r} depth={depths[i]} isOwn={!!currentUserId && r.buyer_id === currentUserId} disabled={!open} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-start gap-2 border-t border-border px-3 py-2.5 text-[12px] text-muted-foreground">
        <User className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('event.book.wantFoot')}</span>
      </div>
    </div>
  );
}

/**
 * Panel "Skráningar": two columns (Til sölu · Óskað eftir) from `md`, tabs below it,
 * with the trust bar at the bottom.
 */
export function OrderBook({ event, listings, requests, loading = false, error, retry, onBuy, currentUserId, className }: OrderBookProps) {
  const t = useT();
  const [locale] = useLocale();
  const wide = useMediaQuery(MD_QUERY);
  const face = eventFaceValue(event);
  const open = isEventOpen(event);
  const tickets = event.tickets_available ?? listings?.reduce((s, l) => s + l.quantity_remaining, 0) ?? 0;
  const wanted = event.wanted_tickets ?? requests?.reduce((s, r) => s + r.quantity, 0) ?? 0;

  const sell = <SellColumn event={event} listings={listings} onBuy={onBuy} open={open} loading={loading} currentUserId={currentUserId} />;
  const want = <WantColumn event={event} requests={requests} open={open} loading={loading} currentUserId={currentUserId} />;

  return (
    <section className={cn('mt-panel overflow-hidden', className)} aria-labelledby="mt-book-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-[14px] py-3">
        <h2 id="mt-book-h" className="text-[14px] font-semibold">
          {t('event.book.title')}
        </h2>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {t('event.book.summary', { tickets: formatNumber(tickets, locale), wanted: formatNumber(wanted, locale) })}
        </span>
      </div>

      {error !== undefined && error !== null ? (
        <div className="p-3">
          <ErrorState error={error} retry={retry} />
        </div>
      ) : wide ? (
        <div className="grid grid-cols-2 divide-x divide-border">
          {sell}
          {want}
        </div>
      ) : (
        <Tabs defaultValue="sell">
          <TabsList aria-label={t('event.book.tabsAria')} className="grid h-auto w-full grid-cols-2 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="sell"
              className="h-11 rounded-none border-b-2 border-transparent text-[13px] font-semibold text-muted-foreground data-[state=active]:border-ask data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {t('event.book.tabSell', { count: listings?.length ?? 0 })}
            </TabsTrigger>
            <TabsTrigger
              value="want"
              className="h-11 rounded-none border-b-2 border-transparent text-[13px] font-semibold text-muted-foreground data-[state=active]:border-bid data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {t('event.book.tabWant', { count: requests?.length ?? 0 })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sell" className="mt-0">
            {sell}
          </TabsContent>
          <TabsContent value="want" className="mt-0">
            {want}
          </TabsContent>
        </Tabs>
      )}

      <div className="flex items-start gap-2 border-t border-border bg-surface-2/60 px-[14px] py-3 text-[12.5px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-foreground">
            {face != null ? t('event.book.trust1', { price: formatISK(face) }) : t('event.book.trust1NoFace')}
          </strong>{' '}
          {t('event.book.trust2')} <VerifiedBadge level="phone" className="align-middle" /> {t('event.book.trust3')}{' '}
          <Link to={href('/um#reglur')} className="text-foreground underline underline-offset-2">
            {t('event.book.rules')}
          </Link>
        </p>
      </div>
    </section>
  );
}
