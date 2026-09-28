import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatNumber } from '../../lib/format';
import type { ListingWithSeller, MarketEvent, RequestWithBuyer } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { secondaryButtonClass } from '../common/buttonClasses';
import { pluralSuffix } from '../market/helpers';
import { SellRow } from './SellRow';
import { WantRow } from './WantRow';
import { isEventOpen } from './eventUtils';

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

/** The id the "Kaupa miða" buttons scroll to. */
export const SELL_SECTION_ID = 'mt-sell';

const EMPTY_BUTTON = 'h-11 shrink-0 rounded-lg px-4 text-[14px] font-semibold sm:h-10';

function SkeletonRows() {
  return (
    <ul className="mt-panel divide-y divide-border" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-10 w-10 rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 bg-secondary" />
            <Skeleton className="h-3 w-1/3 bg-secondary" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg bg-secondary" />
        </li>
      ))}
    </ul>
  );
}

function SectionHead({ id, title, count }: { id: string; title: string; count?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="text-[20px] font-semibold tracking-tight">
        {title}
      </h2>
      {count && <span className="text-[13px] tabular-nums text-muted-foreground">{count}</span>}
    </div>
  );
}

/**
 * "Miðar til sölu" and "Óskað eftir": two plain lists of white bordered rows,
 * stacked, each with its own empty state. Keeps the OrderBook name and props.
 */
export function OrderBook({ event, listings, requests, loading = false, error, retry, onBuy, currentUserId, className }: OrderBookProps) {
  const t = useT();
  const [locale] = useLocale();
  const open = isEventOpen(event);
  const sellRows = listings ?? [];
  const wantRows = requests ?? [];
  const waiting = event.requests_active ?? wantRows.length;

  if (error !== undefined && error !== null) {
    return (
      <div className={className}>
        <SectionHead id="mt-sell-h" title={t('event.book.title')} />
        <ErrorState error={error} retry={retry} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      <section id={SELL_SECTION_ID} aria-labelledby="mt-sell-h" className="scroll-mt-20" data-testid="sell-column">
        <SectionHead
          id="mt-sell-h"
          title={t('event.book.title')}
          count={
            !loading && sellRows.length > 0
              ? t(`event.book.sellers${pluralSuffix(sellRows.length, locale)}`, { count: formatNumber(sellRows.length, locale) })
              : undefined
          }
        />
        {loading ? (
          <SkeletonRows />
        ) : sellRows.length === 0 ? (
          <div className="mt-panel flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
            <p className="text-[15px]">
              <span className="font-medium">{t('event.book.sellEmpty')}</span>{' '}
              {waiting > 0 && (
                <span className="text-muted-foreground">
                  {t(`event.book.waiting${pluralSuffix(waiting, locale)}`, { count: formatNumber(waiting, locale) })}
                </span>
              )}
              {open && <span className="block text-[14px] text-muted-foreground">{t('event.book.sellEmptyAsk')}</span>}
            </p>
            {open && (
              <Button asChild variant="outline" size="sm" className={cn(EMPTY_BUTTON, secondaryButtonClass)}>
                <Link to={href(`/vidburdir/${event.id}?vakta=1`)}>{t('event.book.alert')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="mt-panel divide-y divide-border">
              {sellRows.map((l) => (
                <SellRow key={l.id} listing={l} onBuy={onBuy} isOwn={!!currentUserId && l.seller_id === currentUserId} disabled={!open} />
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-muted-foreground">{t('event.book.sellFoot')}</p>
          </>
        )}
      </section>

      <section aria-labelledby="mt-want-h" data-testid="want-column">
        <SectionHead
          id="mt-want-h"
          title={t('event.book.want')}
          count={
            !loading && wantRows.length > 0
              ? t(`event.book.requests${pluralSuffix(wantRows.length, locale)}`, { count: formatNumber(wantRows.length, locale) })
              : undefined
          }
        />
        {loading ? (
          <SkeletonRows />
        ) : wantRows.length === 0 ? (
          <div className="mt-panel flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
            <p className="text-[15px]">
              <span className="font-medium">{t('event.book.wantEmpty')}</span>
              {open && <span className="block text-[14px] text-muted-foreground">{t('event.book.wantEmptyAsk')}</span>}
            </p>
            {open && (
              <Button asChild variant="outline" size="sm" className={cn(EMPTY_BUTTON, secondaryButtonClass)}>
                <Link to={href(`/oska?event=${event.id}`)}>{t('event.want')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="mt-panel divide-y divide-border">
              {wantRows.map((r) => (
                <WantRow key={r.id} request={r} isOwn={!!currentUserId && r.buyer_id === currentUserId} disabled={!open} />
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-muted-foreground">{t('event.book.wantFoot')}</p>
          </>
        )}
      </section>
    </div>
  );
}
