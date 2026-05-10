import type { Id, Iso8601, Slug } from '@/api/types/common';

export interface Organizer {
  id: Id;
  slug: Slug;
  display_name: string;
  bio?: string | null;
  city?: string | null;
  is_company?: boolean;
  company_name?: string | null;
  website?: string | null;
  social_links?: string[];
  rating_average?: number | null;
  ratings_count?: number;
  logo_url?: string | null;
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
