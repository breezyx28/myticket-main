import type { MockUser } from '@/contexts/AuthContext';

const DEFAULT_TALENT_PORTAL_URL = 'https://myticket-talent.kat-jr.com';

export function isTalentUser(user: MockUser | null | undefined): boolean {
  return user?.role === 'talent';
}

export function isGuestApplicant(user: MockUser | null | undefined): boolean {
  return user?.role === 'guest';
}

export function getTalentPortalBaseUrl(): string {
  return (
    (import.meta.env.VITE_TALENT_DASHBOARD_URL as string | undefined)?.trim() ||
    DEFAULT_TALENT_PORTAL_URL
  );
}

export function buildTalentPortalUrl(path = '/', user?: MockUser | null): string {
  let url: URL;
  try {
    url = new URL(path, getTalentPortalBaseUrl());
  } catch {
    url = new URL(path, DEFAULT_TALENT_PORTAL_URL);
  }
  url.searchParams.set('source', 'main-website');
  if (user?.email) {
    url.searchParams.set('email', user.email);
  }
  return url.toString();
}
