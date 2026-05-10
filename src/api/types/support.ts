import type { Id, Iso8601 } from '@/api/types/common';

export type SupportCategory =
  | 'technical'
  | 'ticket'
  | 'dispute_organizer'
  | 'account'
  | 'other'
  | string;

export type SupportCaseStatus = 'open' | 'pending' | 'closed' | 'resolved' | string;

export interface SupportCase {
  id: Id;
  category: SupportCategory;
  subject: string;
  order_reference?: string | null;
  status: SupportCaseStatus;
  last_message_at?: Iso8601 | null;
  created_at: Iso8601;
  messages?: SupportCaseMessage[];
  [key: string]: unknown;
}

export interface SupportCaseMessage {
  id: Id;
  case_id: Id;
  sender: 'user' | 'agent' | 'system' | string;
  body: string;
  attachment_url?: string | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

export interface CreateSupportCaseRequest {
  category: SupportCategory;
  subject: string;
  order_reference?: string;
  message: string;
}

export interface SupportCaseMessageRequest {
  body: string;
  attachment_url?: string;
}

export interface SupportChatStartRequest {
  topic?: string;
  initial_message?: string;
  [key: string]: unknown;
}

export interface SupportChatSession {
  id: Id;
  status: 'active' | 'idle' | 'promoted' | 'closed' | string;
  topic?: string | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

export interface SupportChatMessageRequest {
  body: string;
}

export interface SupportChatPromoteRequest {
  category?: SupportCategory;
  subject?: string;
}

/**
 * `GET /support/chat/{sessionId}` — full session view used to hydrate the
 * chat widget on reload. Includes the session metadata + the rolling
 * message log.
 */
export interface SupportChatMessage {
  id: Id;
  session_id: Id;
  sender: 'user' | 'agent' | 'bot' | 'system' | string;
  body: string;
  attachment_url?: string | null;
  created_at: Iso8601;
  [key: string]: unknown;
}

export interface SupportChatSessionDetail extends SupportChatSession {
  messages: SupportChatMessage[];
  promoted_case_id?: Id | null;
}
