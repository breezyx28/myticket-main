import { baseApi } from '@/api/baseApi';
import type { Id, PaginationQuery } from '@/api/types/common';
import type { FavoritesListResponse, ToggleFavoriteResponse } from '@/api/types/favorite';

export const favoritesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMyFavorites: build.query<FavoritesListResponse, PaginationQuery | void>({
      query: (params) => ({ url: '/me/favorites', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((f) => ({ type: 'Favorite' as const, id: f.id })),
              { type: 'Favorite' as const, id: 'LIST' },
            ]
          : [{ type: 'Favorite' as const, id: 'LIST' }],
    }),
    /**
     * Idempotent toggle: backend looks at the current state of the (user,
     * event) pair and writes the opposite. The response carries the new
     * state so the heart icon hydrates without an extra round-trip.
     */
    toggleFavorite: build.mutation<ToggleFavoriteResponse, { eventId: Id }>({
      query: ({ eventId }) => ({
        url: `/me/favorites/${eventId}`,
        method: 'PUT',
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Favorite', id: arg.eventId },
        { type: 'Favorite', id: 'LIST' },
      ],
    }),
  }),
});

export const { useListMyFavoritesQuery, useToggleFavoriteMutation } = favoritesApi;
