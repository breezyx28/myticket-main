import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { Talent, TalentRatingsSummary, TopTalent } from '@/api/types/talent';

function unwrapMainResource<T>(response: unknown): T {
  if (!response || typeof response !== 'object') return response as T;
  const r = response as Record<string, unknown>;
  if (!('data' in r) || r.data === undefined || r.data === null) return response as T;
  const inner = r.data;
  if (Array.isArray(inner)) return inner as T;
  if (typeof inner === 'object' && inner !== null) {
    if ('current_page' in inner && Array.isArray((inner as Paginated<unknown>).data)) {
      return inner as T;
    }
    if (!('current_page' in inner)) {
      return inner as T;
    }
  }
  return response as T;
}

function unwrapTopTalents(response: unknown): TopTalent[] {
  const data = unwrapMainResource<TopTalent[] | TopTalent>(response);
  return Array.isArray(data) ? data : [];
}

export const talentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTalents: build.query<Paginated<Talent>, PaginationQuery | void>({
      query: (params) => ({ url: '/talents', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((t) => ({ type: 'Talent' as const, id: t.id })),
              { type: 'Talent' as const, id: 'LIST' },
            ]
          : [{ type: 'Talent' as const, id: 'LIST' }],
    }),
    getTopTalents: build.query<TopTalent[], { limit?: number } | void>({
      query: (params) => ({ url: '/talents/top', params: params ?? undefined }),
      transformResponse: unwrapTopTalents,
      providesTags: [{ type: 'Talent', id: 'TOP' }],
    }),
    getTalentBySlug: build.query<Talent, { slug: Slug; events_limit?: number }>({
      query: ({ slug, events_limit }) => ({
        url: `/talents/${encodeURIComponent(slug)}`,
        params: events_limit != null ? { events_limit } : undefined,
      }),
      transformResponse: (response: unknown) => unwrapMainResource<Talent>(response),
      providesTags: (_res, _err, arg) => [{ type: 'Talent', id: arg.slug }],
    }),
    getTalentRatings: build.query<TalentRatingsSummary, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/talents/${encodeURIComponent(slug)}/ratings` }),
      providesTags: (_res, _err, arg) => [{ type: 'Rating', id: `talent:${arg.slug}` }],
    }),
  }),
});

export const {
  useListTalentsQuery,
  useGetTopTalentsQuery,
  useGetTalentBySlugQuery,
  useGetTalentRatingsQuery,
} = talentsApi;
