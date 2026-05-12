import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type {
  CancelOrderRequest,
  ConfirmOrderPaymentRequest,
  CreateOrderRequest,
  Order,
} from '@/api/types/order';

type OrderPayload = Order & { order_id?: Id };

/**
 * Laravel often wraps resources as `{ data: Order }`. Some payloads use
 * `order_id` instead of `id`. Collapse to a single `Order` so callers always
 * read `order.id` (e.g. `POST /orders/{id}/confirm-payment`).
 */
function unwrapOrderResponse(raw: unknown): Order {
  let payload: unknown = raw;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (inner != null && typeof inner === 'object') payload = inner;
  }
  if (payload && typeof payload === 'object' && 'order' in payload) {
    const inner = (payload as { order: unknown }).order;
    if (inner != null && typeof inner === 'object') payload = inner;
  }
  const o = payload as OrderPayload;
  const id = (o.id ?? o.order_id) as Id | undefined;
  if (id == null) {
    return o as Order;
  }
  return { ...o, id };
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createOrder: build.mutation<Order, CreateOrderRequest>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      transformResponse: unwrapOrderResponse,
      invalidatesTags: ['Order', 'Ticket', 'SavedCard'],
    }),
    getOrder: build.query<Order, { id: Id }>({
      query: ({ id }) => ({ url: `/orders/${id}` }),
      transformResponse: unwrapOrderResponse,
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
      transformResponse: unwrapOrderResponse,
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Order', id: arg.id },
        'Ticket',
        'SavedCard',
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
