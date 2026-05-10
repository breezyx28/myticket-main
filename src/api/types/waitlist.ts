import type { Id, Iso8601 } from '@/api/types/common';

export interface WaitlistEntry {
  id: Id;
  event_id: Id;
  event_slug?: string;
  event_title?: string;
  joined_at: Iso8601;
  [key: string]: unknown;
}
