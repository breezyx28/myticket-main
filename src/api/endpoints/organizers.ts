import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { EventListItem } from '@/api/types/event';
import type { Organizer, OrganizerRatingsSummary } from '@/api/types/organizer';

export const organizersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listOrganizers: build.query<Paginated<Organizer>, PaginationQuery | void>({
      query: (params) => ({ url: '/organizers', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((o) => ({ type: 'Organizer' as const, id: o.id })),
              { type: 'Organizer' as const, id: 'LIST' },
            ]
          : [{ type: 'Organizer' as const, id: 'LIST' }],
    }),
    getOrganizerBySlug: build.query<Organizer, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/organizers/${encodeURIComponent(slug)}` }),
      providesTags: (_res, _err, arg) => [{ type: 'Organizer', id: arg.slug }],
    }),
    getOrganizerRatings: build.query<OrganizerRatingsSummary, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/organizers/${encodeURIComponent(slug)}/ratings` }),
      providesTags: (_res, _err, arg) => [{ type: 'Rating', id: `organizer:${arg.slug}` }],
    }),
    getOrganizerEvents: build.query<
      Paginated<EventListItem>,
      { slug: Slug } & PaginationQuery
    >({
      query: ({ slug, ...params }) => ({
        url: `/organizers/${encodeURIComponent(slug)}/events`,
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((e) => ({ type: 'Event' as const, id: e.id })),
              { type: 'Event' as const, id: 'ORGANIZER_LIST' },
            ]
          : [{ type: 'Event' as const, id: 'ORGANIZER_LIST' }],
    }),
  }),
});

export const {
  useListOrganizersQuery,
  useGetOrganizerBySlugQuery,
  useGetOrganizerRatingsQuery,
  useGetOrganizerEventsQuery,
} = organizersApi;
