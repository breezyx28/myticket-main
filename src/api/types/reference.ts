import type { Id } from '@/api/types/common';

/** `GET /events/categories` — public list DTO (active categories, ordered server-side). */
export interface EventCategoryRef {
  id: Id;
  slug: string;
  name: string;
  name_ar?: string | null;
  /** PascalCase `@phosphor-icons/react` export name, e.g. `MusicNotes`. */
  icon_key?: string | null;
  /** Semantic or hue token mapped to theme tile colors, e.g. `primary`, `purple`. */
  color_token?: string | null;
  /** Published events with this category (`deleted_at` null). */
  events_count?: number | string | null;
  [key: string]: unknown;
}

export interface EventCategoryListResponse {
  data: EventCategoryRef[];
}

/** `GET /reference/vendor-service-categories` — public vendor service taxonomy. */
export interface VendorServiceCategoryRef {
  id: Id;
  slug: string;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  [key: string]: unknown;
}

export interface VendorServiceCategoryListResponse {
  data: VendorServiceCategoryRef[];
}

/** `GET /events/cities`. */
export interface EventCityRef {
  id?: Id;
  slug: string;
  name: string;
  name_en?: string | null;
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
  name_en?: string | null;
  name_ar?: string | null;
  [key: string]: unknown;
}

export interface SaudiRegionRef {
  id: Id;
  code?: string;
  name: string;
  name_en?: string | null;
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
