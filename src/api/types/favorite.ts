import type { Id, Iso8601, Paginated, Slug } from '@/api/types/common';

/**
 * Public-facing favorite list shape returned by `GET /me/favorites`. The
 * backend reuses the event card payload but always sets `is_favorited: true`
 * so the heart icon hydrates correctly without an extra round-trip.
 */
export interface FavoriteEvent {
  id: Id;
  slug: Slug;
  title: string;
  cover_image_url?: string | null;
  city?: string | null;
  venue?: string | null;
  date_start: Iso8601;
  date_end?: Iso8601 | null;
  is_favorited: true;
  favorited_at: Iso8601;
  [key: string]: unknown;
}

export type FavoritesListResponse = Paginated<FavoriteEvent>;

/**
 * `PUT /me/favorites/{eventId}` is idempotent and returns the new state for
 * the heart toggle. The backend toggles the row and reports whichever side
 * of the toggle the client should now display.
 */
export interface ToggleFavoriteResponse {
  event_id: Id;
  is_favorited: boolean;
  favorited_at: Iso8601 | null;
  [key: string]: unknown;
}
