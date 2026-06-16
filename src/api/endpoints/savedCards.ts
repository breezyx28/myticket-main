import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type { SavedCard } from '@/api/types/savedCard';
import { normalizeSavedCard, normalizeSavedCardsResponse } from '@/lib/savedCardMappers';

export const savedCardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSavedCards: build.query<Paginated<SavedCard> | SavedCard[], PaginationQuery | void>({
      query: (params) => ({ url: '/me/saved-cards', params: params ?? undefined }),
      transformResponse: (response: unknown) => normalizeSavedCardsResponse(response),
      providesTags: [{ type: 'SavedCard', id: 'LIST' }],
    }),
    updateSavedCardDefault: build.mutation<SavedCard, { id: Id }>({
      query: ({ id }) => ({
        url: `/me/saved-cards/${id}`,
        method: 'PATCH',
        body: { is_default: true },
      }),
      transformResponse: (response: unknown) => normalizeSavedCard(response),
      invalidatesTags: [{ type: 'SavedCard', id: 'LIST' }],
    }),
    deleteSavedCard: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/saved-cards/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SavedCard', id: 'LIST' }],
    }),
  }),
});

export const {
  useListSavedCardsQuery,
  useUpdateSavedCardDefaultMutation,
  useDeleteSavedCardMutation,
} = savedCardsApi;
