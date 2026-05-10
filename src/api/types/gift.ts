import type { Id, Iso8601, Paginated } from '@/api/types/common';
import type { Ticket } from '@/api/types/ticket';

export type GiftStatus = 'pending' | 'claimed' | 'expired' | string;

export interface Gift {
  id: Id;
  ticket?: Ticket;
  sender?: { id: Id; name: string } | null;
  recipient?: { id: Id; name: string } | null;
  status: GiftStatus;
  message?: string | null;
  expires_at?: Iso8601 | null;
  claimed_at?: Iso8601 | null;
  created_at?: Iso8601;
  [key: string]: unknown;
}

/**
 * `GET /me/gifts` — inbox listing. The card shape omits the deep `ticket`
 * payload; callers who need the full ticket should claim it first and read it
 * back from `/me/tickets`.
 */
export interface GiftListItem {
  id: Id;
  status: GiftStatus;
  sender_name?: string | null;
  event_title?: string | null;
  event_cover_url?: string | null;
  message?: string | null;
  expires_at?: Iso8601 | null;
  claimed_at?: Iso8601 | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

export type GiftListResponse = Paginated<GiftListItem>;

export interface GiftListQuery {
  page?: number;
  per_page?: number;
  status?: GiftStatus;
}
