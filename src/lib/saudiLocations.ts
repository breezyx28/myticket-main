/** Saudi administrative regions and major cities (English labels for UI). */

import type { SaudiRegionRef } from '@/api/types/reference';

export interface SaudiRegion {
  id: string;
  name: string;
}

export interface SaudiCity {
  id: string;
  name: string;
}

export const SAUDI_REGIONS: SaudiRegion[] = [
  { id: 'riyadh', name: 'Riyadh Region' },
  { id: 'makkah', name: 'Makkah Region' },
  { id: 'eastern', name: 'Eastern Province' },
  { id: 'madinah', name: 'Madinah Region' },
  { id: 'qassim', name: 'Al-Qassim Region' },
  { id: 'asir', name: 'Asir Region' },
  { id: 'tabuk', name: 'Tabuk Region' },
  { id: 'hail', name: 'Hail Region' },
  { id: 'northern', name: 'Northern Borders Region' },
  { id: 'jazan', name: 'Jazan Region' },
  { id: 'najran', name: 'Najran Region' },
  { id: 'al_bahah', name: 'Al Bahah Region' },
  { id: 'al_jawf', name: 'Al Jawf Region' },
];

export const SAUDI_CITIES_BY_REGION: Record<string, SaudiCity[]> = {
  riyadh: [
    { id: 'riyadh_city', name: 'Riyadh' },
    { id: 'diriyah', name: 'Diriyah' },
    { id: 'kharj', name: 'Al Kharj' },
    { id: 'dawadmi', name: 'Dawadmi' },
    { id: 'majmaah', name: 'Al Majma\'ah' },
    { id: 'zulfi', name: 'Al Zulfi' },
    { id: 'shagra', name: 'Shaqra' },
    { id: 'afif', name: 'Afif' },
  ],
  makkah: [
    { id: 'jeddah', name: 'Jeddah' },
    { id: 'makkah_city', name: 'Makkah' },
    { id: 'taif', name: 'Taif' },
    { id: 'rabigh', name: 'Rabigh' },
    { id: 'thuwal', name: 'Thuwal' },
    { id: 'khulays', name: 'Al Khulays' },
    { id: 'laith', name: 'Al Lith' },
    { id: 'jumum', name: 'Al Jumum' },
  ],
  eastern: [
    { id: 'dammam', name: 'Dammam' },
    { id: 'khobar', name: 'Al Khobar' },
    { id: 'dhahran', name: 'Dhahran' },
    { id: 'jubail', name: 'Jubail' },
    { id: 'qatif', name: 'Qatif' },
    { id: 'hofuf', name: 'Al Hofuf' },
    { id: 'mubarraz', name: 'Al Mubarraz' },
    { id: 'hafr', name: 'Hafr Al Batin' },
    { id: 'ras_tanura', name: 'Ras Tanura' },
  ],
  madinah: [
    { id: 'madinah_city', name: 'Madinah' },
    { id: 'yanbu', name: 'Yanbu' },
    { id: 'ula', name: 'Al Ula' },
    { id: 'mahd', name: 'Mahd Al Thahab' },
    { id: 'badr', name: 'Badr' },
    { id: 'khaybar', name: 'Khaybar' },
  ],
  qassim: [
    { id: 'buraidah', name: 'Buraidah' },
    { id: 'unaizah', name: 'Unaizah' },
    { id: 'ras', name: 'Ar Rass' },
    { id: 'midhnab', name: 'Al Midhnab' },
    { id: 'badaya', name: 'Al Badaya' },
  ],
  asir: [
    { id: 'abha', name: 'Abha' },
    { id: 'khamis', name: 'Khamis Mushait' },
    { id: 'namsan', name: 'An Namas' },
    { id: 'sabt', name: 'Sabt Al Alaya' },
    { id: 'bihah', name: 'Bisha' },
  ],
  tabuk: [
    { id: 'tabuk_city', name: 'Tabuk' },
    { id: 'duba', name: 'Duba' },
    { id: 'umluj', name: 'Umluj' },
    { id: 'haql', name: 'Haql' },
  ],
  hail: [
    { id: 'hail_city', name: 'Hail' },
    { id: 'baga', name: 'Baqa\'a' },
    { id: 'ghazalah', name: 'Al Ghazalah' },
  ],
  northern: [
    { id: 'arar', name: 'Arar' },
    { id: 'turaif', name: 'Turaif' },
    { id: 'rafha', name: 'Rafha' },
  ],
  jazan: [
    { id: 'jazan_city', name: 'Jazan' },
    { id: 'sabya', name: 'Sabya' },
    { id: 'farasan', name: 'Farasan' },
    { id: 'ahad', name: 'Ahad Al Masarihah' },
  ],
  najran: [
    { id: 'najran_city', name: 'Najran' },
    { id: 'sharurah', name: 'Sharurah' },
    { id: 'hubuna', name: 'Hubuna' },
  ],
  al_bahah: [
    { id: 'bahah_city', name: 'Al Bahah' },
    { id: 'baljurashi', name: 'Baljurashi' },
    { id: 'mandaq', name: 'Al Mandaq' },
  ],
  al_jawf: [
    { id: 'sakaka', name: 'Sakaka' },
    { id: 'qurayyat_j', name: 'Qurayyat' },
    { id: 'dawmat', name: 'Dawmat Al Jandal' },
  ],
};

export function getCitiesForRegion(regionId: string): SaudiCity[] {
  return SAUDI_CITIES_BY_REGION[regionId] ?? [];
}

export function isValidSaudiCity(regionId: string, cityName: string): boolean {
  const cities = getCitiesForRegion(regionId);
  return cities.some((c) => c.name === cityName);
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
    return region.cities.some((c) => c.name === trimmed);
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
      return region.cities.map((c) => ({ id: String(c.id), name: c.name }));
    }
  }
  return getCitiesForRegion(regionId);
}

/** Region options: API order when present, else static `SAUDI_REGIONS`. */
export function getRegionsFlexible(apiRegions?: SaudiRegionRef[] | null): SaudiRegion[] {
  if (apiRegions && apiRegions.length > 0) {
    return apiRegions.map((r) => ({ id: String(r.id), name: r.name }));
  }
  return SAUDI_REGIONS;
}
