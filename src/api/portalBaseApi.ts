import { API_BASE_URL } from '@/api/baseApi';
import { getApiLanguage } from '@/lib/language';
import type { OnboardingRole } from '@/types/domain';

const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'
).replace(/\/$/, '');

function joinUrl(base: string, prefix: string): string {
  const left = base.endsWith('/') ? base.slice(0, -1) : base;
  const right = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return `${left}${right}`;
}

export class PortalApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
  }
}

/**
 * API base for register-flow profile submit.
 * - Organizer: dedicated `/api/v1/organizer` scope
 * - Talent / vendor: main website scope (`/api/v1/main`) per backend handoff
 */
export function getPortalApiBase(role: OnboardingRole): string {
  if (role === 'organizer') {
    const override = (import.meta.env.VITE_ORGANIZER_API_PREFIX as string | undefined)?.trim();
    const prefix = override || '/api/v1/organizer';
    return joinUrl(API_BASE, prefix);
  }

  const override =
    role === 'talent'
      ? (import.meta.env.VITE_TALENT_API_PREFIX as string | undefined)?.trim()
      : (import.meta.env.VITE_VENDOR_API_PREFIX as string | undefined)?.trim();
  if (override) return joinUrl(API_BASE, override);

  return API_BASE_URL;
}

export function getPortalProfilePath(role: OnboardingRole): string {
  switch (role) {
    case 'organizer':
      return '/me/profile';
    case 'talent':
      return '/me/talent-profile';
    case 'vendor':
      return '/me/vendor-profile';
  }
}

async function parsePortalError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function portalFetch<T>(
  role: OnboardingRole,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', getApiLanguage());
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${getPortalApiBase(role)}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new PortalApiError(await parsePortalError(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
