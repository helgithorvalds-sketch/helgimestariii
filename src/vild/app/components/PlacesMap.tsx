import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Location, Merchant } from '../../lib/types';
import { ICELAND_BOUNDS, ICELAND_CENTER, TILE_ATTRIBUTION, TILE_URL, clusterPoints, escapeHtml } from '../lib/geo';

export type MapPlace = Location & { merchant: Pick<Merchant, 'logoText' | 'brandColor' | 'name'> };

export type PlacesMapProps = {
  places: MapPlace[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReady?: (map: L.Map) => void;
  className?: string;
};

const PIN = 44;

function pinIcon(place: MapPlace, selected: boolean): L.DivIcon {
  const pending = place.posStatus !== 'connected';
  const badge = pending ? '<span class="vild-pin__badge">Væntanlegt</span>' : '';
  return L.divIcon({
    className: 'vild-pin-icon',
    html: `<div class="vild-pin${selected ? ' vild-pin--selected' : ''}">${escapeHtml(place.merchant.logoText)}${badge}</div>`,
    iconSize: [PIN, PIN],
    iconAnchor: [PIN / 2, PIN / 2],
  });
}

function clusterIcon(count: number): L.DivIcon {
  return L.divIcon({ className: 'vild-pin-icon', html: `<div class="vild-cluster">${count}</div>`, iconSize: [PIN, PIN], iconAnchor: [PIN / 2, PIN / 2] });
}

function labelMarker(e: L.LeafletEvent, label: string) {
  const el = (e.target as L.Marker).getElement();
  if (el) {
    el.setAttribute('aria-label', label);
    el.setAttribute('role', 'button');
  }
}

function Pins({ places, selectedId, onSelect }: Pick<PlacesMapProps, 'places' | 'selectedId' | 'onSelect'>) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    click: () => onSelect(null),
  });
  const clusters = useMemo(() => clusterPoints(places, (p) => map.project([p.lat, p.lng], zoom), 48), [places, map, zoom]);
  return (
    <>
      {clusters.map((c) => {
        if (c.points.length === 1) {
          const place = c.points[0];
          const selected = place.id === selectedId;
          return (
            <Marker
              key={`${c.key}:${selected ? 1 : 0}`}
              position={[place.lat, place.lng]}
              icon={pinIcon(place, selected)}
              title={place.name}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(place.id), add: (e) => labelMarker(e, place.name) }}
            />
          );
        }
        const label = `${c.points.length} staðir`;
        return (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={clusterIcon(c.points.length)}
            title={label}
            eventHandlers={{
              click: () => {
                const bounds = L.latLngBounds(c.points.map((p) => [p.lat, p.lng] as [number, number]));
                if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.flyTo(bounds.getCenter(), Math.min(map.getZoom() + 3, 17));
                else map.flyToBounds(bounds.pad(0.4), { maxZoom: 15 });
              },
              add: (e) => labelMarker(e, label),
            }}
          />
        );
      })}
    </>
  );
}

function FitOnce({ places }: { places: MapPlace[] }) {
  const map = useMap();
  const signature = places.map((p) => p.id).join(',');
  useEffect(() => {
    if (!places.length) return;
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the set changes
  }, [map, signature]);
  return null;
}

function Ready({ onReady }: { onReady?: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady?.(map);
    // Leaflet measures its container on mount; the column can still be laying out.
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(t);
  }, [map, onReady]);
  return null;
}

/** OpenStreetMap map of Iceland with one green pin per place; clusters when crowded. */
export default function PlacesMap({ places, selectedId, onSelect, onReady, className }: PlacesMapProps) {
  return (
    <MapContainer
      center={ICELAND_CENTER}
      zoom={6}
      minZoom={5}
      maxZoom={18}
      maxBounds={ICELAND_BOUNDS}
      maxBoundsViscosity={0.8}
      scrollWheelZoom={false}
      zoomControl={false}
      className={className}
      attributionControl
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Pins places={places} selectedId={selectedId} onSelect={onSelect} />
      <FitOnce places={places} />
      <Ready onReady={onReady} />
    </MapContainer>
  );
}
