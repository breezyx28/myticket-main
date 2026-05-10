import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id, Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { WaitlistEntry } from '@/api/types/waitlist';

export const waitlistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    joinWaitlist: build.mutation<WaitlistEntry, { slug: Slug }>({
      query: ({ slug }) => ({
        url: `/events/${encodeURIComponent(slug)}/waitlist`,
        method: 'POST',
      }),
      invalidatesTags: ['Waitlist'],
    }),
    leaveWaitlist: build.mutation<AcknowledgementResponse, { slug: Slug; entryId: Id }>({
      query: ({ slug, entryId }) => ({
        url: `/events/${encodeURIComponent(slug)}/waitlist/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Waitlist'],
    }),
    listMyWaitlist: build.query<Paginated<WaitlistEntry> | WaitlistEntry[], PaginationQuery | void>({
      query: (params) => ({ url: '/me/waitlist', params: params ?? undefined }),
      providesTags: ['Waitlist'],
    }),
  }),
});

export const {
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
  useListMyWaitlistQuery,
} = waitlistApi;
