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

function seatIdsFromLockRows(locks: unknown[]): Id[] {
  const ids: Id[] = [];
  for (const row of locks) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (r.seat_id != null) ids.push(r.seat_id as Id);
    if (Array.isArray(r.seat_ids)) ids.push(...(r.seat_ids as Id[]));
  }
  return ids;
}

/** Normalize lock payloads: legacy `{ data }`, flat `SeatLock`, or `{ lock_id, locks[] }`. */
export function unwrapSeatLock(raw: unknown): SeatLock {
  if (!raw || typeof raw !== 'object') return raw as SeatLock;
  const r = raw as Record<string, unknown>;

  if ('data' in r && r.data && typeof r.data === 'object') {
    return unwrapSeatLock(r.data);
  }

  const lockId = (r.lock_id ?? r.id) as Id | undefined;
  const locks = Array.isArray(r.locks) ? r.locks : [];
  const seatIdsFromLocks = seatIdsFromLockRows(locks);
  const seat_ids = (
    seatIdsFromLocks.length > 0
      ? seatIdsFromLocks
      : Array.isArray(r.seat_ids)
        ? (r.seat_ids as Id[])
        : []
  ) as Id[];

  const firstLock =
    locks[0] && typeof locks[0] === 'object' ? (locks[0] as Record<string, unknown>) : null;
  const ticket_type_id = (r.ticket_type_id ?? firstLock?.ticket_type_id) as Id | undefined;

  if (lockId != null) {
    return {
      ...(r as SeatLock),
      id: lockId,
      lock_id: lockId,
      seat_ids,
      expires_at: String(r.expires_at ?? ''),
      ...(ticket_type_id != null ? { ticket_type_id } : {}),
    };
  }

  return raw as SeatLock;
}

if (import.meta.env.DEV) {
  const normalized = unwrapSeatLock({
    lock_id: 12,
    expires_at: '2026-06-24T19:30:00+00:00',
    locks: [{ seat_id: 1, ticket_type_id: 2 }, { seat_id: 3, ticket_type_id: 2 }],
  });
  if (normalized.id !== 12 || normalized.seat_ids.length !== 2) {
    console.warn('[seats] unwrapSeatLock self-check failed:', normalized);
  }
}

export const seatsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createSeatLock: build.mutation<SeatLock, { slug: Slug; body: SeatLockRequest }>({
      query: ({ slug, body }) => ({
        url: `/events/${encodeURIComponent(slug)}/seats/lock`,
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapSeatLock(raw),
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
      transformResponse: (raw: unknown) => unwrapSeatLock(raw),
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
          const parsed: unknown = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && 'data' in parsed) {
            return parsed as CurrentSeatLockEnvelope;
          }
          return { data: unwrapSeatLock(parsed) };
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
