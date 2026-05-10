import type { Id, Iso8601 } from '@/api/types/common';

export type EngagementStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | string;

export interface EngagementMessage {
  id: Id;
  engagement_id: Id;
  sender: 'organizer' | 'talent' | 'vendor' | 'system' | string;
  body: string;
  attachment_url?: string | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

export interface Engagement {
  id: Id;
  organizer_id?: Id;
  organizer_name?: string;
  talent_id?: Id | null;
  vendor_id?: Id | null;
  topic?: string | null;
  preview?: string | null;
  status: EngagementStatus;
  created_at: Iso8601;
  updated_at?: Iso8601;
  messages?: EngagementMessage[];
  [key: string]: unknown;
}

export interface PostEngagementMessageRequest {
  body: string;
  attachment_url?: string;
}

/**
 * `POST /me/engagements`. Used by the "contact this talent / vendor" CTA on
 * a profile page to start a fresh thread. Backend wires the caller as the
 * organizer side of the engagement automatically.
 */
export type EngagementTargetType = 'talent' | 'vendor';

export interface CreateEngagementRequest {
  target_type: EngagementTargetType;
  target_id: Id;
  topic: string;
  initial_message?: string;
  [key: string]: unknown;
}
