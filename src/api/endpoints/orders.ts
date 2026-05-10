import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type {
  CancelOrderRequest,
  ConfirmOrderPaymentRequest,
  CreateOrderRequest,
  Order,
} from '@/api/types/order';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createOrder: build.mutation<Order, CreateOrderRequest>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: ['Order', 'Ticket'],
    }),
    getOrder: build.query<Order, { id: Id }>({
      query: ({ id }) => ({ url: `/orders/${id}` }),
      providesTags: (_res, _err, arg) => [{ type: 'Order', id: arg.id }],
    }),
    confirmOrderPayment: build.mutation<
      Order,
      { id: Id; body?: ConfirmOrderPaymentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/orders/${id}/confirm-payment`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Order', id: arg.id },
        'Ticket',
      ],
    }),
    cancelOrder: build.mutation<AcknowledgementResponse, { id: Id; body?: CancelOrderRequest }>({
      query: ({ id, body }) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Order', id: arg.id }, 'Ticket'],
    }),
    listMyOrders: build.query<Paginated<Order>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/orders', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((o) => ({ type: 'Order' as const, id: o.id })),
              { type: 'Order' as const, id: 'LIST' },
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderQuery,
  useConfirmOrderPaymentMutation,
  useCancelOrderMutation,
  useListMyOrdersQuery,
} = ordersApi;
