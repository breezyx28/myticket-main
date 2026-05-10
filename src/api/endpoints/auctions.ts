import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type {
  AuctionBid,
  AuctionListing,
  AuctionStatsResponse,
  BuyNowRequest,
  CreateAuctionRequest,
  PlaceBidRequest,
} from '@/api/types/auction';
import type { Id, Paginated, PaginationQuery } from '@/api/types/common';

export const auctionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuctions: build.query<
      Paginated<AuctionListing>,
      (PaginationQuery & { event_id?: Id }) | void
    >({
      query: (params) => ({ url: '/auctions', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((a) => ({ type: 'Auction' as const, id: a.id })),
              { type: 'Auction' as const, id: 'LIST' },
            ]
          : [{ type: 'Auction' as const, id: 'LIST' }],
    }),
    getAuction: build.query<AuctionListing, { id: Id }>({
      query: ({ id }) => ({ url: `/auctions/${id}` }),
      providesTags: (_res, _err, arg) => [{ type: 'Auction', id: arg.id }],
    }),
    createMyAuction: build.mutation<AuctionListing, CreateAuctionRequest>({
      query: (body) => ({ url: '/me/auctions', method: 'POST', body }),
      invalidatesTags: ['Auction', 'Ticket'],
    }),
    cancelAuction: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/auctions/${id}/cancel`, method: 'POST' }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Auction', id: arg.id },
        { type: 'Auction', id: 'LIST' },
        'Ticket',
      ],
    }),
    placeBid: build.mutation<AuctionBid, { id: Id; body: PlaceBidRequest }>({
      query: ({ id, body }) => ({
        url: `/auctions/${id}/bids`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Auction', id: arg.id },
        { type: 'AuctionBid', id: arg.id },
      ],
    }),
    buyNow: build.mutation<AcknowledgementResponse, { id: Id; body?: BuyNowRequest }>({
      query: ({ id, body }) => ({
        url: `/auctions/${id}/buy-now`,
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Auction', id: arg.id },
        { type: 'Auction', id: 'LIST' },
        'Ticket',
        'Order',
      ],
    }),
    listMyAuctions: build.query<Paginated<AuctionListing>, PaginationQuery | void>({
      query: (params) => ({ url: '/me/auctions', params: params ?? undefined }),
      providesTags: [{ type: 'Auction', id: 'MY_LIST' }],
    }),
    listMyAuctionBids: build.query<Paginated<AuctionBid>, { id: Id } & PaginationQuery>({
      query: ({ id, ...params }) => ({ url: `/me/auctions/${id}/bids`, params }),
      providesTags: (_res, _err, arg) => [{ type: 'AuctionBid', id: arg.id }],
    }),
    getAuctionStats: build.query<AuctionStatsResponse, void>({
      query: () => ({ url: '/auctions/stats' }),
      providesTags: ['AuctionStats'],
    }),
  }),
});

export const {
  useListAuctionsQuery,
  useGetAuctionQuery,
  useCreateMyAuctionMutation,
  useCancelAuctionMutation,
  usePlaceBidMutation,
  useBuyNowMutation,
  useListMyAuctionsQuery,
  useListMyAuctionBidsQuery,
  useGetAuctionStatsQuery,
} = auctionsApi;
