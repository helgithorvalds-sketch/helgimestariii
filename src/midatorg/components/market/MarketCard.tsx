import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime, formatISK, formatNumber } from '../../lib/format';
import { href } from '../../lib/paths';
import type { MarketEvent } from '../../lib/types';
import { Money } from '../common/Money';
import { PriceDelta } from '../common/PriceDelta';
import { askButtonClass, bidButtonClass, cardButtonClass, secondaryButtonClass } from '../common/buttonClasses';
import { EventThumb } from './EventThumb';
import { Sparkline } from './Sparkline';
import { cardStateOf, eventHref, eventMeta, sparklineTone } from './helpers';

/** Props contract from spec §7 — other modules (account, forms) render this component. */
export type MarketCardProps = {
  event: MarketEvent;
  /** `min_ask` history, oldest first. Omit for the dashed placeholder rule. */
  sparkline?: number[];
  /** Head only (thumb, title, venue · date) — for pickers and lists. */
  compact?: boolean;
};

/**
 * DESIGN.md §5 MarketCard: one component, three states (listings, waitlist,
 * past). Every number on it is a real aggregate from `mt_events_market`.
 */
export function MarketCard({ event, sparkline, compact = false }: MarketCardProps) {
  const t = useT();
  const [locale] = useLocale();
  const state = cardStateOf(event);
  const past = state === 'past';
  const eventUrl = eventHref(event.id);
  const meta = eventMeta(event, formatDateTime(event.starts_at, locale));
  const available = event.tickets_available ?? 0;
  const wanted = event.wanted_tickets ?? 0;
  const face = event.face_value_min;

  const head = (
    <div className="flex items-start gap-3">
      <EventThumb event={event} size={44} />
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-[14px] font-semibold leading-[1.3] tracking-normal">
          <Link to={eventUrl} className="rounded-sm underline-offset-[3px] hover:underline">
            {event.title}
          </Link>
        </h2>
        <p className="mt-1 truncate text-[12px] text-muted-foreground" title={meta}>
          {meta}
        </p>
      </div>
    </div>
  );

  if (compact) {
    return (
      <article className="mt-panel min-w-0 p-[14px]" data-testid="market-card" data-state={state} data-compact="true">
        {head}
      </article>
    );
  }

  let eyebrow: string;
  let headline: ReactNode;
  let subline: ReactNode;
  let spark: ReactNode;

  if (state === 'listings') {
    eyebrow = t('common.lowestPrice');
    headline = <Money amount={event.min_ask} className="mt-headline text-foreground" unitClassName="text-[15px]" />;
    subline = <PriceDelta asking={event.min_ask} face={face} />;
    spark = <Sparkline points={sparkline ?? []} tone={sparklineTone(event.min_ask, face)} />;
  } else if (state === 'waitlist') {
    eyebrow = t('home.card.waitlist');
    headline =
      wanted > 0 ? (
        <span className="mt-headline text-bid">
          {formatNumber(wanted, locale)}{' '}
          <span className="ml-[3px] text-[15px] font-medium text-muted-foreground">{t('home.card.wantUnit')}</span>
        </span>
      ) : (
        <span className="text-[15px] font-semibold leading-none text-muted-foreground">{t('home.card.noWaitlist')}</span>
      );
    subline = (
      <span className="text-[12px] text-muted-foreground">
        {t('home.card.noListings')}
        {face != null && face > 0 && (
          <>
            {' — '}
            {t('home.card.faceValueWord')} <span className="whitespace-nowrap tabular-nums">{formatISK(face)}</span>
          </>
        )}
      </span>
    );
    spark = <Sparkline points={[]} tone="neutral" />;
  } else {
    eyebrow = t(`eventStatus.${event.status === 'cancelled' ? 'cancelled' : 'past'}`);
    headline = <Money amount={event.last_sold_price} className="mt-headline text-muted-foreground" unitClassName="text-[15px]" />;
    subline = (
      <span className="text-[12px] text-muted-foreground">
        {event.last_sold_price != null ? t('home.card.lastSold', { price: formatISK(event.last_sold_price) }) : t('home.card.noSales')}
      </span>
    );
    spark = <Sparkline points={sparkline ?? []} tone="neutral" />;
  }

  return (
    <article
      className={cn(
        'mt-panel flex min-w-0 flex-col gap-3 p-[14px] transition-colors hover:border-muted-foreground/40',
      )}
      data-testid="market-card"
      data-state={state}
    >
      {head}

      <div className={cn('flex items-end justify-between gap-2.5', past && 'opacity-60')}>
        <div className="min-w-0">
          <span className="mt-eyebrow block">{eyebrow}</span>
          <div className="mt-1.5">{headline}</div>
          <div className="mt-1.5 min-h-[16px] text-[12px] leading-[1.35]">{subline}</div>
        </div>
        {spark}
      </div>

      {!past && (
        <div className="grid grid-cols-2 gap-1.5">
          {state === 'listings' ? (
            <Button asChild variant="outline" size="sm" className={cn(askButtonClass, cardButtonClass, 'rounded-[7px] px-3')}>
              <Link to={eventUrl}>{t('home.card.buy')}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className={cn(bidButtonClass, cardButtonClass, 'gap-1.5 rounded-[7px] px-3')}>
              <Link to={`${eventUrl}?vakta=1`}>
                <Bell className="h-[15px] w-[15px]" aria-hidden="true" />
                {t('home.card.notify')}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className={cn(secondaryButtonClass, cardButtonClass, 'rounded-[7px] px-3')}>
            <Link to={href(`/selja?event=${event.id}`)}>{t('home.card.haveTickets')}</Link>
          </Button>
        </div>
      )}

      <div
        className={cn(
          'mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5 text-[12px] text-muted-foreground',
          past && 'opacity-60',
        )}
      >
        <span className="tabular-nums">
          {past ? (
            <>
              <b className="font-semibold text-foreground">{formatNumber(event.sold_count ?? 0, locale)}</b> {t('home.card.soldWord')}
            </>
          ) : (
            <>
              <b className="font-semibold text-foreground">{formatNumber(available, locale)}</b> {t('home.card.forSaleWord')}
              <span aria-hidden="true"> · </span>
              <b className="font-semibold text-foreground">{formatNumber(wanted, locale)}</b> {t('home.card.wantUnit')}
            </>
          )}
        </span>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.04em]">{t(`category.${event.category}`)}</span>
      </div>
    </article>
  );
}

/** Same box as the card: thumb, two title lines, one 24px number, two buttons, foot. */
export function MarketCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mt-panel flex flex-col gap-3 p-[14px]', className)} aria-hidden="true" data-testid="market-card-skeleton">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg bg-surface-2" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-3.5 w-4/5 bg-surface-2" />
          <Skeleton className="h-3 w-1/2 bg-surface-2" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16 bg-surface-2" />
          <Skeleton className="h-6 w-28 bg-surface-2" />
          <Skeleton className="h-2.5 w-24 bg-surface-2" />
        </div>
        <Skeleton className="h-8 w-24 bg-surface-2" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Skeleton className="h-10 bg-surface-2 sm:h-[34px]" />
        <Skeleton className="h-10 bg-surface-2 sm:h-[34px]" />
      </div>
      <div className="mt-auto border-t border-border pt-2.5">
        <Skeleton className="h-3 w-2/3 bg-surface-2" />
      </div>
    </div>
  );
}

export default MarketCard;
