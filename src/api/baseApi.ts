import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getToken } from '@/api/authToken';

const ENV_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';
const ENV_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api/v1/main';

function joinUrl(base: string, prefix: string): string {
  const left = base.endsWith('/') ? base.slice(0, -1) : base;
  const right = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return `${left}${right}`;
}

export const API_BASE_URL = joinUrl(ENV_BASE, ENV_PREFIX);

/**
 * Tag types the RTK Query cache uses for invalidation.
 *
 * Add new tags here when introducing additional resources.
 */
export const apiTagTypes = [
  'Me',
  'Session',
  'Device',
  'Talent',
  'Vendor',
  'Organizer',
  'Event',
  'EventRating',
  'EventLineup',
  'EventGallery',
  'EventTicketTypes',
  'EventOccurrence',
  'EventSeats',
  'SeatLock',
  'Auction',
  'AuctionBid',
  'AuctionStats',
  'Order',
  'Ticket',
  'SavedCard',
  'Gift',
  'GiftInbox',
  'Engagement',
  'Rating',
  'MyRating',
  'Waitlist',
  'Notification',
  'NotificationPrefs',
  'SupportCase',
  'SupportChat',
  'Complaint',
  'ComplaintCategory',
  'RoleApplication',
  'TalentProfile',
  'VendorProfile',
  'TalentAvailability',
  'Favorite',
  'Preferences',
  'EventTaxonomy',
  'SaudiRegion',
  'TourismAd',
  'TourismAdCarousel',
] as const;

export type ApiTagType = (typeof apiTagTypes)[number];

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: apiTagTypes,
  endpoints: () => ({}),
});
