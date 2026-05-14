/**
 * Laravel `storage/` URLs for paths returned without a host (e.g. `organizer-gallery/…`).
 * Full URLs from the API are returned unchanged.
 */
export function resolvePublicStorageUrl(path: string | null | undefined): string | null {
  if (path == null || typeof path !== 'string') return null;
  const p = path.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const base = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');
  if (!base) return `/${p.replace(/^\/+/, '')}`;
  return `${base}/storage/${p.replace(/^\/+/, '')}`;
}
