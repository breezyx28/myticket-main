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

export interface Ticket {
  id: Id;
  event_id: Id;
  event_title: string;
  venue?: string | null;
  city?: string | null;
  date_start: Iso8601;
  date_end?: Iso8601 | null;
  status: TicketStatus;
  ticket_type_id: Id;
  ticket_type_name?: string;
  seat_label?: string | null;
  order_reference?: string;
  qr_payload?: string | null;
  price_paid: Money;
  received_as_gift?: boolean;
  from_auction?: boolean;
  listed_auction_id?: Id | null;
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
  date_start: Iso8601;
  date_end?: Iso8601;
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
