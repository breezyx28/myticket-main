import type { Id, Iso8601 } from '@/api/types/common';

export type RatingSubjectType = 'event' | 'talent' | 'vendor' | 'organizer' | string;

export interface CreateRatingRequest {
  subject_type: RatingSubjectType;
  subject_id: Id;
  stars: number;
  comment?: string;
}

export interface UpdateRatingRequest {
  stars?: number;
  comment?: string;
}

export interface Rating {
  id: Id;
  subject_type: RatingSubjectType;
  subject_id: Id;
  stars: number;
  comment?: string | null;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

/**
 * `GET /me/ratings` — the caller's own ratings, optionally narrowed to a
 * subject. Used by the post-event "rate this" CTA to know whether the user
 * has already submitted a rating for a given event/talent/vendor/organizer.
 */
export interface MyRatingsQuery {
  subject_type: RatingSubjectType;
  subject_id?: Id;
  page?: number;
  per_page?: number;
}

export interface MyRatingsResponse {
  data: Rating[];
  [key: string]: unknown;
}
