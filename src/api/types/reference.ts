import type { Id } from '@/api/types/common';

/** `GET /events/categories` — reduced DTO (active categories, ordered server-side). */
export interface EventCategoryRef {
  id: Id;
  slug: string;
  name: string;
  name_ar?: string | null;
  /** Published events with this category (`deleted_at` null). */
  events_count?: number | string | null;
  [key: string]: unknown;
}

export interface EventCategoryListResponse {
  data: EventCategoryRef[];
}

/** `GET /events/cities`. */
export interface EventCityRef {
  slug: string;
  name: string;
  name_ar?: string | null;
  region_id?: Id | null;
  events_count?: number;
  [key: string]: unknown;
}

export interface EventCityListResponse {
  data: EventCityRef[];
}

/** `GET /reference/saudi-regions`. */
export interface SaudiCityRef {
  id: Id;
  name: string;
  name_ar?: string | null;
  [key: string]: unknown;
}

export interface SaudiRegionRef {
  id: Id;
  name: string;
  name_ar?: string | null;
  cities: SaudiCityRef[];
  [key: string]: unknown;
}

export interface SaudiRegionsResponse {
  data: SaudiRegionRef[];
}

// Complaint category definitions live in `types/complaint.ts` (re-exported
// from the endpoints layer). Kept here only as a comment so future readers
// know where to look.
