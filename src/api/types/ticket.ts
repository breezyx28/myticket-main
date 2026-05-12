import type { Id, Iso8601, Money } from '@/api/types/common';

export type TicketStatus =
  | 'active'
  | 'auction'
  | 'gifted'
  | 'used'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | string;

/**
 * Main API ticket row (`GET /me/tickets`, `GET /me/tickets/{id}`).
 * List responses often use denormalized `*_cache` columns instead of `event_title` / `date_start`.
 */
export interface Ticket {
  id: Id;
  /** Public ticket code, e.g. `TIC-…`. */
  code?: string | null;
  order_id?: Id;
  order_item_id?: Id;
  order_reference?: string | null;
  holder_user_id?: Id;
  event_id: Id;
  occurrence_id?: Id | null;
  ticket_type_id: Id;
  seat_id?: Id | null;
  event_title?: string | null;
  event_title_cache?: string | null;
  venue?: string | null;
  venue_cache?: string | null;
  city?: string | null;
  city_cache?: string | null;
  date_start?: Iso8601 | null;
  starts_at_cache?: Iso8601 | null;
  date_end?: Iso8601 | null;
  ends_at_cache?: Iso8601 | null;
  status: TicketStatus;
  ticket_type_name?: string | null;
  type_name_cache?: string | null;
  seat_label?: string | null;
  seat_label_cache?: string | null;
  qr_payload?: string | null;
  qr_payload_hash?: string | null;
  qr_secret_hash?: string | null;
  qr_rotation_count?: number;
  /** Laravel-encrypted payload for gate scanners; encode in QR on detail view. */
  signed_qr_payload?: string | null;
  price_paid: Money;
  /** API may send `0` / `1`. */
  counts_for_overlap?: number | boolean;
  received_as_gift?: boolean | number;
  from_auction?: boolean | number;
  listed_auction_id?: Id | null;
  used_at?: Iso8601 | null;
  expired_at?: Iso8601 | null;
  cancelled_at?: Iso8601 | null;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface GiftTicketRequest {
  recipient: string;
  message?: string;
}

export interface RefundTicketRequest {
  reason?: string;
}

/**
 * `POST /me/tickets/check-overlap` lets the seat picker / cart warn the user
 * before they buy a ticket whose time window collides with one they already
 * own (frontend mock had this; the real endpoint mirrors the same idea).
 */
export interface OverlapCheckRequest {
  event_id: Id;
  ticket_type_id?: Id;
  event_start: Iso8601;
  event_end?: Iso8601;
}

export interface OverlapCheckHit {
  ticket_id: Id;
  event_id: Id;
  event_title: string;
  date_start: Iso8601;
  date_end?: Iso8601 | null;
  [key: string]: unknown;
}

export interface OverlapCheckResponse {
  has_overlap: boolean;
  conflicts: OverlapCheckHit[];
  [key: string]: unknown;
}

/**
 * `POST /me/tickets/{id}/cancel`. Backend distinguishes cancel-with-refund
 * from cancel-only via `refund_requested`; the response carries the resulting
 * ticket plus a refund summary when one was queued.
 */
export interface CancelTicketRequest {
  reason?: string;
  refund_requested?: boolean;
}

export interface CancelTicketResponse {
  ticket: Ticket;
  refund?: {
    id: Id;
    amount: Money;
    status: 'pending' | 'approved' | 'rejected' | string;
  } | null;
  [key: string]: unknown;
}
