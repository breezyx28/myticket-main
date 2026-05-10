import { baseApi } from '@/api/baseApi';
import type { Id } from '@/api/types/common';
import type { Gift, GiftListQuery, GiftListResponse } from '@/api/types/gift';

export const giftsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listGifts: build.query<GiftListResponse, GiftListQuery | void>({
      query: (params) => ({ url: '/me/gifts', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((g) => ({ type: 'Gift' as const, id: g.id })),
              { type: 'GiftInbox' as const, id: 'LIST' },
            ]
          : [{ type: 'GiftInbox' as const, id: 'LIST' }],
    }),
    claimGift: build.mutation<Gift, { id: Id }>({
      query: ({ id }) => ({ url: `/me/gifts/${id}/claim`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Gift', id: arg.id },
        { type: 'GiftInbox', id: 'LIST' },
        'Ticket',
      ],
    }),
  }),
});

export const { useListGiftsQuery, useClaimGiftMutation } = giftsApi;
