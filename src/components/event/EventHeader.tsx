import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink, Flag, ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatDateTime } from '../../lib/format';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import type { MarketEvent } from '../../lib/types';
import { CategoryBadge } from '../common/CategoryBadge';
import { secondaryButtonClass } from '../common/buttonClasses';
import { isEventOpen } from './eventUtils';

export type EventHeaderProps = {
  event: MarketEvent;
  /** Opens the ReportDialog owned by the page. */
  onReport: () => void;
  /** "Kaupa miða": scrolls to the list of tickets for sale. */
  onBuy?: () => void;
  /** The AlertButton (rendered with the CTAs when the event is open). */
  alertButton?: ReactNode;
  className?: string;
};

const CTA = 'h-11 rounded-lg px-4 text-[14px] font-semibold sm:h-10';

/**
 * 16:9 hero (max 360px tall): the tix.is image with object-cover over a soft
 * placeholder tile with the event's initials, which also shows while the image
 * loads or when there is none.
 */
export function EventHero({ event, className }: { event: Pick<MarketEvent, 'id' | 'title' | 'image_url'>; className?: string }) {
  const t = useT();
  const [broken, setBroken] = useState(false);
  const showImage = !!event.image_url && !broken;
  return (
    <div
      className={cn('relative aspect-video w-full overflow-hidden rounded-xl lg:aspect-auto lg:h-[360px]', placeholderClass(event.id), className)}
      data-testid="event-hero"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 flex select-none items-center justify-center text-[40px] font-bold tracking-[0.02em] text-foreground/70 sm:text-[56px]"
        data-testid="event-thumb"
      >
        {initialsOf(event.title)}
      </span>
      {showImage && (
        <img
          src={event.image_url ?? undefined}
          alt={t('event.imageAlt', { title: event.title })}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}

/** Breadcrumb · hero · title block (chips, H1, date · venue, tix link, report) · CTA row. */
export function EventHeader({ event, onReport, onBuy, alertButton, className }: EventHeaderProps) {
  const t = useT();
  const open = isEventOpen(event);
  const venue = [event.venue_name, event.city].filter(Boolean).join(' · ');

  return (
    <header className={cn('space-y-4', className)}>
      <nav aria-label={t('event.breadcrumb.aria')} className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        <Link to={href('/')} className="rounded-sm underline-offset-2 hover:text-primary hover:underline">
          {t('event.breadcrumb.market')}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <Link to={href(`/?flokkur=${event.category}`)} className="rounded-sm underline-offset-2 hover:text-primary hover:underline">
          {t(`category.${event.category}`)}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span aria-current="page" className="max-w-[60vw] truncate text-foreground sm:max-w-md">
          {event.title}
        </span>
      </nav>

      <EventHero event={event} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={event.category} />
            {event.status !== 'upcoming' && <span className="mt-tag">{t(`eventStatus.${event.status}`)}</span>}
          </div>
          <h1 className="text-[26px] font-bold leading-[1.2] tracking-tight sm:text-[30px]">{event.title}</h1>
          <p className="mt-2 text-[15px] text-foreground">
            <time dateTime={event.starts_at} className="tabular-nums">
              {formatDateTime(event.starts_at)}
            </time>
            {venue && <span className="text-muted-foreground"> · {venue}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
            {event.tix_url && (
              <a
                href={event.tix_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {t('event.seeOnTix')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={onReport}
              className="inline-flex min-h-[28px] items-center gap-1 rounded-sm py-1 text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              {t('event.report')}
            </button>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-auto" aria-label={t('event.ctaAria')}>
          {open ? (
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
              <Button type="button" size="sm" className={CTA} onClick={onBuy}>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                {t('event.buy')}
              </Button>
              <Button asChild variant="outline" size="sm" className={cn(CTA, secondaryButtonClass)}>
                <Link to={href(`/selja?event=${event.id}`)}>
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  {t('event.sell')}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={cn(CTA, secondaryButtonClass)}>
                <Link to={href(`/oska?event=${event.id}`)}>{t('event.want')}</Link>
              </Button>
              {alertButton}
            </div>
          ) : (
            <p className="rounded-lg bg-secondary px-4 py-3 text-[14px] text-muted-foreground" role="status">
              {event.status === 'cancelled' ? t('event.cancelledNotice') : t('event.pastNotice')}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
