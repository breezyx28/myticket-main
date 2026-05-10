import type { AppNotification } from '@/api/types/notification';
import type { MockNotification, MockNotificationKind } from '@/contexts/NotificationContext';

const KNOWN_KINDS = new Set<MockNotificationKind>([
  'order',
  'waitlist',
  'support',
  'gift',
  'general',
]);

function toUiKind(raw: AppNotification['kind']): MockNotificationKind {
  return KNOWN_KINDS.has(raw as MockNotificationKind)
    ? (raw as MockNotificationKind)
    : 'general';
}

/**
 * Project an API `AppNotification` onto the legacy `MockNotification` shape so
 * the bell-dropdown JSX in `Navbar.tsx` keeps rendering. `read` is derived
 * from `read_at` (any non-null timestamp counts as read), unknown kinds fall
 * back to `'general'`, and `href` is normalised to `undefined` instead of
 * `null` so React-Router `<Link>` does not receive a null target.
 */
export function apiNotificationToMockNotification(n: AppNotification): MockNotification {
  return {
    id: String(n.id),
    title: n.title,
    body: n.body,
    read: n.read_at != null,
    createdAt: n.created_at,
    kind: toUiKind(n.kind),
    href: n.href ?? undefined,
  };
}
