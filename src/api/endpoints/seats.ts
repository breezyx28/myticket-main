import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Slug } from '@/api/types/common';
import type {
  CurrentSeatLockEnvelope,
  CurrentSeatLockResponse,
  ExtendSeatLockRequest,
  SeatLock,
  SeatLockRequest,
} from '@/api/types/seat';

export const seatsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createSeatLock: build.mutation<SeatLock, { slug: Slug; body: SeatLockRequest }>({
      query: ({ slug, body }) => ({
        url: `/events/${encodeURIComponent(slug)}/seats/lock`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'EventSeats', id: arg.slug },
        { type: 'SeatLock', id: 'LIST' },
      ],
    }),
    releaseSeatLock: build.mutation<AcknowledgementResponse, { slug: Slug; lockId: Id }>({
      query: ({ slug, lockId }) => ({
        url: `/events/${encodeURIComponent(slug)}/seats/lock/${lockId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'EventSeats', id: arg.slug },
        { type: 'SeatLock', id: arg.lockId },
      ],
    }),
    extendSeatLock: build.mutation<
      SeatLock,
      { slug: Slug; lockId: Id; body?: ExtendSeatLockRequest }
    >({
      query: ({ slug, lockId, body }) => ({
        url: `/events/${encodeURIComponent(slug)}/seats/lock/${lockId}/extend`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'SeatLock', id: arg.lockId }],
    }),
    /**
     * Reads the caller's currently-active seat lock for an event. Backend
     * returns `200 { data: SeatLock }` when there is one and `204 No Content`
     * when there is none; we collapse the 204 case to `null` so consumers can
     * destructure a single union shape.
     */
    getCurrentSeatLock: build.query<CurrentSeatLockResponse, { slug: Slug }>({
      query: ({ slug }) => ({
        url: `/events/${encodeURIComponent(slug)}/seats/lock`,
        responseHandler: async (response) => {
          if (response.status === 204) return null;
          const text = await response.text();
          if (!text) return null;
          return JSON.parse(text) as CurrentSeatLockEnvelope;
        },
      }),
      providesTags: (result, _err, arg) =>
        result && 'data' in result
          ? [{ type: 'SeatLock', id: result.data.id }, { type: 'EventSeats', id: arg.slug }]
          : [{ type: 'SeatLock', id: 'LIST' }, { type: 'EventSeats', id: arg.slug }],
    }),
  }),
});

export const {
  useCreateSeatLockMutation,
  useReleaseSeatLockMutation,
  useExtendSeatLockMutation,
  useGetCurrentSeatLockQuery,
  useLazyGetCurrentSeatLockQuery,
} = seatsApi;
