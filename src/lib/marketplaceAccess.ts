import type { MockUser } from '@/contexts/AuthContext';

/** Marketplace browse (discover talents/vendors) is limited to Organizers and Vendors per product rules. */
export function canBrowseMarketplace(user: MockUser | null | undefined): boolean {
  return user?.role === 'organizer' || user?.role === 'vendor';
}

/** Engagement inbox (chat with organizers) for Talent and Vendor roles. */
export function canAccessEngagementsInbox(user: MockUser | null | undefined): boolean {
  return user?.role === 'talent' || user?.role === 'vendor' || user?.role === 'organizer';
}
