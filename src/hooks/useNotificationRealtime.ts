import { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '@/api/endpoints/notifications';
import type { NotificationStreamGuidance } from '@/api/types/notification';
import { isReverbStreamGuidance } from '@/api/types/notification';
import { getToken } from '@/api/authToken';
import {
  createEcho,
  disconnectEcho,
  getEcho,
  isReverbConfigured,
} from '@/lib/realtime/echo';
import { useAppDispatch } from '@/store/hooks';

type UseNotificationRealtimeOptions = {
  enabled: boolean;
  userId: string | number | null | undefined;
  streamGuidance: NotificationStreamGuidance | undefined;
};

type UseNotificationRealtimeResult = {
  /** Reverb socket is connected and the user channel is subscribed. */
  reverbActive: boolean;
  /** Use HTTP polling because transport is polling or Reverb failed. */
  usePollingFallback: boolean;
};

function bindPusherConnection(
  echo: NonNullable<ReturnType<typeof getEcho>>,
  handlers: {
    onConnected: () => void;
    onDisconnected: () => void;
  },
): () => void {
  const pusher = echo.connector?.pusher;
  if (!pusher?.connection) return () => undefined;

  pusher.connection.bind('connected', handlers.onConnected);
  pusher.connection.bind('disconnected', handlers.onDisconnected);
  pusher.connection.bind('unavailable', handlers.onDisconnected);
  pusher.connection.bind('failed', handlers.onDisconnected);

  return () => {
    pusher.connection.unbind('connected', handlers.onConnected);
    pusher.connection.unbind('disconnected', handlers.onDisconnected);
    pusher.connection.unbind('unavailable', handlers.onDisconnected);
    pusher.connection.unbind('failed', handlers.onDisconnected);
  };
}

export function useNotificationRealtime({
  enabled,
  userId,
  streamGuidance,
}: UseNotificationRealtimeOptions): UseNotificationRealtimeResult {
  const dispatch = useAppDispatch();
  const [reverbActive, setReverbActive] = useState(false);
  const [usePollingFallback, setUsePollingFallback] = useState(true);
  const channelRef = useRef<string | null>(null);

  const shouldUseReverb =
    enabled &&
    userId != null &&
    isReverbStreamGuidance(streamGuidance) &&
    isReverbConfigured();

  useEffect(() => {
    if (!shouldUseReverb) {
      setReverbActive(false);
      setUsePollingFallback(true);
      disconnectEcho();
      channelRef.current = null;
      return;
    }

    const token = getToken();
    if (!token) {
      setReverbActive(false);
      setUsePollingFallback(true);
      return;
    }

    let cancelled = false;
    const channelName = `user.${userId}`;

    const reconcile = () => {
      if (cancelled) return;
      dispatch(notificationsApi.util.invalidateTags([{ type: 'Notification', id: 'LIST' }]));
    };

    const onNotificationCreated = () => {
      reconcile();
    };

    const subscribe = () => {
      if (cancelled) return;

      const existing = getEcho();
      const echo = existing ?? createEcho(token);

      if (channelRef.current && channelRef.current !== channelName) {
        echo.leave(channelRef.current);
      }

      echo.private(channelName).listen('.notification.created', onNotificationCreated);
      channelRef.current = channelName;

      const pusher = echo.connector?.pusher;
      if (pusher?.connection?.state === 'connected') {
        setReverbActive(true);
        setUsePollingFallback(false);
      }
    };

    subscribe();

    const echo = getEcho();
    const unbindConnection = echo
      ? bindPusherConnection(echo, {
          onConnected: () => {
            if (cancelled) return;
            setReverbActive(true);
            setUsePollingFallback(false);
            reconcile();
          },
          onDisconnected: () => {
            if (cancelled) return;
            setReverbActive(false);
            setUsePollingFallback(true);
          },
        })
      : () => undefined;

    return () => {
      cancelled = true;
      unbindConnection();
      const activeEcho = getEcho();
      if (activeEcho && channelRef.current) {
        activeEcho.leave(channelRef.current);
      }
      channelRef.current = null;
      disconnectEcho();
      setReverbActive(false);
      setUsePollingFallback(true);
    };
  }, [shouldUseReverb, userId, streamGuidance, dispatch]);

  return { reverbActive, usePollingFallback };
}
