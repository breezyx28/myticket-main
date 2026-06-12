import { baseApi } from '@/api/baseApi';
import type { Id } from '@/api/types/common';
import type {
  CreateTourismAdRequest,
  MyTourismAdsPage,
  MyTourismAdsQuery,
  TourismAdCarouselEnvelope,
  TourismAdCarouselItem,
  TourismAdDetail,
  TourismAdDetailEnvelope,
  UpdateTourismAdRequest,
} from '@/api/types/tourismAd';

function unwrapDetail(
  raw: TourismAdDetail | TourismAdDetailEnvelope,
): TourismAdDetail {
  return 'data' in raw ? raw.data : raw;
}

export const tourismAdsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTourismAdsCarousel: build.query<TourismAdCarouselItem[], void>({
      query: () => ({ url: '/tourism-ads/carousel' }),
      transformResponse: (response: TourismAdCarouselEnvelope) => response.data ?? [],
      providesTags: ['TourismAdCarousel'],
    }),

    getTourismAd: build.query<TourismAdDetail, Id>({
      query: (id) => ({ url: `/tourism-ads/${id}` }),
      transformResponse: unwrapDetail,
      providesTags: (_res, _err, id) => [
        { type: 'TourismAd', id: String(id) },
        'TourismAdCarousel',
      ],
    }),

    listMyTourismAds: build.query<MyTourismAdsPage, MyTourismAdsQuery | void>({
      query: (params) => ({
        url: '/me/tourism-ads',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((ad) => ({
                type: 'TourismAd' as const,
                id: String(ad.id),
              })),
              'TourismAd',
            ]
          : ['TourismAd'],
    }),

    getMyTourismAd: build.query<TourismAdDetail, Id>({
      query: (id) => ({ url: `/me/tourism-ads/${id}` }),
      transformResponse: unwrapDetail,
      providesTags: (_res, _err, id) => [
        { type: 'TourismAd', id: String(id) },
        'TourismAd',
      ],
    }),

    createMyTourismAd: build.mutation<TourismAdDetail, CreateTourismAdRequest | void>({
      query: (body) => ({
        url: '/me/tourism-ads',
        method: 'POST',
        body: body ?? {},
      }),
      transformResponse: unwrapDetail,
      invalidatesTags: ['TourismAd'],
    }),

    updateMyTourismAd: build.mutation<
      TourismAdDetail,
      { id: Id; body: UpdateTourismAdRequest }
    >({
      query: ({ id, body }) => ({
        url: `/me/tourism-ads/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrapDetail,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'TourismAd', id: String(id) },
        'TourismAd',
      ],
    }),

    submitMyTourismAd: build.mutation<TourismAdDetail, Id>({
      query: (id) => ({
        url: `/me/tourism-ads/${id}/submit`,
        method: 'POST',
      }),
      transformResponse: unwrapDetail,
      invalidatesTags: (_res, _err, id) => [
        { type: 'TourismAd', id: String(id) },
        'TourismAd',
        'TourismAdCarousel',
      ],
    }),

    withdrawMyTourismAd: build.mutation<TourismAdDetail, Id>({
      query: (id) => ({
        url: `/me/tourism-ads/${id}/withdraw`,
        method: 'POST',
      }),
      transformResponse: unwrapDetail,
      invalidatesTags: (_res, _err, id) => [
        { type: 'TourismAd', id: String(id) },
        'TourismAd',
      ],
    }),
  }),
});

export const {
  useGetTourismAdsCarouselQuery,
  useGetTourismAdQuery,
  useListMyTourismAdsQuery,
  useGetMyTourismAdQuery,
  useCreateMyTourismAdMutation,
  useUpdateMyTourismAdMutation,
  useSubmitMyTourismAdMutation,
  useWithdrawMyTourismAdMutation,
} = tourismAdsApi;
