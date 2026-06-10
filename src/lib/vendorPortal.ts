import type { MockUser } from '@/contexts/AuthContext';

const DEFAULT_VENDOR_PORTAL_URL = 'https://myticket-vendor.kat-jr.com';

export function isVendorUser(user: MockUser | null | undefined): boolean {
  return user?.role === 'vendor';
}

export function isGuestVendorApplicant(user: MockUser | null | undefined): boolean {
  return user?.role === 'guest';
}

export function getVendorPortalBaseUrl(): string {
  return (
    (import.meta.env.VITE_VENDOR_DASHBOARD_URL as string | undefined)?.trim() ||
    DEFAULT_VENDOR_PORTAL_URL
  );
}

export function buildVendorPortalUrl(path = '/', user?: MockUser | null): string {
  let url: URL;
  try {
    url = new URL(path, getVendorPortalBaseUrl());
  } catch {
    url = new URL(path, DEFAULT_VENDOR_PORTAL_URL);
  }
  url.searchParams.set('source', 'main-website');
  if (user?.email) {
    url.searchParams.set('email', user.email);
  }
  return url.toString();
}
