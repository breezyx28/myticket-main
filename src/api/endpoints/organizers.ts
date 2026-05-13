import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { EventListItem } from '@/api/types/event';
import type { Organizer, OrganizerRatingsSummary } from '@/api/types/organizer';

function unwrapMainResource<T>(response: unknown): T {
  if (!response || typeof response !== 'object') return response as T;
  const r = response as Record<string, unknown>;
  if (!('data' in r) || r.data === undefined || r.data === null) return response as T;
  const inner = r.data;
  /** Top-level paginator: `data` is the rows array (do not unwrap). */
  if (Array.isArray(inner)) return response as T;
  if (typeof inner === 'object' && inner !== null) {
    /** Wrapped paginator: `{ data: { data: [], current_page, … } }`. */
    if ('current_page' in inner && Array.isArray((inner as Paginated<unknown>).data)) {
      return inner as T;
    }
    /** Single-resource envelope: `{ data: { id, slug, … } }`. */
    if (!('current_page' in inner)) {
      return inner as T;
    }
  }
  return response as T;
}

export const organizersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listOrganizers: build.query<Paginated<Organizer>, PaginationQuery | void>({
      query: (params) => ({ url: '/organizers', params: params ?? undefined }),
      transformResponse: (response: unknown) => unwrapMainResource<Paginated<Organizer>>(response),
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
      transformResponse: (response: unknown) => unwrapMainResource<Organizer>(response),
      providesTags: (_res, _err, arg) => [{ type: 'Organizer', id: arg.slug }],
    }),
    getOrganizerRatings: build.query<OrganizerRatingsSummary, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/organizers/${encodeURIComponent(slug)}/ratings` }),
      transformResponse: (response: unknown) => unwrapMainResource<OrganizerRatingsSummary>(response),
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
      transformResponse: (response: unknown) => unwrapMainResource<Paginated<EventListItem>>(response),
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
