import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, MagnifyingGlass } from '@phosphor-icons/react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchPlaces, type GeocodeResult } from '@/lib/geocoding';
import { defaultLeafletIcon } from '@/lib/leafletIcon';
import { cn } from '@/lib/utils';

const SAUDI_CENTER: LatLngExpression = [24.7136, 46.6753];
const DEFAULT_ZOOM = 6;
const PICKED_ZOOM = 14;

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  onChange: (patch: {
    latitude: number;
    longitude: number;
    location_name?: string;
  }) => void;
  disabled?: boolean;
  errorText?: string;
}

function MapViewSync({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function MapClickHandler({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationMapPicker({
  latitude,
  longitude,
  locationName,
  onChange,
  disabled,
  errorText,
}: LocationMapPickerProps) {
  const { t } = useTranslation('tourism');
  const [query, setQuery] = useState(locationName ?? '');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasCoords = latitude !== 0 || longitude !== 0;
  const markerPosition = useMemo<LatLngExpression>(
    () => (hasCoords ? [latitude, longitude] : SAUDI_CENTER),
    [hasCoords, latitude, longitude],
  );
  const mapZoom = hasCoords ? PICKED_ZOOM : DEFAULT_ZOOM;

  const pickCoords = useCallback(
    (lat: number, lng: number, name?: string) => {
      onChange({
        latitude: lat,
        longitude: lng,
        ...(name ? { location_name: name } : {}),
      });
    },
    [onChange],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void searchPlaces(q)
        .then((rows) => {
          setResults(rows);
          if (rows.length === 0) setSearchError(t('mapPicker.noPlacesFound'));
        })
        .catch(() => setSearchError(t('mapPicker.searchUnavailable')))
        .finally(() => setSearching(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [query, t]);

  function selectResult(row: GeocodeResult) {
    setQuery(row.display_name);
    setResults([]);
    pickCoords(row.lat, row.lon, row.display_name);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-40"
        />
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('mapPicker.searchPlaceholder')}
          className={cn(
            'w-full rounded-xl border border-ink-10 bg-white py-3 pl-10 pr-4 text-[14px] outline-none transition-colors',
            'focus:border-coral focus:ring-2 focus:ring-coral/20',
            disabled && 'cursor-not-allowed bg-ink-5',
          )}
        />
        {searching ? (
          <p className="mt-1.5 text-[12px] text-ink-40">{t('mapPicker.searching')}</p>
        ) : null}
        {searchError ? (
          <p className="mt-1.5 text-[12px] text-coral">{searchError}</p>
        ) : null}
        {results.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-ink-10 bg-white shadow-card-md">
            {results.map((row) => (
              <li key={`${row.lat}-${row.lon}-${row.display_name}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-[13px] hover:bg-ink-5"
                  onClick={() => selectResult(row)}
                >
                  <MapPin size={16} className="mt-0.5 shrink-0 text-coral" weight="fill" />
                  <span className="line-clamp-2 text-ink-70">{row.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-ink-10 shadow-card-sm',
          errorText && 'border-coral/50 ring-2 ring-coral/15',
        )}
      >
        <MapContainer
          center={markerPosition}
          zoom={mapZoom}
          className="h-[320px] w-full z-0"
          scrollWheelZoom={!disabled}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewSync center={markerPosition} zoom={mapZoom} />
          <MapClickHandler
            disabled={disabled}
            onPick={(lat, lng) => pickCoords(lat, lng)}
          />
          {hasCoords ? (
            <Marker
              position={markerPosition}
              icon={defaultLeafletIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  pickCoords(pos.lat, pos.lng);
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-50">
        {t('mapPicker.hint')}
        {hasCoords ? (
          <>
            {' '}
            {t('mapPicker.selected')}{' '}
            <span className="font-mono text-[11px] text-ink-60">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </>
        ) : null}
      </p>
      {errorText ? (
        <p className="text-[12px] font-medium text-coral" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
