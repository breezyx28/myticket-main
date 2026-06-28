import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, ResourceEnvelope } from '@/api/types/common';
import type {
  NotificationListQuery,
  NotificationListResponse,
  NotificationStreamGuidance,
} from '@/api/types/notification';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from '@/api/types/user';

function unwrapNotificationStreamGuidance(response: unknown): NotificationStreamGuidance {
  const maybe = response as ResourceEnvelope<NotificationStreamGuidance> | NotificationStreamGuidance;
  if (maybe && typeof maybe === 'object' && 'data' in maybe && maybe.data != null) {
    return maybe.data as NotificationStreamGuidance;
  }
  return maybe as NotificationStreamGuidance;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<NotificationListResponse, NotificationListQuery | void>({
      query: (params) => ({ url: '/me/notifications', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((n) => ({ type: 'Notification' as const, id: n.id })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    /**
     * Returns the polling-guidance payload (no SSE yet). The bell widget
     * reads `transport` + `poll_interval_seconds` to decide its retry cadence
     * and uses `since` as the cursor for the next `listNotifications` call.
     */
    getNotificationsStream: build.query<NotificationStreamGuidance, void>({
      query: () => ({ url: '/me/notifications/stream' }),
      transformResponse: (response: unknown) => unwrapNotificationStreamGuidance(response),
    }),
    markNotificationRead: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({
        url: `/me/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Notification', id: arg.id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    markAllNotificationsRead: build.mutation<AcknowledgementResponse, void>({
      query: () => ({ url: '/me/notifications/read-all', method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getNotificationPreferences: build.query<NotificationPreferences, void>({
      query: () => ({ url: '/me/notifications/preferences' }),
      providesTags: ['NotificationPrefs'],
    }),
    updateNotificationPreferences: build.mutation<
      NotificationPreferences,
      UpdateNotificationPreferencesRequest
    >({
      query: (body) => ({
        url: '/me/notifications/preferences',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['NotificationPrefs'],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetNotificationsStreamQuery,
  useLazyGetNotificationsStreamQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = notificationsApi;
