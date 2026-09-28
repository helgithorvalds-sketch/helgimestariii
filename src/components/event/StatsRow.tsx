import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale, useT } from '../../lib/i18n';
import { formatISK, formatNumber } from '../../lib/format';
import type { ListingWithSeller, MarketEvent } from '../../lib/types';
import { PriceDelta } from '../common/PriceDelta';
import { pluralSuffix } from '../market/helpers';
import { StatTile } from './StatTile';
import { eventFaceValue } from './eventUtils';

export type StatsRowProps = {
  event: MarketEvent;
  /** Active listings (lowest first) – used for the face value behind the lowest price. */
  listings?: ListingWithSeller[];
  className?: string;
};

function num(v: number | null | undefined): number | null {
  return v == null || !Number.isFinite(v) ? null : v;
}

const GRID = 'grid grid-cols-2 sm:grid-cols-4 [&>*+*]:border-border [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t sm:[&>*+*]:border-l sm:[&>*:nth-child(n+3)]:border-t-0';

/** Four plain facts in a bordered row: Miðaverð · Lægsta verð · Til sölu · Óskað eftir, and a muted "N miðar seldir hér" sentence. */
export function StatsRow({ event, listings, className }: StatsRowProps) {
  const t = useT();
  const [locale] = useLocale();
  const face = eventFaceValue(event);
  const minAsk = num(event.min_ask);
  const cheapest = listings?.find((l) => l.asking_price === minAsk) ?? listings?.[0];
  const lowestFace = cheapest?.face_value ?? face;
  const available = num(event.tickets_available);
  const sellers = num(event.listings_active);
  const wanted = num(event.wanted_tickets);
  const requests = num(event.requests_active);
  const sold = num(event.sold_count) ?? 0;

  const faceMin = num(event.face_value_min);
  const faceMax = num(event.face_value_max);
  let faceValue: string | null = null;
  if (faceMin != null && faceMax != null && faceMin !== faceMax) {
    faceValue = `${formatNumber(Math.min(faceMin, faceMax), 'is')}–${formatISK(Math.max(faceMin, faceMax))}`;
  } else if (face != null) {
    faceValue = formatISK(face);
  }

  const unitTickets = (n: number) => (locale === 'is' && n % 10 === 1 && n % 100 !== 11 ? t('common.ticket') : t('common.tickets'));

  return (
    <section aria-label={t('event.stats.aria')} className={cn('mt-panel overflow-hidden', className)}>
      <div className={GRID}>
        <StatTile label={t('event.stats.face')} value={faceValue} sub={faceValue ? undefined : t('event.stats.faceUnknown')} />
        <StatTile
          label={t('event.stats.lowest')}
          value={minAsk != null ? formatISK(minAsk) : null}
          sub={minAsk != null ? <PriceDelta asking={minAsk} face={lowestFace} /> : t('event.stats.noListings')}
        />
        <StatTile
          label={t('event.stats.forSale')}
          value={available != null ? formatNumber(available, locale) : null}
          unit={available != null ? unitTickets(available) : undefined}
          sub={sellers != null && sellers > 0 ? t(`event.book.sellers${pluralSuffix(sellers, locale)}`, { count: formatNumber(sellers, locale) }) : undefined}
        />
        <StatTile
          label={t('event.stats.wanted')}
          value={wanted != null ? formatNumber(wanted, locale) : null}
          unit={wanted != null ? unitTickets(wanted) : undefined}
          sub={requests != null && requests > 0 ? t(`event.book.requests${pluralSuffix(requests, locale)}`, { count: formatNumber(requests, locale) }) : undefined}
        />
      </div>
      <p className="border-t border-border px-4 py-2 text-[13px] text-muted-foreground" data-testid="stats-sold">
        {sold > 0 ? t(`event.stats.soldHere${pluralSuffix(sold, locale)}`, { count: formatNumber(sold, locale) }) : t('event.stats.noSales')}
      </p>
    </section>
  );
}

/** Same box while the event loads. */
export function StatsRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mt-panel overflow-hidden', className)} aria-hidden="true">
      <div className={GRID}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-3 w-16 bg-secondary" />
            <Skeleton className="h-5 w-24 bg-secondary" />
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-2">
        <Skeleton className="h-3 w-40 bg-secondary" />
      </div>
    </div>
  );
}
