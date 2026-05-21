import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type {
  CancelTicketRequest,
  CancelTicketResponse,
  GiftTicketRequest,
  OverlapCheckRequest,
  OverlapCheckResponse,
  RefundTicketRequest,
  Ticket,
  ValidateTicketQrRequest,
  ValidateTicketQrResponse,
} from '@/api/types/ticket';

/** Laravel may wrap a single ticket as `{ data: Ticket }`. */
function unwrapTicketResponse(raw: unknown): Ticket {
  let payload: unknown = raw;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (inner != null && typeof inner === 'object') payload = inner;
  }
  return payload as Ticket;
}

function unwrapDataKey<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function unwrapCancelTicketResponse(raw: unknown): CancelTicketResponse {
  const r = unwrapDataKey<CancelTicketResponse>(raw);
  return {
    ...r,
    ticket: r.ticket ? unwrapTicketResponse(r.ticket as unknown) : r.ticket,
  };
}

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMyTickets: build.query<Paginated<Ticket>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/tickets', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((t) => ({ type: 'Ticket' as const, id: t.id })),
              { type: 'Ticket' as const, id: 'LIST' },
            ]
          : [{ type: 'Ticket' as const, id: 'LIST' }],
    }),
    getMyTicket: build.query<Ticket, { id: Id }>({
      query: ({ id }) => ({ url: `/me/tickets/${id}` }),
      transformResponse: unwrapTicketResponse,
      providesTags: (_res, _err, arg) => [{ type: 'Ticket', id: arg.id }],
    }),
    giftTicket: build.mutation<AcknowledgementResponse, { id: Id; body: GiftTicketRequest }>({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/gift`,
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapDataKey<AcknowledgementResponse>(raw),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Ticket', id: arg.id },
        { type: 'Ticket', id: 'LIST' },
        'Gift',
      ],
    }),
    refundTicket: build.mutation<
      AcknowledgementResponse,
      { id: Id; body?: RefundTicketRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/refund`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Ticket', id: arg.id },
        { type: 'Ticket', id: 'LIST' },
      ],
    }),
    checkTicketOverlap: build.mutation<OverlapCheckResponse, OverlapCheckRequest>({
      query: (body) => ({
        url: '/me/tickets/check-overlap',
        method: 'POST',
        body,
      }),
    }),
    validateTicketQr: build.mutation<
      ValidateTicketQrResponse,
      { id: Id; body: ValidateTicketQrRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/validate`,
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapDataKey<ValidateTicketQrResponse>(raw),
    }),
    cancelTicket: build.mutation<
      CancelTicketResponse,
      { id: Id; body?: CancelTicketRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/cancel`,
        method: 'POST',
        body: body ?? undefined,
      }),
      transformResponse: unwrapCancelTicketResponse,
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Ticket', id: arg.id },
        { type: 'Ticket', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListMyTicketsQuery,
  useGetMyTicketQuery,
  useGiftTicketMutation,
  useRefundTicketMutation,
  useCheckTicketOverlapMutation,
  useCancelTicketMutation,
  useValidateTicketQrMutation,
} = ticketsApi;
