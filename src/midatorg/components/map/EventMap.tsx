import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate, formatISK } from '../../lib/format';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import {
  ICELAND_BOUNDS,
  ICELAND_CENTER,
  TILE_ATTRIBUTION,
  TILE_URL,
  clusterPoints,
  escapeHtml,
  safeImageUrl,
  type Cluster,
  type MapPoint,
} from './mapUtils';

export type EventMapProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Receives the Leaflet map once it exists (region buttons, fly-to from the list). */
  onReady?: (map: L.Map) => void;
  className?: string;
};

const PIN_SIZE = 48;

function pinHtml(point: MapPoint, selected: boolean): string {
  const { event } = point;
  const img = safeImageUrl(event.image_url);
  const hasTickets = event.min_ask != null && (event.tickets_available ?? 0) > 0;
  const price = hasTickets
    ? `<span class="mt-pin__price">${escapeHtml(formatISK(event.min_ask))}</span>`
    : '';
  return (
    `<div class="mt-pin${selected ? ' mt-pin--selected' : ''}" data-event-id="${escapeHtml(event.id)}">` +
    `<div class="mt-pin__img ${placeholderClass(event.id)}">` +
    `<span aria-hidden="true">${escapeHtml(initialsOf(event.title))}</span>` +
    (img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" decoding="async" />` : '') +
    `</div>${price}</div>`
  );
}

function pinIcon(point: MapPoint, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'mt-pin-icon',
    html: pinHtml(point, selected),
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
  });
}

function clusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: 'mt-pin-icon',
    html: `<div class="mt-cluster">${count}</div>`,
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
  });
}

/** Leaflet sets `title`; screen readers get a proper name through aria-label as well. */
function labelMarker(e: L.LeafletEvent, label: string) {
  const el = (e.target as L.Marker).getElement();
  if (el) el.setAttribute('aria-label', label);
}

function ClusteredMarkers({ points, selectedId, onSelect }: Pick<EventMapProps, 'points' | 'selectedId' | 'onSelect'>) {
  const t = useT();
  const [locale] = useLocale();
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters: Cluster[] = useMemo(
    () => clusterPoints(points, (p) => map.project([p.lat, p.lng], zoom), 56),
    [points, map, zoom],
  );

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.points.length === 1) {
          const point = cluster.points[0];
          const label = t('map.marker.label', { title: point.event.title, date: formatDate(point.event.starts_at, locale) });
          const selected = point.event.id === selectedId;
          return (
            <Marker
              key={`${cluster.key}:${selected ? 1 : 0}`}
              position={[point.lat, point.lng]}
              icon={pinIcon(point, selected)}
              title={label}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelect(point.event.id),
                add: (e) => labelMarker(e, label),
              }}
            />
          );
        }
        const label = t('map.cluster.label', { count: cluster.points.length });
        return (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={clusterIcon(cluster.points.length)}
            title={label}
            eventHandlers={{
              click: () => {
                const bounds = L.latLngBounds(cluster.points.map((p) => [p.lat, p.lng] as [number, number]));
                if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.flyTo(bounds.getCenter(), Math.min(map.getZoom() + 3, 18));
                else map.flyToBounds(bounds.pad(0.4), { maxZoom: 16 });
              },
              add: (e) => labelMarker(e, label),
            }}
          />
        );
      })}
    </>
  );
}

function ReadyReporter({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady?.(map);
  }, [map, onReady]);
  return null;
}

/** OpenStreetMap map of Iceland with one round image pin per event (clustered when crowded). */
export function EventMap({ points, selectedId, onSelect, onReady, className }: EventMapProps) {
  const [isPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches);
  return (
    <MapContainer
      center={ICELAND_CENTER}
      zoom={isPhone ? 5 : 6}
      minZoom={5}
      maxZoom={18}
      maxBounds={ICELAND_BOUNDS}
      maxBoundsViscosity={0.8}
      scrollWheelZoom
      className={className}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClusteredMarkers points={points} selectedId={selectedId} onSelect={onSelect} />
      <ReadyReporter onReady={onReady} />
    </MapContainer>
  );
}

export default EventMap;
