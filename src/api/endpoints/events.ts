import { baseApi } from '@/api/baseApi';
import { priceFromTicketApi, remainingFromTicketApiRow } from '@/lib/ticketTypeFromApi';
import type { Id, Paginated, PaginationQuery, ResourceEnvelope, Slug } from '@/api/types/common';
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

function unwrapTicketTypesPayload(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && Array.isArray((response as ResourceEnvelope<unknown[]>).data)) {
    return (response as ResourceEnvelope<unknown[]>).data;
  }
  return [];
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Normalizes main-API ticket type rows (snake_case, string decimals, `sort_position`). */
function normalizeTicketTypesResponse(response: unknown): TicketType[] {
  const raw = unwrapTicketTypesPayload(response);
  const staged: { sort: number; row: TicketType }[] = [];
  let idx = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (r.is_active === false) continue;
    const id = r.id as Id | undefined;
    if (id === undefined || id === null) continue;
    const name = String(r.name ?? r.label ?? 'Ticket');
    const price = priceFromTicketApi(r.price ?? r.amount ?? r.unit_price);
    const remaining = remainingFromTicketApiRow(r);
    const sort = num(r.sort_position ?? r.sortPosition, idx);
    const row: TicketType = {
      id,
      name,
      price,
      remaining,
      description: (typeof r.description === 'string' ? r.description : null) ?? undefined,
    };
    if (typeof r.code === 'string') row.code = r.code;
    staged.push({
      sort,
      row,
    });
    idx += 1;
  }
  staged.sort((a, b) => a.sort - b.sort);
  return staged.map((s) => s.row);
}

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
      transformResponse: (response: unknown) => normalizeTicketTypesResponse(response),
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
