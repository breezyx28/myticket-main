import type { Id, Iso8601, Money } from '@/api/types/common';

export type AuctionStatus = 'active' | 'sold' | 'cancelled' | 'expired' | string;

export interface AuctionListing {
  id: Id;
  /** Public listing code, e.g. `AUC-…`. */
  code?: string | null;
  event_id: Id;
  ticket_id?: Id | null;
  seller_user_id?: Id;
  seller_label?: string | null;
  sold_to_user_id?: Id | null;
  price: Money;
  original_price?: Money | null;
  sale_price?: Money | null;
  commission_pct?: Money | string | null;
  commission_amount?: Money | null;
  seller_proceeds?: Money | null;
  currency?: string | null;
  status?: AuctionStatus;
  starts_at?: Iso8601 | null;
  ends_at: Iso8601;
  sold_at?: Iso8601 | null;
  cancelled_at?: Iso8601 | null;
  cancellation_reason?: string | null;
  /** Denormalized fields from main API list/detail. */
  seat_label_cache?: string | null;
  event_title_cache?: string | null;
  city_cache?: string | null;
  venue_cache?: string | null;
  layout_type_cache?: string | null;
  ticket_type_cache?: string | null;
  /** Legacy / alternate names (some responses use non-cache keys). */
  event_title?: string | null;
  seat_label?: string | null;
  city?: string | null;
  venue?: string | null;
  layout_type?: 'seated' | 'free' | string;
  highest_bid?: Money | null;
  bids_count?: number;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface CreateAuctionRequest {
  ticket_id: Id;
  price: Money;
  ends_at: string;
}

export interface AuctionBid {
  id: Id;
  auction_id: Id;
  amount: Money;
  user_label?: string;
  created_at?: Iso8601;
  [key: string]: unknown;
}

export interface PlaceBidRequest {
  amount: Money;
}

export interface BuyNowRequest {
  payment_method?: string;
  saved_card_id?: Id | null;
  /** New-card path (gateway / backend may accept alongside `payment_method`). */
  cardholder?: string;
  card_number?: string;
  expiry?: string;
  cvv?: string;
  save_card?: boolean;
  [key: string]: unknown;
}

/**
 * `GET /auctions/stats`. Powers the auction landing's "X auctions for Y" and
 * "next ending in Z" badges. `by_event` is keyed by event id (string) and
 * holds the count of currently-active auctions; `nearest_end` mirrors the
 * keys with an ISO8601 timestamp of the soonest auction-end per event.
 */
export interface AuctionStatsResponse {
  by_event: Record<string, number>;
  nearest_end: Record<string, Iso8601>;
  [key: string]: unknown;
}
