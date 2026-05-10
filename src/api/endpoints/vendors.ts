import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, Slug } from '@/api/types/common';
import type { Vendor, VendorRatingsSummary } from '@/api/types/vendor';

export const vendorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listVendors: build.query<Paginated<Vendor>, PaginationQuery | void>({
      query: (params) => ({ url: '/vendors', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((v) => ({ type: 'Vendor' as const, id: v.id })),
              { type: 'Vendor' as const, id: 'LIST' },
            ]
          : [{ type: 'Vendor' as const, id: 'LIST' }],
    }),
    getVendorBySlug: build.query<Vendor, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/vendors/${encodeURIComponent(slug)}` }),
      providesTags: (_res, _err, arg) => [{ type: 'Vendor', id: arg.slug }],
    }),
    getVendorRatings: build.query<VendorRatingsSummary, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/vendors/${encodeURIComponent(slug)}/ratings` }),
      providesTags: (_res, _err, arg) => [{ type: 'Rating', id: `vendor:${arg.slug}` }],
    }),
  }),
});

export const {
  useListVendorsQuery,
  useGetVendorBySlugQuery,
  useGetVendorRatingsQuery,
} = vendorsApi;
