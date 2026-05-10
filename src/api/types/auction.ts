import type { Id, Iso8601, Money } from '@/api/types/common';

export type AuctionStatus = 'active' | 'sold' | 'cancelled' | 'expired' | string;

export interface AuctionListing {
  id: Id;
  event_id: Id;
  event_title?: string;
  ticket_id?: Id | null;
  price: Money;
  original_price?: Money;
  highest_bid?: Money | null;
  bids_count?: number;
  ends_at: Iso8601;
  seat_label?: string | null;
  seller_label?: string;
  city?: string | null;
  venue?: string | null;
  layout_type?: 'seated' | 'free' | string;
  status?: AuctionStatus;
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
