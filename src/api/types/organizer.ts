import type { Id, Iso8601, Slug } from '@/api/types/common';
import type { EventListItem } from '@/api/types/event';

export interface OrganizerVenue {
  id: Id;
  organizer_profile_id?: Id;
  name: string;
  address_line?: string | null;
  region_id?: Id | null;
  city_id?: Id | null;
  capacity?: number | null;
  facilities?: string[] | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_default?: boolean;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface OrganizerSocialLink {
  id: Id;
  organizer_profile_id?: Id;
  platform: string;
  url: string;
  position?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface Organizer {
  id: Id;
  slug: Slug;
  user_id?: Id | null;
  application_id?: Id | null;
  code?: string | null;
  /** API may send `display_name` and/or `name`. */
  display_name?: string;
  name?: string;
  bio?: string | null;
  city?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  region_id?: Id | null;
  city_id?: Id | null;
  is_company?: boolean | number;
  company_name?: string | null;
  company_info?: string | null;
  owner_name?: string | null;
  owner_info?: string | null;
  typical_event_duration_hours?: number | null;
  organizer_type?: string | null;
  website?: string | null;
  /** Structured links from `GET /organizers/{slug}`. */
  social_links?: OrganizerSocialLink[] | string[];
  /** Laravel may send decimal as string. */
  rating_average?: number | string | null;
  ratings_count?: number;
  rating_count?: number;
  total_events?: number | string | null;
  total_revenue?: number | string | null;
  logo_url?: string | null;
  document_url?: string | null;
  gallery_urls?: string[] | null;
  venues?: OrganizerVenue[] | null;
  previous_events?: EventListItem[] | null;
  is_active?: boolean | number;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  deleted_at?: Iso8601 | null;
  [key: string]: unknown;
}

export interface OrganizerRating {
  id: Id;
  user_name?: string;
  stars: number;
  comment?: string | null;
  created_at?: Iso8601;
  [key: string]: unknown;
}

export interface OrganizerRatingsSummary {
  average: number;
  count: number;
  ratings?: OrganizerRating[];
  [key: string]: unknown;
}
