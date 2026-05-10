import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { Talent, TalentRatingsSummary } from '@/api/types/talent';

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
    getTalentBySlug: build.query<Talent, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/talents/${encodeURIComponent(slug)}` }),
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
  useGetTalentBySlugQuery,
  useGetTalentRatingsQuery,
} = talentsApi;
