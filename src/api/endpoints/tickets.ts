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
} from '@/api/types/ticket';

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
      providesTags: (_res, _err, arg) => [{ type: 'Ticket', id: arg.id }],
    }),
    giftTicket: build.mutation<AcknowledgementResponse, { id: Id; body: GiftTicketRequest }>({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/gift`,
        method: 'POST',
        body,
      }),
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
    cancelTicket: build.mutation<
      CancelTicketResponse,
      { id: Id; body?: CancelTicketRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/tickets/${id}/cancel`,
        method: 'POST',
        body: body ?? undefined,
      }),
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
} = ticketsApi;
