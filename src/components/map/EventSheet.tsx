import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime, formatISK, formatNumber, formatTickets, priceDelta } from '../../lib/format';
import { href } from '../../lib/paths';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import type { MarketEvent } from '../../lib/types';
import { PriceDelta } from '../common/PriceDelta';
import { ghostButtonClass, secondaryButtonClass } from '../common/buttonClasses';
import { eventHref, eventMeta } from '../market/helpers';
import { TixBadge } from '../common/TixBadge';

export type EventSheetProps = {
  event: MarketEvent;
  onClose: () => void;
  className?: string;
};

/**
 * The selected event: picture, title, date · venue, price and three actions.
 * A bottom sheet above the tab bar on phones, a floating card over the map from lg.
 */
export function EventSheet({ event, onClose, className }: EventSheetProps) {
  const t = useT();
  const [locale] = useLocale();
  const [broken, setBroken] = useState(false);
  const hasTickets = event.min_ask != null && (event.tickets_available ?? 0) > 0;
  const below = hasTickets && priceDelta(event.min_ask, event.face_value_min).kind === 'below';
  const available = event.tickets_available ?? 0;
  const watchers = event.watchers ?? 0;
  const counts: string[] = [];
  if (available > 0) counts.push(t('home.card.forSale', { tickets: formatTickets(available, locale) }));
  if (watchers > 0) counts.push(t('home.card.watching', { count: formatNumber(watchers, locale) }));
  const showImage = !!event.image_url && !broken;

  return (
    <section
      aria-label={t('map.sheet.label')}
      className={cn('overflow-hidden rounded-t-2xl border border-border bg-card shadow-lg lg:rounded-2xl', className)}
      data-testid="event-sheet"
    >
      <div className={cn('relative aspect-[16/7] w-full overflow-hidden lg:aspect-[16/9]', placeholderClass(event.id))}>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[28px] font-bold text-foreground/70">
          {initialsOf(event.title)}
        </span>
        {showImage && (
          <img src={event.image_url ?? undefined} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <TixBadge event={event} className="absolute left-2 top-2" />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('map.sheet.close')}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm hover:bg-card"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-4">
        <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug">{event.title}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{eventMeta(event, formatDateTime(event.starts_at, locale))}</p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          {hasTickets ? (
            <>
              <span className="text-[16px] font-semibold tabular-nums">{t('home.card.from', { price: formatISK(event.min_ask) })}</span>
              {below && <PriceDelta asking={event.min_ask} face={event.face_value_min} />}
            </>
          ) : (
            <span className="text-[15px] font-medium text-muted-foreground">{t('home.card.noListings')}</span>
          )}
        </p>
        {counts.length > 0 && <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">{counts.join(' · ')}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild className="col-span-2 h-11 rounded-lg text-[15px] font-semibold">
            <Link to={eventHref(event.id)}>{t('map.sheet.view')}</Link>
          </Button>
          <Button asChild variant="outline" className={cn('h-11 rounded-lg text-[14px] font-semibold', secondaryButtonClass)}>
            <Link to={href(`/selja?event=${encodeURIComponent(event.id)}`)}>{t('map.sheet.sell')}</Link>
          </Button>
          <Button asChild variant="outline" className={cn('h-11 rounded-lg text-[14px] font-semibold', ghostButtonClass)}>
            <Link to={`${eventHref(event.id)}?vakta=1`}>
              <Bell className="h-4 w-4" aria-hidden="true" />
              {t('map.sheet.alert')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
