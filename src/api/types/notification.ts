import type { Id, Iso8601, Paginated, PaginationQuery } from '@/api/types/common';

export type NotificationKind =
  | 'order'
  | 'waitlist'
  | 'support'
  | 'gift'
  | 'general'
  | string;

export interface AppNotification {
  id: Id;
  title: string;
  body: string;
  kind: NotificationKind;
  read_at?: Iso8601 | null;
  href?: string | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

/**
 * `GET /me/notifications` accepts a `since` cursor so the bell icon can poll
 * incrementally; the paginator carries an `unread_count` envelope field used
 * by the badge.
 */
export interface NotificationListQuery extends PaginationQuery {
  since?: Iso8601;
  kind?: NotificationKind;
  unread?: boolean;
}

export type NotificationListResponse = Paginated<AppNotification> & {
  unread_count: number;
};

/**
 * `GET /me/notifications/stream`. The backend deliberately did NOT add
 * Server-Sent Events; this endpoint returns a guidance payload that tells
 * the SPA which transport to fall back on. Today that is always polling, but
 * keeping the shape a discriminated union lets us add SSE/WebSocket variants
 * without breaking the type.
 */
export interface NotificationStreamGuidance {
  transport: 'polling';
  message: string;
  since: Iso8601;
  poll_interval_seconds?: number;
  [key: string]: unknown;
}
