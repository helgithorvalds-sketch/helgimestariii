import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type L from 'leaflet';
import { CalendarX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { useMarketEvents } from '../../lib/queries';
import type { EventCategory, MarketEvent } from '../../lib/types';
import { CategoryChips } from '../market/CategoryChips';
import { PARAM_CATEGORY, isEventCategory, pluralSuffix } from '../market/helpers';
import { ErrorState } from '../common/ErrorState';
import { DayPicker } from './DayPicker';
import { EventSheet } from './EventSheet';
import { MapEventList } from './MapEventList';
import { PARAM_DAY, REGIONS, dayParamValue, parseDay, rangeFor, splitByLocation, type DaySelection, type RegionKey } from './mapUtils';

const EventMap = lazy(() => import('./EventMap'));

/** Enough for 30 days of Icelandic events; the view is not paginated. */
const MAP_EVENT_LIMIT = 800;

export type MapViewProps = {
  /** Rendered at the right of the title row (the "Kort · Listi" toggle on the home page). */
  toolbar?: ReactNode;
};

/**
 * Nova-style event map: pick a day, every event that day is a round picture pin on a map of
 * Iceland, tap one to see it and buy or sell. The same events are listed beside (lg) or
 * under (phones) the map. URL state: ?dagur=YYYY-MM-DD|30 and ?flokkur=<category>.
 */
export function MapView({ toolbar }: MapViewProps) {
  const t = useT();
  const [locale] = useLocale();
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());

  const day: DaySelection = parseDay(params.get(PARAM_DAY), now);
  const rawCategory = params.get(PARAM_CATEGORY);
  const category: EventCategory | null = isEventCategory(rawCategory) ? rawCategory : null;
  const range = useMemo(() => rangeFor(day, now), [day, now]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value == null) next.delete(key);
      else next.set(key, value);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const query = useMarketEvents({ from: range.from, to: range.to, category: category ?? undefined, sort: 'date', limit: MAP_EVENT_LIMIT });
  const events = useMemo(() => query.data ?? [], [query.data]);
  const { placed, unplaced } = useMemo(() => splitByLocation(events), [events]);
  const placedEvents = useMemo(() => placed.map((p) => p.event), [placed]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? events.find((e) => e.id === selectedId) ?? null : null;
  useEffect(() => {
    if (selectedId && !query.isPlaceholderData && !events.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [events, selectedId, query.isPlaceholderData]);

  const [map, setMap] = useState<L.Map | null>(null);
  const goRegion = (key: RegionKey) => map?.flyTo(REGIONS[key].center, REGIONS[key].zoom, { duration: 0.8 });
  const pickFromList = (event: MarketEvent) => {
    setSelectedId(event.id);
    const point = placed.find((p) => p.event.id === event.id);
    if (point && map) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  };

  const count = events.length;
  const countText = t(`map.count${pluralSuffix(count, locale)}`, { count });

  let listBody: ReactNode;
  if (query.isPending) {
    listBody = (
      <p className="flex items-center gap-2 px-4 py-6 text-[14px] text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('map.loading')}
      </p>
    );
  } else if (query.error) {
    listBody = <ErrorState error={query.error} retry={() => void query.refetch()} className="m-3" />;
  } else if (count === 0) {
    listBody = (
      <div className="flex flex-col items-center px-6 py-10 text-center" role="status" data-testid="map-empty">
        <CalendarX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-[15px] font-semibold">{t('map.empty.title')}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{t('map.empty.body')}</p>
        {day !== 'next30' && (
          <Button type="button" className="mt-4 h-10 rounded-lg px-4 text-[14px] font-semibold" onClick={() => setParam(PARAM_DAY, null)}>
            {t('map.empty.action')}
          </Button>
        )}
      </div>
    );
  } else {
    listBody = <MapEventList placed={placedEvents} unplaced={unplaced} selectedId={selectedId} onSelect={pickFromList} />;
  }

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4rem)]" data-testid="map-view">
      <div className="border-b border-border bg-background px-4 pb-3 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]">{t('map.title')}</h1>
            <p className="mt-0.5 text-[14px] text-muted-foreground" aria-live="polite" data-testid="map-count">
              {query.isPending ? t('map.loading') : `${countText} · ${t('map.hint')}`}
            </p>
          </div>
          {toolbar}
        </div>
        <DayPicker value={day} onChange={(v) => setParam(PARAM_DAY, v === 'next30' ? null : dayParamValue(v))} now={now} className="mt-3" />
        <CategoryChips value={category} onChange={(c) => setParam(PARAM_CATEGORY, c)} className="mt-2" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 min-h-0 border-border lg:order-1 lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-r" aria-busy={query.isFetching}>
          {listBody}
        </aside>

        <div className="relative order-1 h-[58dvh] min-h-[320px] flex-1 isolate lg:order-2 lg:h-auto">
          <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-secondary" />}>
            <EventMap points={placed} selectedId={selectedId} onSelect={setSelectedId} onReady={setMap} className="absolute inset-0 z-0" />
          </Suspense>

          <div role="group" aria-label={t('map.region.label')} className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
            {(['all', 'capital', 'north'] as RegionKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => goRegion(key)}
                className="h-9 rounded-full border border-border bg-card/95 px-3 text-[13px] font-medium shadow-sm hover:bg-card"
              >
                {t(`map.region.${key}`)}
              </button>
            ))}
          </div>

          {query.isFetching && !query.isPending && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[13px] shadow-sm" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {t('map.loading')}
            </span>
          )}

          {selected && (
            <EventSheet
              event={selected}
              onClose={() => setSelectedId(null)}
              className={cn(
                'fixed inset-x-0 bottom-14 z-[45] max-h-[70dvh] overflow-y-auto md:bottom-0',
                'lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-4 lg:z-20 lg:w-[340px]',
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
