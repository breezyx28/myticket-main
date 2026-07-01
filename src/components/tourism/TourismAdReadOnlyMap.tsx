import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLeafletIcon } from '@/lib/leafletIcon';

type TourismAdReadOnlyMapProps = {
  latitude: string | number;
  longitude: string | number;
  className?: string;
};

export function TourismAdReadOnlyMap({ latitude, longitude, className }: TourismAdReadOnlyMapProps) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const center = useMemo<LatLngExpression>(
    () => (Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [24.7136, 46.6753]),
    [lat, lng],
  );
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={hasPin ? 14 : 6}
        scrollWheelZoom={false}
        className="h-full w-full rounded-[inherit]"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {hasPin ? <Marker position={[lat, lng]} icon={defaultLeafletIcon} /> : null}
      </MapContainer>
    </div>
  );
}
