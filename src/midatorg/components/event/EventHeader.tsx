import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink, Flag, ShieldCheck, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatDateTime, formatISK } from '../../lib/format';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import type { MarketEvent } from '../../lib/types';
import { CategoryBadge } from '../common/CategoryBadge';
import { bidButtonClass } from '../common/buttonClasses';
import { eventFaceValue, isEventOpen } from './eventUtils';

export type EventHeaderProps = {
  event: MarketEvent;
  /** Opens the ReportDialog owned by the page. */
  onReport: () => void;
  /** The AlertButton (rendered in the CTA stack when the event is open). */
  alertButton?: ReactNode;
  className?: string;
};

/** 72px tile (56px on phones): the event image, or a solid placeholder with two initials. */
export function EventThumb({ event, className }: { event: Pick<MarketEvent, 'id' | 'title' | 'image_url'>; className?: string }) {
  const t = useT();
  if (event.image_url) {
    return (
      <img
        src={event.image_url}
        alt={t('event.imageAlt', { title: event.title })}
        className={cn('h-14 w-14 shrink-0 rounded-lg object-cover sm:h-[72px] sm:w-[72px] sm:rounded-xl', className)}
        loading="eager"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-lg text-[20px] font-bold leading-none text-foreground sm:h-[72px] sm:w-[72px] sm:rounded-xl sm:text-[24px]',
        placeholderClass(event.id),
        className,
      )}
      data-testid="event-thumb"
    >
      {initialsOf(event.title)}
    </span>
  );
}

/** Breadcrumb · thumb · title block (tags, H1, venue/date/tix link, report) · CTA stack + cap sentence. */
export function EventHeader({ event, onReport, alertButton, className }: EventHeaderProps) {
  const t = useT();
  const face = eventFaceValue(event);
  const open = isEventOpen(event);
  const venue = [event.venue_name, event.city].filter(Boolean).join(' · ');

  return (
    <header className={cn('space-y-4', className)}>
      <nav aria-label={t('event.breadcrumb.aria')} className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
        <Link to={href('/')} className="rounded-sm underline-offset-2 hover:text-foreground hover:underline">
          {t('event.breadcrumb.market')}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <Link to={href(`/?flokkur=${event.category}`)} className="rounded-sm underline-offset-2 hover:text-foreground hover:underline">
          {t(`category.${event.category}`)}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span aria-current="page" className="max-w-[60vw] truncate text-foreground sm:max-w-md">
          {event.title}
        </span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <EventThumb event={event} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={event.category} />
              {event.status !== 'upcoming' && <span className="mt-tag">{t(`eventStatus.${event.status}`)}</span>}
            </div>
            <h1 className="text-[22px] font-bold leading-[1.2] tracking-[-0.025em] sm:text-[26px]">{event.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {venue && <span className="font-medium text-foreground">{venue}</span>}
              <time dateTime={event.starts_at} className="tabular-nums text-muted-foreground">
                {formatDateTime(event.starts_at)}
              </time>
              {event.tix_url && (
                <a
                  href={event.tix_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-sm text-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {t('common.seeOnTix')}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={onReport}
                className="inline-flex min-h-[28px] items-center gap-1 rounded-sm py-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                {t('event.report')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end" aria-label={t('event.ctaAria')}>
          {open ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button asChild size="sm" className="col-span-2 h-10 px-3.5 text-[13px] font-semibold sm:h-9">
                <Link to={href(`/selja?event=${event.id}`)}>
                  <Tag className="h-[15px] w-[15px]" aria-hidden="true" />
                  {t('event.sell')}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={cn('h-10 px-3.5 text-[13px] font-semibold sm:h-9', bidButtonClass)}>
                <Link to={href(`/oska?event=${event.id}`)}>{t('event.want')}</Link>
              </Button>
              {alertButton}
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-[12.5px] text-muted-foreground" role="status">
              {event.status === 'cancelled' ? t('event.cancelledNotice') : t('event.pastNotice')}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground lg:justify-end lg:text-right">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" aria-hidden="true" />
            <span>
              {face != null ? (
                <>
                  {t('event.capBefore')}{' '}
                  <strong className="whitespace-nowrap font-medium tabular-nums text-foreground">{formatISK(face)}</strong>{' '}
                  {t('event.capAfter')}
                </>
              ) : (
                t('event.capSentenceNoFace')
              )}
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}
