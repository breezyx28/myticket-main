/** Prevent open redirects: only allow same-app relative paths. */
export function getSafeRedirectPath(pathname: string | undefined | null): string | null {
  if (!pathname || typeof pathname !== 'string') return null;
  const t = pathname.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  return t;
}
