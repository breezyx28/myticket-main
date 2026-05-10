import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';
import type { Complaint, CreateComplaintRequest } from '@/api/types/complaint';

export const complaintsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listComplaints: build.query<Paginated<Complaint>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/complaints', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((c) => ({ type: 'Complaint' as const, id: c.id })),
              { type: 'Complaint' as const, id: 'LIST' },
            ]
          : [{ type: 'Complaint' as const, id: 'LIST' }],
    }),
    createComplaint: build.mutation<Complaint, CreateComplaintRequest>({
      query: (body) => ({ url: '/me/complaints', method: 'POST', body }),
      invalidatesTags: [{ type: 'Complaint', id: 'LIST' }],
    }),
    getComplaint: build.query<Complaint, { id: Id }>({
      query: ({ id }) => ({ url: `/me/complaints/${id}` }),
      providesTags: (_res, _err, arg) => [{ type: 'Complaint', id: arg.id }],
    }),
    withdrawComplaint: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/complaints/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Complaint', id: arg.id },
        { type: 'Complaint', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListComplaintsQuery,
  useCreateComplaintMutation,
  useGetComplaintQuery,
  useWithdrawComplaintMutation,
} = complaintsApi;
