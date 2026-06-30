/** Saudi administrative regions and major cities — API-first with static fallback. */

import type { SaudiRegionRef } from '@/api/types/reference';

export interface SaudiPlace {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
}

export type SaudiRegion = SaudiPlace;
export type SaudiCity = SaudiPlace;

export const SAUDI_REGIONS: SaudiRegion[] = [
  { id: 'riyadh', name: 'Riyadh Region', name_en: 'Riyadh Region' },
  { id: 'makkah', name: 'Makkah Region', name_en: 'Makkah Region' },
  { id: 'eastern', name: 'Eastern Province', name_en: 'Eastern Province' },
  { id: 'madinah', name: 'Madinah Region', name_en: 'Madinah Region' },
  { id: 'qassim', name: 'Al-Qassim Region', name_en: 'Al-Qassim Region' },
  { id: 'asir', name: 'Asir Region', name_en: 'Asir Region' },
  { id: 'tabuk', name: 'Tabuk Region', name_en: 'Tabuk Region' },
  { id: 'hail', name: 'Hail Region', name_en: 'Hail Region' },
  { id: 'northern', name: 'Northern Borders Region', name_en: 'Northern Borders Region' },
  { id: 'jazan', name: 'Jazan Region', name_en: 'Jazan Region' },
  { id: 'najran', name: 'Najran Region', name_en: 'Najran Region' },
  { id: 'al_bahah', name: 'Al Bahah Region', name_en: 'Al Bahah Region' },
  { id: 'al_jawf', name: 'Al Jawf Region', name_en: 'Al Jawf Region' },
];

function mapApiCity(c: SaudiRegionRef['cities'][number]): SaudiCity {
  return {
    id: String(c.id),
    name: c.name,
    name_en: c.name_en ?? c.name,
    name_ar: c.name_ar ?? undefined,
  };
}

function mapApiRegion(r: SaudiRegionRef): SaudiRegion {
  return {
    id: String(r.id),
    name: r.name,
    name_en: r.name_en ?? r.name,
    name_ar: r.name_ar ?? undefined,
  };
}

/** Stable value for selects / API payloads (prefer English canonical). */
export function canonicalPlaceName(
  item: Pick<SaudiPlace, 'name' | 'name_en' | 'name_ar'>,
): string {
  return item.name_en?.trim() || item.name?.trim() || item.name_ar?.trim() || '';
}

export function placeMatchesName(
  item: Pick<SaudiPlace, 'name' | 'name_en' | 'name_ar'>,
  value: string,
): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return [item.name, item.name_en, item.name_ar].some(
    (n) => n?.trim().toLowerCase() === v,
  );
}

/** Match stored city (id or legacy name) to a select option value (city id). */
export function resolveCitySelectValue(
  city: string | undefined | null,
  cities: SaudiCity[],
): string {
  const trimmed = String(city ?? '').trim();
  if (!trimmed) return '';
  const byId = cities.find((c) => String(c.id) === trimmed);
  if (byId) return String(byId.id);
  const byName = cities.find((c) => placeMatchesName(c, trimmed));
  return byName ? String(byName.id) : trimmed;
}

/** `PATCH /role-applications/*` — `city` maps to `city_id` (integer). */
export function apiIntegerId(value: string | undefined | null): number | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function cityValueToApiId(
  regionId: string,
  cityValue: string,
  apiRegions?: SaudiRegionRef[] | null,
): number | undefined {
  const trimmed = cityValue.trim();
  if (!regionId || !trimmed) return undefined;

  const cities = getCitiesForRegionFlexible(regionId, apiRegions);
  const asInt = apiIntegerId(trimmed);
  if (asInt != null && cities.some((c) => String(c.id) === String(asInt))) {
    return asInt;
  }

  const match = cities.find((c) => String(c.id) === trimmed || placeMatchesName(c, trimmed));
  if (!match) return undefined;
  return apiIntegerId(match.id);
}

export const SAUDI_CITIES_BY_REGION: Record<string, SaudiCity[]> = {
  riyadh: [
    { id: 'riyadh_city', name: 'Riyadh', name_en: 'Riyadh' },
    { id: 'diriyah', name: 'Diriyah', name_en: 'Diriyah' },
    { id: 'kharj', name: 'Al Kharj', name_en: 'Al Kharj' },
    { id: 'dawadmi', name: 'Dawadmi', name_en: 'Dawadmi' },
    { id: 'majmaah', name: "Al Majma'ah", name_en: "Al Majma'ah" },
    { id: 'zulfi', name: 'Al Zulfi', name_en: 'Al Zulfi' },
    { id: 'shagra', name: 'Shaqra', name_en: 'Shaqra' },
    { id: 'afif', name: 'Afif', name_en: 'Afif' },
  ],
  makkah: [
    { id: 'jeddah', name: 'Jeddah', name_en: 'Jeddah' },
    { id: 'makkah_city', name: 'Makkah', name_en: 'Makkah' },
    { id: 'taif', name: 'Taif', name_en: 'Taif' },
    { id: 'rabigh', name: 'Rabigh', name_en: 'Rabigh' },
    { id: 'thuwal', name: 'Thuwal', name_en: 'Thuwal' },
    { id: 'khulays', name: 'Al Khulays', name_en: 'Al Khulays' },
    { id: 'laith', name: 'Al Lith', name_en: 'Al Lith' },
    { id: 'jumum', name: 'Al Jumum', name_en: 'Al Jumum' },
  ],
  eastern: [
    { id: 'dammam', name: 'Dammam', name_en: 'Dammam' },
    { id: 'khobar', name: 'Al Khobar', name_en: 'Al Khobar' },
    { id: 'dhahran', name: 'Dhahran', name_en: 'Dhahran' },
    { id: 'jubail', name: 'Jubail', name_en: 'Jubail' },
    { id: 'qatif', name: 'Qatif', name_en: 'Qatif' },
    { id: 'hofuf', name: 'Al Hofuf', name_en: 'Al Hofuf' },
    { id: 'mubarraz', name: 'Al Mubarraz', name_en: 'Al Mubarraz' },
    { id: 'hafr', name: 'Hafr Al Batin', name_en: 'Hafr Al Batin' },
    { id: 'ras_tanura', name: 'Ras Tanura', name_en: 'Ras Tanura' },
  ],
  madinah: [
    { id: 'madinah_city', name: 'Madinah', name_en: 'Madinah' },
    { id: 'yanbu', name: 'Yanbu', name_en: 'Yanbu' },
    { id: 'ula', name: 'Al Ula', name_en: 'Al Ula' },
    { id: 'mahd', name: 'Mahd Al Thahab', name_en: 'Mahd Al Thahab' },
    { id: 'badr', name: 'Badr', name_en: 'Badr' },
    { id: 'khaybar', name: 'Khaybar', name_en: 'Khaybar' },
  ],
  qassim: [
    { id: 'buraidah', name: 'Buraidah', name_en: 'Buraidah' },
    { id: 'unaizah', name: 'Unaizah', name_en: 'Unaizah' },
    { id: 'ras', name: 'Ar Rass', name_en: 'Ar Rass' },
    { id: 'midhnab', name: 'Al Midhnab', name_en: 'Al Midhnab' },
    { id: 'badaya', name: 'Al Badaya', name_en: 'Al Badaya' },
  ],
  asir: [
    { id: 'abha', name: 'Abha', name_en: 'Abha' },
    { id: 'khamis', name: 'Khamis Mushait', name_en: 'Khamis Mushait' },
    { id: 'namsan', name: 'An Namas', name_en: 'An Namas' },
    { id: 'sabt', name: 'Sabt Al Alaya', name_en: 'Sabt Al Alaya' },
    { id: 'bihah', name: 'Bisha', name_en: 'Bisha' },
  ],
  tabuk: [
    { id: 'tabuk_city', name: 'Tabuk', name_en: 'Tabuk' },
    { id: 'duba', name: 'Duba', name_en: 'Duba' },
    { id: 'umluj', name: 'Umluj', name_en: 'Umluj' },
    { id: 'haql', name: 'Haql', name_en: 'Haql' },
  ],
  hail: [
    { id: 'hail_city', name: 'Hail', name_en: 'Hail' },
    { id: 'baga', name: "Baqa'a", name_en: "Baqa'a" },
    { id: 'ghazalah', name: 'Al Ghazalah', name_en: 'Al Ghazalah' },
  ],
  northern: [
    { id: 'arar', name: 'Arar', name_en: 'Arar' },
    { id: 'turaif', name: 'Turaif', name_en: 'Turaif' },
    { id: 'rafha', name: 'Rafha', name_en: 'Rafha' },
  ],
  jazan: [
    { id: 'jazan_city', name: 'Jazan', name_en: 'Jazan' },
    { id: 'sabya', name: 'Sabya', name_en: 'Sabya' },
    { id: 'farasan', name: 'Farasan', name_en: 'Farasan' },
    { id: 'ahad', name: 'Ahad Al Masarihah', name_en: 'Ahad Al Masarihah' },
  ],
  najran: [
    { id: 'najran_city', name: 'Najran', name_en: 'Najran' },
    { id: 'sharurah', name: 'Sharurah', name_en: 'Sharurah' },
    { id: 'hubuna', name: 'Hubuna', name_en: 'Hubuna' },
  ],
  al_bahah: [
    { id: 'bahah_city', name: 'Al Bahah', name_en: 'Al Bahah' },
    { id: 'baljurashi', name: 'Baljurashi', name_en: 'Baljurashi' },
    { id: 'mandaq', name: 'Al Mandaq', name_en: 'Al Mandaq' },
  ],
  al_jawf: [
    { id: 'sakaka', name: 'Sakaka', name_en: 'Sakaka' },
    { id: 'qurayyat_j', name: 'Qurayyat', name_en: 'Qurayyat' },
    { id: 'dawmat', name: 'Dawmat Al Jandal', name_en: 'Dawmat Al Jandal' },
  ],
};

export function getCitiesForRegion(regionId: string): SaudiCity[] {
  return SAUDI_CITIES_BY_REGION[regionId] ?? [];
}

export function isValidSaudiCity(regionId: string, cityValue: string): boolean {
  const trimmed = cityValue.trim();
  if (!trimmed) return false;
  const cities = getCitiesForRegion(regionId);
  return cities.some((c) => String(c.id) === trimmed || placeMatchesName(c, trimmed));
}

/** Prefer API `GET /reference/saudi-regions` when loaded; fall back to static lists. */
export function isValidSaudiCityFlexible(
  regionId: string,
  cityName: string,
  apiRegions?: SaudiRegionRef[] | null,
): boolean {
  const trimmed = cityName.trim();
  if (!regionId || !trimmed) return false;
  if (apiRegions && apiRegions.length > 0) {
    const region = apiRegions.find((r) => String(r.id) === String(regionId));
    if (!region) return false;
    return region.cities.some(
      (c) => String(c.id) === trimmed || placeMatchesName(mapApiCity(c), trimmed),
    );
  }
  return isValidSaudiCity(regionId, trimmed);
}

/** Cities for a region id using API data when available. */
export function getCitiesForRegionFlexible(
  regionId: string,
  apiRegions?: SaudiRegionRef[] | null,
): SaudiCity[] {
  if (apiRegions && apiRegions.length > 0 && regionId) {
    const region = apiRegions.find((r) => String(r.id) === String(regionId));
    if (region?.cities?.length) {
      return region.cities.map(mapApiCity);
    }
  }
  return getCitiesForRegion(regionId);
}

/** Region options: API order when present, else static `SAUDI_REGIONS`. */
export function getRegionsFlexible(apiRegions?: SaudiRegionRef[] | null): SaudiRegion[] {
  if (apiRegions && apiRegions.length > 0) {
    return apiRegions.map(mapApiRegion);
  }
  return SAUDI_REGIONS;
}

/** Find region id from stored name in any locale. */
export function findRegionIdByName(
  name: string,
  apiRegions?: SaudiRegionRef[] | null,
): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const regions = getRegionsFlexible(apiRegions);
  return regions.find((r) => placeMatchesName(r, trimmed))?.id ?? '';
}

/** Region that contains a city id or name (any locale). */
export function findRegionIdForCity(
  cityValue: string,
  apiRegions?: SaudiRegionRef[] | null,
): string {
  const trimmed = cityValue.trim();
  if (!trimmed) return '';
  const regions = getRegionsFlexible(apiRegions);
  for (const region of regions) {
    const cities = getCitiesForRegionFlexible(region.id, apiRegions);
    if (cities.some((c) => String(c.id) === trimmed || placeMatchesName(c, trimmed))) {
      return region.id;
    }
  }
  return findRegionIdByCityName(trimmed, apiRegions);
}

/** Find region id that contains a city name in any locale. */
export function findRegionIdByCityName(
  cityName: string,
  apiRegions?: SaudiRegionRef[] | null,
): string {
  const trimmed = cityName.trim();
  if (!trimmed) return '';
  const regions = getRegionsFlexible(apiRegions);
  for (const region of regions) {
    const cities = getCitiesForRegionFlexible(region.id, apiRegions);
    if (cities.some((c) => placeMatchesName(c, trimmed))) {
      return region.id;
    }
  }
  return '';
}

// ponytail: dev-only — fails if city name/id → API integer mapping regresses
if (import.meta.env.DEV) {
  const mockRegions: SaudiRegionRef[] = [
    {
      id: 3,
      name: 'Madinah',
      cities: [{ id: 77, name: 'Yanbu', name_en: 'Yanbu' }],
    },
  ];
  console.assert(cityValueToApiId('3', 'Yanbu', mockRegions) === 77);
  console.assert(cityValueToApiId('3', '77', mockRegions) === 77);
  console.assert(apiIntegerId('3') === 3);
}

// ponytail: dev-only — fails if city name/id → API integer mapping regresses
if (import.meta.env.DEV) {
  const mockRegions: SaudiRegionRef[] = [
    {
      id: 3,
      name: 'Madinah',
      cities: [{ id: 77, name: 'Yanbu', name_en: 'Yanbu' }],
    },
  ];
  console.assert(cityValueToApiId('3', 'Yanbu', mockRegions) === 77);
  console.assert(cityValueToApiId('3', '77', mockRegions) === 77);
  console.assert(apiIntegerId('3') === 3);
}
