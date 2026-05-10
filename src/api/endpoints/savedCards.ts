import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type { SavedCard } from '@/api/types/savedCard';

export const savedCardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSavedCards: build.query<Paginated<SavedCard> | SavedCard[], PaginationQuery | void>({
      query: (params) => ({ url: '/me/saved-cards', params: params ?? undefined }),
      providesTags: [{ type: 'SavedCard', id: 'LIST' }],
    }),
    deleteSavedCard: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/saved-cards/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SavedCard', id: 'LIST' }],
    }),
  }),
});

export const { useListSavedCardsQuery, useDeleteSavedCardMutation } = savedCardsApi;
