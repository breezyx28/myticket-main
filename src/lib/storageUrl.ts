function getApiOrigin(): string | null {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/**
 * Rewrites API-hosted `/storage/…` URLs to same-origin paths.
 * Vite (dev) and the hosting reverse proxy can forward `/storage` to the API
 * without CORS — required for PDF/screenshot libraries that re-fetch images.
 */
export function toSameOriginStorageUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/storage/')) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!parsed.pathname.startsWith('/storage/')) return trimmed;

    const apiOrigin = getApiOrigin();
    if (apiOrigin && parsed.origin !== apiOrigin) return trimmed;

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}
