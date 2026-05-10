import type { Id, Iso8601, Slug } from '@/api/types/common';

export interface Talent {
  id: Id;
  slug: Slug;
  stage_name: string;
  bio?: string | null;
  city?: string | null;
  categories?: string[];
  rating_average?: number | null;
  ratings_count?: number;
  image_url?: string | null;
  gallery?: string[];
  availability?: 'available' | 'reserved' | string;
  [key: string]: unknown;
}

export interface TalentRating {
  id: Id;
  user_name?: string;
  stars: number;
  comment?: string | null;
  created_at?: Iso8601;
  [key: string]: unknown;
}

export interface TalentRatingsSummary {
  average: number;
  count: number;
  ratings?: TalentRating[];
  [key: string]: unknown;
}
