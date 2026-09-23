import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate, formatDeltaPct, formatISK, formatNumber, priceDelta } from '../../lib/format';
import type { MarketEvent } from '../../lib/types';
import { EventThumb } from './EventThumb';
import { TRENDING_COUNT, eventHref, eventMeta, rankTrending } from './helpers';

export type TrendingStripProps = {
  /** Candidate events (any order); the strip ranks them by wanted + available. */
  events: MarketEvent[];
  count?: number;
  className?: string;
};

const HEADING_ID = 'mt-trending-heading';

/**
 * DESIGN.md §5 TrendingStrip: numbered items with thumb, title, venue · date and
 * a value stack — price + delta vs face value (up), or the waitlist count (bid).
 * Never a 7-day change. Horizontal rail on phones, grid from `sm`.
 */
export function TrendingStrip({ events, count = TRENDING_COUNT, className }: TrendingStripProps) {
  const t = useT();
  const [locale] = useLocale();
  const ranked = rankTrending(events, count);
  if (ranked.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className={cn('min-w-0', className)} data-testid="trending-strip">
      <h2 id={HEADING_ID} className="mt-eyebrow flex items-center gap-2 pb-2 pt-1 !text-[12px] tracking-[0.06em]">
        <span className="h-1.5 w-1.5 rounded-full bg-ask shadow-[0_0_0_3px_hsl(var(--ask)/0.2)]" aria-hidden="true" />
        {t('home.trending.title')}
      </h2>
      <ol className="mt-scroll-x -mx-4 flex gap-2 px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 min-[900px]:grid-cols-3">
        {ranked.map((event, i) => {
          const hasPrice = event.min_ask != null && (event.tickets_available ?? 0) > 0;
          const face = event.face_value_min;
          const kind = hasPrice ? priceDelta(event.min_ask, face).kind : null;
          const priceTone = kind === 'below' ? 'text-up' : 'text-foreground';
          return (
            <li key={event.id} className="min-w-0 shrink-0 basis-[236px] sm:basis-auto">
              <Link
                to={eventHref(event.id)}
                className="flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:border-muted-foreground/50"
              >
                <span className="mt-mono w-4 shrink-0 text-[11px] text-muted-foreground" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <EventThumb event={event} size={30} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-semibold">{event.title}</span>
                  <span className="truncate text-[11.5px] text-muted-foreground">
                    {eventMeta(event, formatDate(event.starts_at, locale))}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end whitespace-nowrap text-[12.5px] font-semibold leading-[1.25] tabular-nums">
                  {hasPrice ? (
                    <>
                      <span className={priceTone}>{formatISK(event.min_ask)}</span>
                      {face != null && face > 0 && (
                        <span className={cn('text-[11px] font-medium', kind === 'below' ? 'text-up' : 'text-muted-foreground')}>
                          {formatDeltaPct(event.min_ask, face)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-bid">{formatNumber(event.wanted_tickets ?? 0, locale)}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">{t('home.trending.waitlist')}</span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default TrendingStrip;
