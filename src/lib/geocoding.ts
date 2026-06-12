export interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
}

/** OpenStreetMap Nominatim search (Saudi Arabia bias). */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '6',
    countrycodes: 'sa',
    addressdetails: '0',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    },
  );

  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  return data
    .map((row) => ({
      display_name: row.display_name ?? '',
      lat: Number(row.lat),
      lon: Number(row.lon),
    }))
    .filter((row) => row.display_name && Number.isFinite(row.lat) && Number.isFinite(row.lon));
}
