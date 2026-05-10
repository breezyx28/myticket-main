import type { Id, Iso8601, Slug } from '@/api/types/common';

export interface Vendor {
  id: Id;
  slug: Slug;
  business_name: string;
  bio?: string | null;
  city?: string | null;
  service_categories?: string[];
  rating_average?: number | null;
  ratings_count?: number;
  image_url?: string | null;
  gallery?: string[];
  [key: string]: unknown;
}

export interface VendorRating {
  id: Id;
  user_name?: string;
  stars: number;
  comment?: string | null;
  created_at?: Iso8601;
  [key: string]: unknown;
}

export interface VendorRatingsSummary {
  average: number;
  count: number;
  ratings?: VendorRating[];
  [key: string]: unknown;
}
