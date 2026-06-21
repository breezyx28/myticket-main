import type { OnboardingRole } from '@/types/domain';

const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'
).replace(/\/$/, '');

const PREFIX_ENV: Record<OnboardingRole, keyof ImportMetaEnv> = {
  organizer: 'VITE_ORGANIZER_API_PREFIX',
  talent: 'VITE_TALENT_API_PREFIX',
  vendor: 'VITE_VENDOR_API_PREFIX',
};

export class PortalApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
  }
}

export function getPortalApiBase(role: OnboardingRole): string {
  const override = (import.meta.env[PREFIX_ENV[role]] as string | undefined)?.trim();
  const prefix = override || `/api/v1/${role}`;
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return `${API_BASE}${normalized}`;
}

/** ponytail: talent/vendor may use `/me/talent-profile` — adjust when backend confirms. */
export function getPortalProfilePath(role: OnboardingRole): string {
  void role;
  return '/me/profile';
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
