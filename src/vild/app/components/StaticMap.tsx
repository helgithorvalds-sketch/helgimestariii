import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, escapeHtml } from '../lib/geo';

/** A still map: one pin, no interaction. 160px tall on the place screen. */
export default function StaticMap({ lat, lng, logoText, className }: { lat: number; lng: number; logoText: string; className?: string }) {
  const icon = L.divIcon({ className: 'vild-pin-icon', html: `<div class="vild-pin">${escapeHtml(logoText)}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Marker position={[lat, lng]} icon={icon} interactive={false} />
    </MapContainer>
  );
}
