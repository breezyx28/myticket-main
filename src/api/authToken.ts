/**
 * Bearer token persistence used by `prepareHeaders` in `baseApi`.
 *
 * Token storage is the single source of truth for "is the user signed in"
 * across cold starts; `AuthContext` rehydrates the `MockUser` shape from
 * `/me` on mount when a token is present. There is no mirrored user cache.
 */

const TOKEN_KEY = 'myticket_auth_token';
const REFRESH_TOKEN_KEY = 'myticket_refresh_token';

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return safeStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function setToken(token: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (token) storage.setItem(TOKEN_KEY, token);
  else storage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return safeStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function setRefreshToken(token: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (token) storage.setItem(REFRESH_TOKEN_KEY, token);
  else storage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}
