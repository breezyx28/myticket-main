/**
 * Session persistence for API calls (`prepareHeaders` reads the access token).
 *
 * Tokens and a small profile snapshot live in **first-party cookies** with
 * `SameSite=Lax` and `Secure` on HTTPS so the session survives reloads and
 * is not tied to `localStorage`.
 *
 * **HttpOnly** cookies cannot be set from JavaScript; XSS can still read
 * non-HttpOnly cookies. For HttpOnly sessions, the API must issue `Set-Cookie`
 * on login (e.g. Sanctum cookie auth) and this module would stop writing the
 * bearer cookie from the client.
 */

import type { UserMe } from '@/api/types/user';

const COOKIE_ACCESS = 'myticket_at';
const COOKIE_REFRESH = 'myticket_rt';
const COOKIE_META = 'myticket_meta';

const LEGACY_LS_AT = 'myticket_auth_token';
const LEGACY_LS_RT = 'myticket_refresh_token';

const META_VERSION = 1;
const DEFAULT_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export interface StoredAuthMeta {
  v: number;
  expires_at: string | null;
  user: {
    id: UserMe['id'];
    email?: string;
    full_name?: string;
    role?: string | null;
  } | null;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isSecureCookie(): boolean {
  if (typeof window === 'undefined') return true;
  return window.location.protocol === 'https:';
}

/** Share session across `*.myticket.com` subdomains in production. */
function cookieDomainAttribute(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host === 'myticket.com' || host.endsWith('.myticket.com')) {
    return '; Domain=.myticket.com';
  }
  return '';
}

function writeCookieRaw(name: string, value: string, maxAgeSeconds: number): void {
  try {
    if (typeof document === 'undefined') return;
    const secure = isSecureCookie() ? '; Secure' : '';
    const sameSite = '; SameSite=Lax';
    const path = '; Path=/';
    const domain = cookieDomainAttribute();
    const maxAge = maxAgeSeconds > 0 ? `; Max-Age=${Math.floor(maxAgeSeconds)}` : '; Max-Age=0';
    document.cookie = `${name}=${encodeURIComponent(value)}${maxAge}${path}${domain}${sameSite}${secure}`;
  } catch {
    /* quota / private mode */
  }
}

function readCookieRaw(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const prefix = `${name}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const c = part.trim();
      if (c.startsWith(prefix)) {
        return decodeURIComponent(c.slice(prefix.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function maxAgeFromExpiresAt(expiresAt: string | null | undefined): number {
  if (!expiresAt) return DEFAULT_MAX_AGE_SEC;
  const sec = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (!Number.isFinite(sec) || sec <= 0) return 60 * 60 * 6;
  return Math.min(sec, 60 * 60 * 24 * 400);
}

function snapshotUser(u: UserMe | null | undefined): StoredAuthMeta['user'] {
  if (!u) return null;
  return {
    id: u.id,
    email: typeof u.email === 'string' ? u.email : undefined,
    full_name: typeof u.full_name === 'string' ? u.full_name : undefined,
    role: u.role != null && u.role !== '' ? String(u.role) : null,
  };
}

function migrateFromLocalStorage(): void {
  const s = safeStorage();
  if (!s) return;
  const at = s.getItem(LEGACY_LS_AT);
  const rt = s.getItem(LEGACY_LS_RT);
  if (!at && !rt) return;
  if (at && !readCookieRaw(COOKIE_ACCESS)) {
    writeCookieRaw(COOKIE_ACCESS, at, DEFAULT_MAX_AGE_SEC);
  }
  if (rt && !readCookieRaw(COOKIE_REFRESH)) {
    writeCookieRaw(COOKIE_REFRESH, rt, DEFAULT_MAX_AGE_SEC);
  }
  s.removeItem(LEGACY_LS_AT);
  s.removeItem(LEGACY_LS_RT);
}

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_LS_AT);
    localStorage.removeItem(LEGACY_LS_RT);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  migrateFromLocalStorage();
  const v = readCookieRaw(COOKIE_ACCESS);
  return v && v.length > 0 ? v : null;
}

export function getRefreshToken(): string | null {
  migrateFromLocalStorage();
  const v = readCookieRaw(COOKIE_REFRESH);
  return v && v.length > 0 ? v : null;
}

/** Writes access, refresh, and JSON meta (`expires_at` + minimal `user`) with aligned `Max-Age`. */
export function persistAuthCookies(opts: {
  accessToken: string;
  refreshToken: string | null;
  expiresAt?: string | null;
  userSnapshot?: UserMe | null;
}): void {
  const maxAge = maxAgeFromExpiresAt(opts.expiresAt ?? null);
  writeCookieRaw(COOKIE_ACCESS, opts.accessToken, maxAge);
  if (opts.refreshToken && opts.refreshToken.length > 0) {
    writeCookieRaw(COOKIE_REFRESH, opts.refreshToken, maxAge);
  } else {
    writeCookieRaw(COOKIE_REFRESH, '', 0);
  }
  const meta: StoredAuthMeta = {
    v: META_VERSION,
    expires_at: opts.expiresAt ?? null,
    user: snapshotUser(opts.userSnapshot ?? undefined),
  };
  writeCookieRaw(COOKIE_META, JSON.stringify(meta), maxAge);
  clearLegacyLocalStorage();
}

export function clearTokens(): void {
  writeCookieRaw(COOKIE_ACCESS, '', 0);
  writeCookieRaw(COOKIE_REFRESH, '', 0);
  writeCookieRaw(COOKIE_META, '', 0);
  clearLegacyLocalStorage();
}

export function getStoredAuthMeta(): StoredAuthMeta | null {
  migrateFromLocalStorage();
  const raw = readCookieRaw(COOKIE_META);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as StoredAuthMeta;
    if (!o || typeof o !== 'object' || o.v !== META_VERSION) return null;
    return o;
  } catch {
    return null;
  }
}

/** Partial `UserMe` from cookie meta for cold-start / optimistic UI before `GET /me`. */
export function getSessionUserFromMeta(): UserMe | null {
  const m = getStoredAuthMeta();
  const u = m?.user;
  if (!u || u.id == null) return null;
  return {
    id: u.id,
    email: u.email ?? '',
    full_name: u.full_name ?? '',
    ...(u.role != null ? { role: u.role } : {}),
  } as UserMe;
}

/** Updates only the refresh cookie while keeping the same lifetime as existing meta. */
export function saveRefreshTokenOnly(refreshToken: string | null): void {
  const meta = getStoredAuthMeta();
  const maxAge = maxAgeFromExpiresAt(meta?.expires_at ?? null);
  if (refreshToken && refreshToken.length > 0) {
    writeCookieRaw(COOKIE_REFRESH, refreshToken, maxAge);
  } else {
    writeCookieRaw(COOKIE_REFRESH, '', 0);
  }
}
