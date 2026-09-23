import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale, useT } from '../../lib/i18n';
import { formatISK, formatNumber } from '../../lib/format';
import type { ListingWithSeller, MarketEvent } from '../../lib/types';
import { PriceDelta } from '../common/PriceDelta';
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

/** Five tiles: Lægsta verð · Miðaverð · Til sölu · Vilja kaupa · Seldir. Grid 5 → 3 → 2 (last spans 2). */
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
  const maxBid = num(event.max_bid);
  const sold = num(event.sold_count);
  const lastSold = num(event.last_sold_price);

  const faceMin = num(event.face_value_min);
  const faceMax = num(event.face_value_max);
  let faceValue: string | null = null;
  if (faceMin != null && faceMax != null && faceMin !== faceMax) {
    faceValue = `${formatNumber(Math.min(faceMin, faceMax), 'is')}–${formatISK(Math.max(faceMin, faceMax))}`;
  } else if (face != null) {
    faceValue = formatISK(face);
  }

  const unitTickets = (n: number) => (locale === 'is' && n % 10 === 1 && n % 100 !== 11 ? t('event.stats.unitTicket') : t('event.stats.unitTickets'));

  const wantedSub = (() => {
    if (requests == null) return null;
    const people = requests === 1 ? t('event.stats.requestOne') : t('event.stats.requests', { count: formatNumber(requests, locale) });
    return maxBid != null ? `${people} · ${t('event.stats.highestBid', { price: formatISK(maxBid) })}` : people;
  })();

  return (
    <section aria-label={t('event.stats.aria')} className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5', className)}>
      <StatTile
        label={t('event.stats.lowest')}
        value={minAsk != null ? formatISK(minAsk) : null}
        sub={minAsk != null ? <PriceDelta asking={minAsk} face={lowestFace} /> : t('event.stats.noListings')}
      />
      <StatTile
        label={t('event.stats.face')}
        value={faceValue}
        sub={faceValue ? (event.source === 'tix' ? t('event.stats.faceSubTix') : t('event.stats.faceSub')) : t('event.stats.faceUnknown')}
      />
      <StatTile
        label={t('event.stats.forSale')}
        swatch="ask"
        value={available != null ? formatNumber(available, locale) : null}
        unit={available != null ? unitTickets(available) : undefined}
        sub={
          sellers == null || sellers === 0
            ? t('event.stats.noListings')
            : sellers === 1
              ? t('event.stats.fromSeller')
              : t('event.stats.fromSellers', { count: formatNumber(sellers, locale) })
        }
      />
      <StatTile
        label={t('event.stats.wanted')}
        swatch="bid"
        value={wanted != null ? formatNumber(wanted, locale) : null}
        unit={wanted != null ? unitTickets(wanted) : undefined}
        sub={wantedSub}
      />
      <StatTile
        label={t('event.stats.sold')}
        value={sold != null ? formatNumber(sold, locale) : null}
        unit={sold != null ? unitTickets(sold) : undefined}
        sub={lastSold != null ? t('event.stats.lastSold', { price: formatISK(lastSold) }) : t('event.stats.noSales')}
        className="col-span-2 sm:col-span-2 xl:col-span-1"
      />
    </section>
  );
}

/** Same boxes while the event loads. */
export function StatsRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5', className)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={cn('mt-panel space-y-2 px-[14px] py-3', i === 4 && 'col-span-2 sm:col-span-2 xl:col-span-1')}>
          <Skeleton className="h-3 w-16 bg-surface-2" />
          <Skeleton className="h-6 w-24 bg-surface-2" />
          <Skeleton className="h-3 w-20 bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
