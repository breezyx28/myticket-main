import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type {
  CreateSupportCaseRequest,
  SupportCase,
  SupportCaseMessage,
  SupportCaseMessageRequest,
  SupportChatMessageRequest,
  SupportChatPromoteRequest,
  SupportChatSession,
  SupportChatSessionDetail,
  SupportChatStartRequest,
} from '@/api/types/support';

export const supportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSupportCases: build.query<Paginated<SupportCase>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/support-cases', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({ type: 'SupportCase' as const, id: c.id })),
              { type: 'SupportCase' as const, id: 'LIST' },
            ]
          : [{ type: 'SupportCase' as const, id: 'LIST' }],
    }),
    createSupportCase: build.mutation<SupportCase, CreateSupportCaseRequest>({
      query: (body) => ({ url: '/me/support-cases', method: 'POST', body }),
      invalidatesTags: [{ type: 'SupportCase', id: 'LIST' }],
    }),
    getSupportCase: build.query<SupportCase, { id: Id }>({
      query: ({ id }) => ({ url: `/me/support-cases/${id}` }),
      providesTags: (_res, _err, arg) => [{ type: 'SupportCase', id: arg.id }],
    }),
    postSupportCaseMessage: build.mutation<
      SupportCaseMessage,
      { id: Id; body: SupportCaseMessageRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/support-cases/${id}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'SupportCase', id: arg.id }],
    }),
    closeSupportCase: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/support-cases/${id}/close`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'SupportCase', id: arg.id },
        { type: 'SupportCase', id: 'LIST' },
      ],
    }),
    reopenSupportCase: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/support-cases/${id}/reopen`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'SupportCase', id: arg.id },
        { type: 'SupportCase', id: 'LIST' },
      ],
    }),
    startSupportChat: build.mutation<SupportChatSession, SupportChatStartRequest | void>({
      query: (body) => ({
        url: '/support/chat',
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'SupportChat', id: 'LIST' },
              { type: 'SupportChat', id: result.id },
            ]
          : [{ type: 'SupportChat', id: 'LIST' }],
    }),
    getSupportChatSession: build.query<SupportChatSessionDetail, { sessionId: Id }>({
      query: ({ sessionId }) => ({ url: `/support/chat/${sessionId}` }),
      providesTags: (_res, _err, arg) => [{ type: 'SupportChat', id: arg.sessionId }],
    }),
    postSupportChatMessage: build.mutation<
      SupportCaseMessage,
      { sessionId: Id; body: SupportChatMessageRequest }
    >({
      query: ({ sessionId, body }) => ({
        url: `/support/chat/${sessionId}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'SupportChat', id: arg.sessionId }],
    }),
    promoteSupportChat: build.mutation<
      SupportCase,
      { sessionId: Id; body?: SupportChatPromoteRequest }
    >({
      query: ({ sessionId, body }) => ({
        url: `/support/chat/${sessionId}/promote`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: [{ type: 'SupportCase', id: 'LIST' }],
    }),
  }),
});

export const {
  useListSupportCasesQuery,
  useCreateSupportCaseMutation,
  useGetSupportCaseQuery,
  usePostSupportCaseMessageMutation,
  useCloseSupportCaseMutation,
  useReopenSupportCaseMutation,
  useStartSupportChatMutation,
  useGetSupportChatSessionQuery,
  usePostSupportChatMessageMutation,
  usePromoteSupportChatMutation,
} = supportApi;
