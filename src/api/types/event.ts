import type { Id, Iso8601, Money, Slug } from '@/api/types/common';

export type EventLayoutType = 'seated' | 'free' | string;

export interface EventOrganizerSummary {
  id: Id;
  slug?: Slug;
  display_name: string;
  logo_url?: string | null;
  [key: string]: unknown;
}

export interface EventTalentSummary {
  id: Id;
  slug?: Slug;
  stage_name: string;
  image_url?: string | null;
  proficiency?: string | null;
  [key: string]: unknown;
}

export interface EventVendorSummary {
  id: Id;
  slug?: Slug;
  business_name: string;
  service_type?: string | null;
  [key: string]: unknown;
}

export interface EventListItem {
  id: Id;
  slug?: Slug;
  code?: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  city?: string | null;
  city_name?: string | null;
  city_id?: Id | null;
  venue?: string | null;
  venue_name?: string | null;
  category?: string | null;
  category_name?: string | null;
  category_id?: Id | null;
  date_start: Iso8601;
  starts_at?: Iso8601 | null;
  date_end?: Iso8601 | null;
  ends_at?: Iso8601 | null;
  price_min?: Money | null;
  price_max?: Money | null;
  tickets_left?: number | null;
  layout_type?: EventLayoutType;
  featured?: boolean;
  is_featured?: boolean;
  rating_average?: number | null;
  ratings_count?: number;
  rating_count?: number;
  [key: string]: unknown;
}

export interface EventDetail extends EventListItem {
  description?: string | null;
  organizer?: EventOrganizerSummary;
  show_talents?: boolean;
  show_vendors?: boolean;
  talents?: EventTalentSummary[];
  vendors?: EventVendorSummary[];
  ticket_types?: TicketType[];
  gallery?: string[];
  venue_images?: string[];
  lat?: number | null;
  lng?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  video_url?: string | null;
  organizer_notes?: string | null;
  [key: string]: unknown;
}

export interface EventListQuery {
  keyword?: string;
  category?: string;
  city?: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  layout_type?: EventLayoutType;
  availability_only?: boolean;
  featured?: boolean;
  page?: number;
  per_page?: number;
}

export interface EventOccurrence {
  id: Id;
  event_id?: Id;
  date_start: Iso8601;
  date_end?: Iso8601 | null;
  status?: string;
  [key: string]: unknown;
}

export interface EventGalleryItem {
  id: Id;
  url: string;
  caption?: string | null;
  [key: string]: unknown;
}

export interface EventLineupItem {
  id: Id;
  talent?: EventTalentSummary;
  starts_at?: Iso8601 | null;
  ends_at?: Iso8601 | null;
  stage?: string | null;
  [key: string]: unknown;
}

export interface TicketType {
  id: Id;
  name: string;
  price: Money;
  remaining: number;
  description?: string | null;
  [key: string]: unknown;
}

export type SeatStatus = 'available' | 'held' | 'booked' | string;

export interface SeatRecord {
  id: Id;
  label: string;
  section?: string;
  row?: number | string;
  number?: number | string;
  ticket_type_id: Id;
  status: SeatStatus;
  position?: { x: number; y: number; z: number };
  price?: Money;
  [key: string]: unknown;
}

export interface SeatMap {
  seats: SeatRecord[];
  total: number;
  available: number;
  held: number;
  booked: number;
  [key: string]: unknown;
}

export interface EventRatingsSummary {
  average: number;
  count: number;
  ratings?: Array<{
    id: Id;
    user_name?: string;
    stars: number;
    comment?: string | null;
    created_at?: Iso8601;
  }>;
  [key: string]: unknown;
}
