import type { Id, Iso8601, Paginated } from '@/api/types/common';

export type TourismAdWeekday =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type TourismAdStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export type TourismAdSource = 'guest' | 'admin';

export interface TourismAdDayHours {
  closed: boolean;
  opens?: string;
  closes?: string;
}

export type TourismAdOpeningHours = Record<TourismAdWeekday, TourismAdDayHours>;

export interface TourismAdContact {
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
}

export interface TourismAdMediaLink {
  platform: string;
  url: string;
}

export interface TourismAdCarouselItem {
  id: Id;
  location_name: string;
  latitude: string;
  longitude: string;
  description: string;
  services: string[];
  opening_hours: TourismAdOpeningHours;
  contact: TourismAdContact;
  media_links: TourismAdMediaLink[];
  gallery_urls: string[];
  cover_image_url: string | null;
  visibility_starts_at: Iso8601 | null;
  visibility_ends_at: Iso8601 | null;
  published_at: Iso8601 | null;
  is_pinned: boolean;
}

export interface TourismAdUserRef {
  id: Id;
  full_name: string;
  email: string;
}

export interface TourismAdDetail extends TourismAdCarouselItem {
  status: TourismAdStatus;
  user_id?: Id | null;
  created_by_user_id?: Id | null;
  reviewed_by_user_id?: Id | null;
  source?: TourismAdSource;
  rejection_reason?: string | null;
  carousel_position?: number | null;
  submitted_at?: Iso8601 | null;
  reviewed_at?: Iso8601 | null;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  user?: TourismAdUserRef | null;
  created_by?: TourismAdUserRef | null;
  reviewed_by?: TourismAdUserRef | null;
}

export interface TourismAdDetailEnvelope {
  data: TourismAdDetail;
}

export interface TourismAdCarouselEnvelope {
  data: TourismAdCarouselItem[];
}

export type MyTourismAdsPage = Paginated<TourismAdDetail>;

export interface MyTourismAdsQuery {
  status?: TourismAdStatus;
  page?: number;
  per_page?: number;
}

export interface CreateTourismAdRequest {
  location_name?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  opening_hours?: Partial<TourismAdOpeningHours>;
  services?: string[];
  contact?: TourismAdContact;
  media_links?: TourismAdMediaLink[];
  gallery_urls?: string[];
  visibility_starts_at?: Iso8601 | null;
  visibility_ends_at?: Iso8601 | null;
}

export type UpdateTourismAdRequest = CreateTourismAdRequest;

export interface UploadFileResponse {
  url: string;
  content_type: string;
  size_bytes: number;
}

export interface UploadFileEnvelope {
  data: UploadFileResponse;
}
