import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type L from 'leaflet';
import { ChevronRight, Clock, MapPin, Minus, Plus } from 'lucide-react';
import { ChipButton, EmptyState, ErrorState, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { href, paths } from '../../lib/paths';
import { useLocations, useMerchants } from '../../lib/queries';
import type { Location } from '../../lib/types';
import { LocationSheet, OpenChip, PosChip } from '../components/LocationSheet';
import { MerchantMark } from '../components/MerchantMark';
import type { MapPlace } from '../components/PlacesMap';
import { SegmentedControl } from '../components/SegmentedControl';
import { REGIONS, REGION_ORDER, distanceM, formatDistance, inRegion, openStatusText, type RegionKey } from '../lib/geo';
import { useGeolocation, usePageTitle } from '../lib/hooks';
import { KEYS, readLocal, writeLocal } from '../lib/storage';

const PlacesMap = lazy(() => import('../components/PlacesMap'));

type View = 'map' | 'list';

function PlaceRow({ place, distance }: { place: MapPlace; distance: number | null }) {
  return (
    <li>
      <Link to={href(paths.appPlace(place.id))} className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary">
        <MerchantMark merchant={place.merchant} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{place.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {place.address}, {place.city}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <span className="vild-num inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {openStatusText(place.openingHours)}
            </span>
            {place.posStatus !== 'connected' && <span>· Söfnun væntanleg</span>}
          </p>
        </div>
        {distance != null && <span className="vild-num shrink-0 text-[13px] font-semibold text-muted-foreground">{formatDistance(distance)}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

export default function PlacesPage() {
  usePageTitle('Staðir');
  const locations = useLocations();
  const merchants = useMerchants();
  const geo = useGeolocation();
  const [view, setView] = useState<View>(() => (readLocal(KEYS.placesView) === 'list' ? 'list' : 'map'));
  const [region, setRegion] = useState<RegionKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const places = useMemo<MapPlace[]>(() => {
    if (!locations.data || !merchants.data) return [];
    return locations.data
      .map((l) => {
        const merchant = merchants.data.find((m) => m.id === l.merchantId);
        return merchant ? { ...l, merchant } : null;
      })
      .filter((p): p is MapPlace => p != null);
  }, [locations.data, merchants.data]);

  const listed = useMemo(() => {
    const filtered = places.filter((p) => inRegion(p, region));
    if (geo.position) {
      const from = geo.position;
      return filtered.map((p) => ({ place: p, distance: distanceM(from, p) as number | null })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return filtered.map((p) => ({ place: p, distance: null as number | null })).sort((a, b) => a.place.city.localeCompare(b.place.city, 'is') || a.place.name.localeCompare(b.place.name, 'is'));
  }, [places, region, geo.position]);

  const changeView = (v: View) => {
    setView(v);
    writeLocal(KEYS.placesView, v);
  };

  const pickRegion = (key: RegionKey) => {
    setRegion(key);
    setSelectedId(null);
    if (view === 'map' && map) map.flyTo(REGIONS[key].center, REGIONS[key].zoom, { duration: 0.8 });
  };

  const onReady = useCallback((m: L.Map) => setMap(m), []);

  const selected = selectedId ? places.find((p) => p.id === selectedId) ?? null : null;
  const selectedDistance = selected && geo.position ? distanceM(geo.position, selected) : undefined;
  const loading = locations.isPending || merchants.isPending;
  const error = locations.error ?? merchants.error;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px - var(--safe-bottom))' }}>
      <div className="shrink-0 border-b border-border bg-white px-4 pb-3 pt-[max(16px,var(--safe-top))]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">Staðir</h1>
          <SegmentedControl<View>
            ariaLabel="Kort eða listi"
            value={view}
            onChange={changeView}
            segments={[
              { value: 'map', label: 'Kort' },
              { value: 'list', label: 'Listi' },
            ]}
          />
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Svæði">
          {REGION_ORDER.map((key) => (
            <ChipButton key={key} selected={region === key} onClick={() => pickRegion(key)}>
              {REGIONS[key].label}
            </ChipButton>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <div className="relative min-h-0 flex-1 isolate bg-[hsl(var(--surface-2))]">
          {error ? (
            <ErrorState message={errorMessage(error)} retry={() => void locations.refetch()} className="m-4" />
          ) : (
            <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-secondary" aria-busy="true" />}>
              <PlacesMap places={places.filter((p) => inRegion(p, region))} selectedId={selectedId} onSelect={setSelectedId} onReady={onReady} className="absolute inset-0 z-0 h-full w-full" />
            </Suspense>
          )}
          <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
            <button type="button" aria-label="Þysja inn" onClick={() => map?.zoomIn()} className="flex h-10 w-10 items-center justify-center text-foreground hover:bg-secondary">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Þysja út" onClick={() => map?.zoomOut()} className="flex h-10 w-10 items-center justify-center border-t border-border text-foreground hover:bg-secondary">
              <Minus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {!loading && !error && (
            <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground shadow-[var(--shadow-sm)]" role="status">
              {places.filter((p) => inRegion(p, region)).length} staðir
            </p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[hsl(var(--surface-2))] px-4 py-4">
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={errorMessage(error)} retry={() => void locations.refetch()} />
          ) : listed.length === 0 ? (
            <EmptyState icon={<MapPin className="h-5 w-5" aria-hidden="true" />} title="Engir staðir hér ennþá" body="Veldu annað svæði eða skoðaðu allt landið." />
          ) : (
            <>
              <p className="mb-2 px-1 text-[13px] text-muted-foreground">{geo.position ? 'Raðað eftir fjarlægð frá þér' : 'Raðað eftir bæjarfélagi'}</p>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                {listed.map(({ place, distance }) => (
                  <PlaceRow key={place.id} place={place} distance={distance} />
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 px-1 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <OpenChip location={{ openingHours: '0–24' } as Location} /> = opið núna
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PosChip location={{ acceptsRedemption: true, posStatus: 'connected' } as Location} /> = inneign virk
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <LocationSheet location={selected} merchant={selected?.merchant as MapPlace['merchant'] & { id: string; slug: string } as never} distance={selectedDistance} onClose={() => setSelectedId(null)} />
    </div>
  );
}
