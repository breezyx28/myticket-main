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
  FeaturedEventPin,
  SeatMap,
  SeatRecord as ApiSeatRecord,
  SeatStatus,
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

function unwrapSeatsPayload(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && Array.isArray((response as ResourceEnvelope<unknown[]>).data)) {
    return (response as ResourceEnvelope<unknown[]>).data;
  }
  return [];
}

function apiSeatStatusFromRow(r: Record<string, unknown>): SeatStatus {
  if (r.is_locked === true) return 'held';
  const s = String(r.status ?? 'available').toLowerCase();
  if (s === 'held' || s === 'booked') return s;
  return 'available';
}

/** Unwraps `{ data: Seat[] }` and builds aggregate counts for the seat picker. */
function normalizeEventSeatsResponse(response: unknown): SeatMap {
  const raw = unwrapSeatsPayload(response);
  const seats: ApiSeatRecord[] = [];
  let available = 0;
  let held = 0;
  let booked = 0;

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const id = r.id;
    if (id === undefined || id === null) continue;

    const status = apiSeatStatusFromRow(r);
    if (status === 'available') available += 1;
    else if (status === 'held') held += 1;
    else booked += 1;

    const row: ApiSeatRecord = {
      id: id as ApiSeatRecord['id'],
      label: String(r.label ?? ''),
      ticket_type_id: r.ticket_type_id as ApiSeatRecord['ticket_type_id'],
      status,
    };
    if (r.section != null) row.section = r.section as string | null;
    if (r.row != null) row.row = r.row as number | string;
    if (r.number != null) row.number = r.number as number | string;
    if (r.row_index != null) row.row_index = num(r.row_index);
    if (r.col_index != null) row.col_index = num(r.col_index);
    if (r.row_label != null) row.row_label = String(r.row_label);
    if (r.seat_number != null) row.seat_number = num(r.seat_number);
    if (r.price_override != null) row.price_override = r.price_override as ApiSeatRecord['price_override'];
    if (r.is_locked != null) row.is_locked = Boolean(r.is_locked);
    const px = num(r.position_x, NaN);
    const py = num(r.position_y, NaN);
    const pz = num(r.position_z, NaN);
    if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) {
      row.position = { x: px, y: py, z: pz };
    }
    seats.push(row);
  }

  return {
    seats,
    total: seats.length,
    available,
    held,
    booked,
  };
}

function emptyPaginatedEvents(perPage = 8): Paginated<EventListItem> {
  return {
    current_page: 1,
    data: [],
    first_page_url: null,
    from: null,
    last_page: 1,
    last_page_url: null,
    links: [],
    next_page_url: null,
    path: '',
    per_page: perPage,
    prev_page_url: null,
    to: null,
    total: 0,
  };
}

function isFeaturedPinRow(row: unknown): row is FeaturedEventPin & Record<string, unknown> {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return r.event != null && typeof r.event === 'object';
}

function featuredPinToListItem(pin: FeaturedEventPin & Record<string, unknown>): EventListItem | null {
  const nested = pin.event;
  if (!nested || typeof nested !== 'object') return null;
  const ev = nested as Record<string, unknown>;
  const eventId = ev.id ?? pin.event_id;
  if (eventId == null) return null;
  const start = ev.starts_at ?? ev.date_start ?? '';
  return {
    ...(ev as EventListItem),
    id: eventId as EventListItem['id'],
    date_start: String(start),
    starts_at: typeof ev.starts_at === 'string' ? ev.starts_at : String(start),
    is_featured: true,
    featured: true,
  };
}

/**
 * Featured endpoint may return Laravel pins `{ data: [{ event_id, event: {...} }] }`,
 * a bare array, or a full paginator of flat `EventListItem` rows.
 */
export function normalizeFeaturedEventsResponse(
  response: unknown,
  perPage = 8,
): Paginated<EventListItem> {
  if (!response) return emptyPaginatedEvents(perPage);

  if (Array.isArray(response)) {
    const data = response
      .map((row) =>
        isFeaturedPinRow(row)
          ? featuredPinToListItem(row)
          : (row as EventListItem),
      )
      .filter((e): e is EventListItem => e != null && typeof e.title === 'string');
    return { ...emptyPaginatedEvents(perPage), data, total: data.length, to: data.length };
  }

  if (typeof response !== 'object' || !('data' in response)) {
    return emptyPaginatedEvents(perPage);
  }

  const raw = response as Paginated<unknown> & ResourceEnvelope<unknown[]>;
  const rows = Array.isArray(raw.data) ? raw.data : [];

  if (rows.length > 0 && isFeaturedPinRow(rows[0])) {
    const data = rows
      .map((row) => featuredPinToListItem(row as FeaturedEventPin & Record<string, unknown>))
      .filter((e): e is EventListItem => e != null);
    const base =
      'current_page' in raw && typeof raw.current_page === 'number'
        ? (raw as Paginated<EventListItem>)
        : emptyPaginatedEvents(perPage);
    return {
      ...base,
      data,
      total: typeof raw.total === 'number' ? raw.total : data.length,
      to: data.length,
    };
  }

  const data = rows.filter(
    (row): row is EventListItem =>
      row != null && typeof row === 'object' && typeof (row as EventListItem).title === 'string',
  ) as EventListItem[];

  if ('current_page' in raw && typeof raw.current_page === 'number') {
    return { ...(raw as Paginated<EventListItem>), data };
  }

  return { ...emptyPaginatedEvents(perPage), data, total: data.length, to: data.length };
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
      transformResponse: (response: unknown, _meta, arg) =>
        normalizeFeaturedEventsResponse(
          response,
          arg && typeof arg === 'object' && 'per_page' in arg ? Number(arg.per_page) || 8 : 8,
        ),
      providesTags: (result) =>
        result?.data?.length
          ? [
              ...result.data.map((e) => ({ type: 'Event' as const, id: e.id })),
              { type: 'Event' as const, id: 'FEATURED' },
            ]
          : [{ type: 'Event' as const, id: 'FEATURED' }],
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
      transformResponse: (response: unknown) => normalizeEventSeatsResponse(response),
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
