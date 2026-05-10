import { baseApi } from '@/api/baseApi';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type {
  CreateEngagementRequest,
  Engagement,
  EngagementMessage,
  PostEngagementMessageRequest,
} from '@/api/types/engagement';

export const engagementsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listEngagements: build.query<Paginated<Engagement>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/engagements', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((e) => ({ type: 'Engagement' as const, id: e.id })),
              { type: 'Engagement' as const, id: 'LIST' },
            ]
          : [{ type: 'Engagement' as const, id: 'LIST' }],
    }),
    createEngagement: build.mutation<Engagement, CreateEngagementRequest>({
      query: (body) => ({ url: '/me/engagements', method: 'POST', body }),
      invalidatesTags: [{ type: 'Engagement', id: 'LIST' }],
    }),
    acceptEngagement: build.mutation<Engagement, { id: Id }>({
      query: ({ id }) => ({ url: `/me/engagements/${id}/accept`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Engagement', id: arg.id }, { type: 'Engagement', id: 'LIST' }],
    }),
    declineEngagement: build.mutation<Engagement, { id: Id }>({
      query: ({ id }) => ({ url: `/me/engagements/${id}/decline`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Engagement', id: arg.id }, { type: 'Engagement', id: 'LIST' }],
    }),
    postEngagementMessage: build.mutation<
      EngagementMessage,
      { id: Id; body: PostEngagementMessageRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/engagements/${id}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Engagement', id: arg.id }],
    }),
    completeEngagement: build.mutation<Engagement, { id: Id }>({
      query: ({ id }) => ({ url: `/me/engagements/${id}/complete`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Engagement', id: arg.id }, { type: 'Engagement', id: 'LIST' }],
    }),
  }),
});

export const {
  useListEngagementsQuery,
  useCreateEngagementMutation,
  useAcceptEngagementMutation,
  useDeclineEngagementMutation,
  usePostEngagementMessageMutation,
  useCompleteEngagementMutation,
} = engagementsApi;
