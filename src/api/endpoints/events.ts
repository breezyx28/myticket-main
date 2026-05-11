import { baseApi } from '@/api/baseApi';
import type { Paginated, PaginationQuery, ResourceEnvelope, Slug } from '@/api/types/common';
import type {
  EventDetail,
  EventGalleryItem,
  EventLineupItem,
  EventListItem,
  EventListQuery,
  EventOccurrence,
  EventRatingsSummary,
  SeatMap,
  TicketType,
} from '@/api/types/event';

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listEvents: build.query<Paginated<EventListItem>, EventListQuery | void>({
      query: (params) => ({ url: '/events', params: params ?? undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((e) => ({ type: 'Event' as const, id: e.id })),
              { type: 'Event' as const, id: 'LIST' },
            ]
          : [{ type: 'Event' as const, id: 'LIST' }],
    }),
    getFeaturedEvents: build.query<Paginated<EventListItem>, PaginationQuery | void>({
      query: (params) => ({ url: '/events/featured', params: params ?? undefined }),
      providesTags: [{ type: 'Event', id: 'FEATURED' }],
    }),
    getEventBySlug: build.query<EventDetail, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}` }),
      transformResponse: (response: unknown) => {
        const maybeEnvelope = response as ResourceEnvelope<EventDetail>;
        return maybeEnvelope?.data ? maybeEnvelope.data : (response as EventDetail);
      },
      providesTags: (_res, _err, arg) => [{ type: 'Event', id: arg.slug }],
    }),
    getEventRatings: build.query<EventRatingsSummary, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/ratings` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventRating', id: arg.slug }],
    }),
    getEventOccurrences: build.query<EventOccurrence[], { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/occurrences` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventOccurrence', id: arg.slug }],
    }),
    getEventGallery: build.query<EventGalleryItem[], { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/gallery` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventGallery', id: arg.slug }],
    }),
    getEventLineup: build.query<EventLineupItem[], { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/lineup` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventLineup', id: arg.slug }],
    }),
    getEventTicketTypes: build.query<TicketType[], { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/ticket-types` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventTicketTypes', id: arg.slug }],
    }),
    getEventSeats: build.query<SeatMap, { slug: Slug }>({
      query: ({ slug }) => ({ url: `/events/${encodeURIComponent(slug)}/seats` }),
      providesTags: (_res, _err, arg) => [{ type: 'EventSeats', id: arg.slug }],
    }),
  }),
});

export const {
  useListEventsQuery,
  useGetFeaturedEventsQuery,
  useGetEventBySlugQuery,
  useGetEventRatingsQuery,
  useGetEventOccurrencesQuery,
  useGetEventGalleryQuery,
  useGetEventLineupQuery,
  useGetEventTicketTypesQuery,
  useGetEventSeatsQuery,
} = eventsApi;
