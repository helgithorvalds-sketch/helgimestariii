import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate, formatISK, formatNumber, formatTickets, priceDelta } from '../../lib/format';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import type { MarketEvent } from '../../lib/types';
import { PriceDelta } from '../common/PriceDelta';
import { EventThumb } from './EventThumb';
import { cardStateOf, eventHref, eventMeta, pluralSuffix } from './helpers';

/** Props contract from spec §7 — other modules render this component. `sparkline` is accepted but no longer drawn. */
export type MarketCardProps = {
  event: MarketEvent;
  /** Kept for compatibility; the v2 card shows no sparkline. */
  sparkline?: number[];
  /** Head only (thumb, title, date · venue) — for pickers and lists. */
  compact?: boolean;
};

/**
 * 3:2 event image (tix.is CDN, object-cover) over a soft placeholder tile with
 * the event's initials; the tile stays visible while the image loads or when
 * there is none. The category chip sits in the corner.
 */
function CardImage({ event, past }: { event: MarketEvent; past: boolean }) {
  const t = useT();
  const [broken, setBroken] = useState(false);
  const showImage = !!event.image_url && !broken;
  return (
    <div className={cn('relative aspect-[3/2] w-full overflow-hidden', placeholderClass(event.id))} data-testid="market-card-image">
      <span
        aria-hidden="true"
        className="absolute inset-0 flex select-none items-center justify-center text-[32px] font-bold tracking-[0.02em] text-foreground/70"
        data-testid="market-card-placeholder"
      >
        {initialsOf(event.title)}
      </span>
      {showImage && (
        <img
          src={event.image_url ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className={cn('absolute inset-0 h-full w-full object-cover', past && 'opacity-80')}
          data-testid="market-card-img"
        />
      )}
      <span className="absolute left-2 top-2 inline-flex h-6 items-center rounded-full bg-card/95 px-2.5 text-[12px] font-medium text-foreground shadow-sm">
        {t(`category.${event.category}`)}
      </span>
      {past && (
        <span className="absolute right-2 top-2 inline-flex h-6 items-center rounded-full bg-foreground/80 px-2.5 text-[12px] font-medium text-background">
          {t(`eventStatus.${event.status === 'cancelled' ? 'cancelled' : 'past'}`)}
        </span>
      )}
    </div>
  );
}

/** tix.is-style card: image, title, "date · venue", price line and the counts line. The whole card is the link. */
export function MarketCard({ event, compact = false }: MarketCardProps) {
  const t = useT();
  const [locale] = useLocale();
  const state = cardStateOf(event);
  const past = state === 'past';
  const eventUrl = eventHref(event.id);
  const meta = eventMeta(event, formatDate(event.starts_at, locale));
  const available = event.tickets_available ?? 0;
  const wanted = event.wanted_tickets ?? 0;
  const face = event.face_value_min;

  if (compact) {
    return (
      <article className="mt-panel min-w-0 p-3" data-testid="market-card" data-state={state} data-compact="true">
        <div className="flex items-start gap-3">
          <EventThumb event={event} size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-normal">
              <Link to={eventUrl} className="rounded-sm underline-offset-[3px] hover:underline">
                {event.title}
              </Link>
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={meta}>
              {meta}
            </p>
          </div>
        </div>
      </article>
    );
  }

  let priceLine: ReactNode;
  if (state === 'listings') {
    const below = face != null && face > 0 && priceDelta(event.min_ask, face).kind === 'below';
    priceLine = (
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[16px] font-semibold tabular-nums text-foreground">{t('home.card.from', { price: formatISK(event.min_ask) })}</span>
        {below && <PriceDelta asking={event.min_ask} face={face} />}
      </p>
    );
  } else if (state === 'waitlist') {
    priceLine = <p className="text-[15px] font-medium text-muted-foreground">{t('home.card.noListings')}</p>;
  } else {
    priceLine = (
      <p className="text-[15px] font-medium text-muted-foreground">
        {event.last_sold_price != null
          ? t('home.card.lastSold', { price: formatISK(event.last_sold_price) })
          : t(event.status === 'cancelled' ? 'home.card.cancelled' : 'home.card.past')}
      </p>
    );
  }

  const counts: string[] = [];
  if (past) {
    const sold = event.sold_count ?? 0;
    if (sold > 0) counts.push(t(`home.card.soldHere${pluralSuffix(sold, locale)}`, { count: formatNumber(sold, locale) }));
  } else {
    if (available > 0) counts.push(t('home.card.forSale', { tickets: formatTickets(available, locale) }));
    if (wanted > 0) counts.push(t('home.card.wanted', { count: formatNumber(wanted, locale) }));
  }

  return (
    <article className="min-w-0" data-testid="market-card" data-state={state}>
      <Link
        to={eventUrl}
        aria-label={event.title}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CardImage event={event} past={past} />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h2 className="line-clamp-2 text-[16px] font-semibold leading-[1.3] tracking-normal text-foreground">{event.title}</h2>
          <p className="mt-1 truncate text-[13px] text-muted-foreground" title={meta}>
            {meta}
          </p>
          <div className="mt-3 flex flex-1 flex-col justify-end gap-1">
            {priceLine}
            {counts.length > 0 && <p className="text-[13px] tabular-nums text-muted-foreground">{counts.join(' · ')}</p>}
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Same box as the card: image, two title lines, meta, price line. */
export function MarketCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', className)} aria-hidden="true" data-testid="market-card-skeleton">
      <Skeleton className="aspect-[3/2] w-full rounded-none bg-secondary" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-4 w-4/5 bg-secondary" />
        <Skeleton className="h-4 w-3/5 bg-secondary" />
        <Skeleton className="h-3 w-1/2 bg-secondary" />
        <Skeleton className="mt-3 h-4 w-2/5 bg-secondary" />
      </div>
    </div>
  );
}

export default MarketCard;
