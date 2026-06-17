import type { Id, Iso8601, Slug } from '@/api/types/common';

export interface TalentCategoryAttachment {
  id: Id;
  talent_profile_id?: Id;
  talent_category_id?: Id;
  slug: string;
  name_en: string;
  name_ar?: string | null;
  is_active?: boolean;
  display_order?: number;
  is_custom?: boolean;
  created_by_user_id?: Id | null;
}

export interface TalentGalleryItem {
  id: Id;
  talent_profile_id?: Id;
  image_url: string;
  caption?: string | null;
  position?: number;
  created_at?: Iso8601;
}

export interface TalentRelatedEvent {
  id: Id;
  code: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  starts_at?: Iso8601;
  ends_at?: Iso8601;
  status?: string;
  venue_name?: string | null;
  proficiency?: string | null;
  [key: string]: unknown;
}

export interface Talent {
  id: Id;
  slug: Slug;
  stage_name: string;
  bio?: string | null;
  city?: string | null;
  city_id?: Id;
  region_id?: Id;
  categories?: Array<string | TalentCategoryAttachment>;
  rating_average?: number | string | null;
  rating_count?: number;
  ratings_count?: number;
  completed_bookings?: number;
  image_url?: string | null;
  profile_image?: string | null;
  profile_image_url?: string | null;
  gallery?: Array<string | TalentGalleryItem>;
  availability?: 'available' | 'reserved' | string;
  availability_status?: 'available' | 'reserved' | string;
  travel_ready?: boolean;
  events?: TalentRelatedEvent[];
  [key: string]: unknown;
}

/** Top-rated talent row from `GET /talents/top`. */
export type TopTalent = Pick<
  Talent,
  | 'id'
  | 'slug'
  | 'stage_name'
  | 'bio'
  | 'city_id'
  | 'region_id'
  | 'profile_image'
  | 'profile_image_url'
  | 'availability_status'
  | 'rating_average'
  | 'rating_count'
  | 'completed_bookings'
  | 'categories'
>;

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
