import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id } from '@/api/types/common';
import type {
  CreateRatingRequest,
  MyRatingsQuery,
  MyRatingsResponse,
  Rating,
  UpdateRatingRequest,
} from '@/api/types/rating';

export const ratingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitRating: build.mutation<Rating, CreateRatingRequest>({
      query: (body) => ({ url: '/ratings', method: 'POST', body }),
      invalidatesTags: ['Rating', 'MyRating', 'EventRating'],
    }),
    listMyRatings: build.query<MyRatingsResponse, MyRatingsQuery>({
      query: (params) => ({ url: '/me/ratings', params }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((r) => ({ type: 'Rating' as const, id: r.id })),
              { type: 'MyRating' as const, id: 'LIST' },
            ]
          : [{ type: 'MyRating' as const, id: 'LIST' }],
    }),
    updateMyRating: build.mutation<Rating, { id: Id; body: UpdateRatingRequest }>({
      query: ({ id, body }) => ({ url: `/me/ratings/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Rating', id: arg.id },
        { type: 'MyRating', id: 'LIST' },
        'EventRating',
      ],
    }),
    deleteMyRating: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/ratings/${id}`, method: 'DELETE' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Rating', id: arg.id },
        { type: 'MyRating', id: 'LIST' },
        'EventRating',
      ],
    }),
  }),
});

export const {
  useSubmitRatingMutation,
  useListMyRatingsQuery,
  useUpdateMyRatingMutation,
  useDeleteMyRatingMutation,
} = ratingsApi;
