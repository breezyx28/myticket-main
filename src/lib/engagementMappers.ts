import type { Engagement, EngagementMessage } from '@/api/types/engagement';
import type {
  EngagementStatus,
  MockEngagement,
  MockEngagementMessage,
} from '@/types/domain';

const KNOWN_STATUSES = new Set<EngagementStatus>([
  'pending',
  'accepted',
  'declined',
  'completed',
  'cancelled',
]);

function toUiStatus(raw: Engagement['status'] | string | undefined): EngagementStatus {
  return KNOWN_STATUSES.has(raw as EngagementStatus) ? (raw as EngagementStatus) : 'pending';
}

function toUiSender(raw: EngagementMessage['sender']): MockEngagementMessage['sender'] {
  return raw === 'talent' ? 'talent' : 'organizer';
}

/**
 * Project an API `EngagementMessage` onto the legacy `MockEngagementMessage`
 * shape so the existing thread JSX keeps rendering. `body` becomes `text` and
 * non-`talent` senders collapse to `organizer` for the bubble alignment.
 */
export function apiEngagementMessageToMockMessage(
  m: EngagementMessage
): MockEngagementMessage {
  return {
    id: String(m.id),
    sender: toUiSender(m.sender),
    text: m.body ?? '',
    createdAt: m.created_at,
  };
}

/**
 * Project an API `Engagement` onto the legacy `MockEngagement` shape with
 * `organizerProfile` omitted (the API does not carry that block; the page
 * renders without it). Falls back to safe defaults so JSX does not need to
 * thread `?? ''` everywhere.
 */
export function apiEngagementToMockEngagement(e: Engagement): MockEngagement {
  return {
    id: String(e.id),
    organizerName: e.organizer_name?.trim() ? e.organizer_name : 'Organizer',
    organizerId: e.organizer_id != null ? String(e.organizer_id) : '',
    topic: e.topic ?? '',
    preview: e.preview ?? '',
    status: toUiStatus(e.status),
    createdAt: e.created_at,
    messages: (e.messages ?? []).map(apiEngagementMessageToMockMessage),
  };
}
