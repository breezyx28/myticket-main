import type { Id, Iso8601 } from '@/api/types/common';

export interface SeatLockRequest {
  ticket_type_id: Id;
  seat_ids: Id[];
  ttl_seconds?: number;
}

export interface SeatLock {
  id: Id;
  event_slug?: string;
  ticket_type_id: Id;
  seat_ids: Id[];
  expires_at: Iso8601;
  [key: string]: unknown;
}

export interface ExtendSeatLockRequest {
  ttl_seconds?: number;
}

/**
 * `GET /events/{slug}/seats/lock`. Returns either an envelope around the
 * caller's active lock or `null` when the call returned `204 No Content`
 * (no lock yet). The endpoint module does the 204 → null bridging so callers
 * always destructure a single shape.
 */
export interface CurrentSeatLockEnvelope {
  data: SeatLock;
}

export type CurrentSeatLockResponse = CurrentSeatLockEnvelope | null;
