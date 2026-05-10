import type { MockUser } from '@/contexts/AuthContext';

const DEFAULT_ORGANIZER_PORTAL_URL = 'https://organizer.myticket.com';

export function isOrganizerUser(user: MockUser | null | undefined): boolean {
  return user?.role === 'organizer';
}

export function getOrganizerPortalBaseUrl() {
  return (import.meta.env.VITE_ORGANIZER_DASHBOARD_URL as string | undefined)?.trim() || DEFAULT_ORGANIZER_PORTAL_URL;
}

export function buildOrganizerPortalUrl(user: MockUser | null | undefined) {
  let url: URL;
  try {
    url = new URL(getOrganizerPortalBaseUrl());
  } catch {
    url = new URL(DEFAULT_ORGANIZER_PORTAL_URL);
  }
  url.searchParams.set('source', 'main-website');
  if (user?.email) {
    url.searchParams.set('email', user.email);
  }
  return url.toString();
}
