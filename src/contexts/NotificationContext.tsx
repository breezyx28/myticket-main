import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useGetNotificationsStreamQuery,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/api/endpoints';
import { getSessionUserFromMeta } from '@/api/authToken';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';
import { apiNotificationToMockNotification } from '@/lib/notificationMappers';

export type MockNotificationKind = 'order' | 'waitlist' | 'support' | 'gift' | 'general';

export interface MockNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  kind: MockNotificationKind;
  /** Optional in-app path for "View" actions */
  href?: string;
}

/** Default cadence used when the stream-guidance endpoint is unavailable. */
const DEFAULT_POLL_INTERVAL_MS = 30_000;

/** Local-only optimistic entries are pruned after this lifetime. */
const LOCAL_ENTRY_TTL_MS = 60_000;

type NotificationContextValue = {
  items: MockNotification[];
  unreadCount: number;
  pushNotification: (
    n: Omit<MockNotification, 'id' | 'read' | 'createdAt'> & { id?: string }
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isHydrating } = useAuth();
  const isAuthenticated = Boolean(user);
  const userId = getSessionUserFromMeta()?.id ?? null;

  const { data: streamGuidance, isLoading: streamGuidanceLoading } = useGetNotificationsStreamQuery(undefined, {
    skip: !isAuthenticated,
  });

  const fallbackPollIntervalMs = useMemo(() => {
    const seconds = streamGuidance?.poll_interval_seconds;
    if (typeof seconds === 'number' && seconds > 0) {
      return Math.max(seconds * 1000, 30_000);
    }
    return DEFAULT_POLL_INTERVAL_MS;
  }, [streamGuidance]);

  const { usePollingFallback } = useNotificationRealtime({
    enabled: isAuthenticated && !isHydrating,
    userId,
    streamGuidance,
  });

  const pollingInterval = usePollingFallback ? fallbackPollIntervalMs : 0;

  const { data: paged } = useListNotificationsQuery(
    { per_page: 30 },
    { skip: !isAuthenticated || streamGuidanceLoading, pollingInterval },
  );

  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation();

  const [localItems, setLocalItems] = useState<MockNotification[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocalItems([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!paged) return;
    const ttl = Math.max(pollingInterval || fallbackPollIntervalMs, LOCAL_ENTRY_TTL_MS);
    const now = Date.now();
    setLocalItems((prev) => {
      const next = prev.filter((entry) => {
        const created = new Date(entry.createdAt).getTime();
        if (Number.isNaN(created)) return false;
        return now - created < ttl;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [paged, pollingInterval, fallbackPollIntervalMs]);

  const apiItems = useMemo<MockNotification[]>(() => {
    if (!paged?.data) return [];
    return paged.data.map(apiNotificationToMockNotification);
  }, [paged]);

  const items = useMemo<MockNotification[]>(() => {
    if (localItems.length === 0) return apiItems;
    const apiIds = new Set(apiItems.map((x) => x.id));
    const dedupedLocal = localItems.filter((x) => !apiIds.has(x.id));
    return [...dedupedLocal, ...apiItems];
  }, [apiItems, localItems]);

  const unreadCount = useMemo(() => {
    const apiUnread = paged?.unread_count ?? 0;
    const apiIds = new Set(apiItems.map((x) => x.id));
    const localUnread = localItems.filter((x) => !x.read && !apiIds.has(x.id)).length;
    return apiUnread + localUnread;
  }, [paged, apiItems, localItems]);

  const pushNotification = useCallback<NotificationContextValue['pushNotification']>(
    (n) => {
      const id = n.id ?? `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const entry: MockNotification = {
        ...n,
        id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setLocalItems((prev) => [entry, ...prev]);
    },
    [],
  );

  const markRead = useCallback(
    (id: string) => {
      const isLocal = localItems.some((x) => x.id === id);
      if (isLocal) {
        setLocalItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, read: true } : x)),
        );
        return;
      }
      void markNotificationRead({ id }).unwrap().catch(() => {
        /* keep UI state; the next refetch will resync. */
      });
    },
    [localItems, markNotificationRead],
  );

  const markAllRead = useCallback(() => {
    setLocalItems((prev) => prev.map((x) => ({ ...x, read: true })));
    if (!isAuthenticated) return;
    void markAllNotificationsRead().unwrap().catch(() => {
      /* swallow; next refetch resyncs. */
    });
  }, [isAuthenticated, markAllNotificationsRead]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount,
      pushNotification,
      markRead,
      markAllRead,
    }),
    [items, unreadCount, pushNotification, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
