import type { EventDetail, EventListItem, EventOrganizerSummary, TicketType } from '@/api/types/event';
import type { EventCardProps } from '@/components/cards/EventCard';
import { priceFromTicketApi, remainingFromTicketApiRow } from '@/lib/ticketTypeFromApi';
import type { LayoutType, MockEvent, OrganizerSummary } from '@/types/domain';

/**
 * Maps API `layout_type` onto the binary `MockEvent.layoutType`.
 * Only `free` uses general admission (empty `seat_ids` on lock). All other
 * API values (`seated`, `grid`, `section`, unknown) use the seat map and
 * non-empty `seat_ids`, matching MainSeatingController validation.
 */
export function apiLayoutTypeToMockLayout(layoutType: string | null | undefined): LayoutType {
  const raw = layoutType != null && layoutType !== '' ? String(layoutType).trim().toLowerCase() : '';
  return raw === 'free' ? 'free' : 'seated';
}

/**
 * Tailwind background tokens for the colored panel inside `EventCard`.
 * Keys are normalized to lowercase so any backend casing matches.
 */
const ACCENT_BY_CATEGORY: Record<string, string> = {
  music: 'bg-coral',
  comedy: 'bg-lemon',
  sports: 'bg-lime',
  arts: 'bg-lavender',
  'arts & culture': 'bg-lavender',
  theatre: 'bg-lavender',
  family: 'bg-blush',
  'food & drink': 'bg-amber',
  food: 'bg-amber',
  fashion: 'bg-coral',
  tech: 'bg-indigo',
  online: 'bg-sky',
};

const DEFAULT_ACCENT = 'bg-coral';

/** Resolve a `bg-*` Tailwind token for the given event category string. */
export function accentForCategory(category?: string | null): string {
  if (!category) return DEFAULT_ACCENT;
  return ACCENT_BY_CATEGORY[category.trim().toLowerCase()] ?? DEFAULT_ACCENT;
}

/** Format an ISO datetime into the short date / time strings used by `EventCard`. */
export function formatCardDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

/**
 * First non-empty slug/code (trimmed), else numeric id — use as `/events/{segment}`
 * for `useGetEventBySlugQuery` (the route param is the public slug).
 */
export function eventListItemPublicPathSegment(e: EventListItem): string {
  const r = e as Record<string, unknown>;
  const slug = typeof e.slug === 'string' && e.slug.trim() !== '' ? e.slug.trim() : null;
  if (slug) return slug;
  const code = typeof e.code === 'string' && e.code.trim() !== '' ? e.code.trim() : null;
  if (code) return code;
  for (const key of ['event_slug', 'public_slug'] as const) {
    const v = r[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return String(e.id);
}

function minPriceFromListTicketTypes(r: Record<string, unknown>): number | null {
  const types = r.ticket_types;
  if (!Array.isArray(types) || types.length === 0) return null;
  let minP = Infinity;
  for (const t of types) {
    if (!t || typeof t !== 'object') continue;
    const tr = t as Record<string, unknown>;
    if (tr.is_active === false) continue;
    const p = priceFromTicketApi(tr.price ?? tr.amount ?? tr.unit_price);
    if (Number.isFinite(p) && p >= 0 && p < minP) minP = p;
  }
  return Number.isFinite(minP) && minP < Infinity ? minP : null;
}

function parseEventsCount(raw: EventOrganizerSummary['events_count']): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Maps nested `EventDetail.organizer` (+ optional mock fallback) onto `OrganizerSummary`. */
export function mapEventOrganizerToSummary(
  api: EventOrganizerSummary | null | undefined,
  fallback?: MockEvent['organizer'],
): OrganizerSummary {
  if (!api && !fallback) {
    return { id: '', name: '', bio: '' };
  }
  if (!api && fallback) {
    return { ...fallback };
  }
  const o = api!;
  const fb = fallback;
  const name =
    (typeof o.name === 'string' && o.name.trim() !== ''
      ? o.name.trim()
      : typeof o.display_name === 'string' && o.display_name.trim() !== ''
        ? o.display_name.trim()
        : fb?.name ?? '') ?? '';
  const slug = o.slug != null && String(o.slug).trim() !== '' ? String(o.slug) : fb?.slug;
  const code =
    typeof o.code === 'string' && o.code.trim() !== '' ? o.code.trim() : fb?.code;
  const eventsCount = parseEventsCount(o.events_count) ?? fb?.eventsCount;
  const bio =
    (typeof o.bio === 'string' && o.bio.trim() !== ''
      ? o.bio.trim()
      : typeof o.description === 'string' && o.description.trim() !== ''
        ? o.description.trim()
        : fb?.bio ?? '') ?? '';
  const logo =
    (typeof o.logo_url === 'string' && o.logo_url.trim() !== '' ? o.logo_url.trim() : undefined) ?? fb?.logo;

  return {
    id: String(o.id ?? fb?.id ?? ''),
    name,
    bio,
    ...(logo !== undefined ? { logo } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(code !== undefined ? { code } : {}),
    ...(eventsCount !== undefined ? { eventsCount } : {}),
  };
}

/** Coerce Laravel / JSON numeric fields that may arrive as strings. */
function coerceFiniteNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseFloat(v.replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function listItemPriceFrom(e: EventListItem): number {
  const r = e as Record<string, unknown>;
  const fromMin =
    coerceFiniteNumber(e.price_min) ??
    coerceFiniteNumber(r.price_min) ??
    coerceFiniteNumber(r.price_from) ??
    coerceFiniteNumber(r.starting_price) ??
    coerceFiniteNumber(r.min_price) ??
    coerceFiniteNumber(r.price) ??
    coerceFiniteNumber(r.lowest_price) ??
    coerceFiniteNumber(r.from_price) ??
    coerceFiniteNumber(r.min_ticket_price) ??
    coerceFiniteNumber(r.lowest_ticket_price);
  const fromMax = coerceFiniteNumber(e.price_max) ?? coerceFiniteNumber(r.price_max);
  const fromTypes = minPriceFromListTicketTypes(r);
  const base = fromMin ?? fromMax ?? fromTypes ?? 0;
  return Number.isFinite(base) ? Math.max(0, Math.round(base)) : 0;
}

/**
 * Project an API `EventListItem` onto the shape `EventCard` expects, so the
 * card markup stays untouched while the data source moves from mocks to
 * `useListEventsQuery` / `useGetFeaturedEventsQuery`.
 *
 * `eventId` is the API **event row id** (favorites, ratings). Use
 * `detailPathSegment` / `eventListItemPublicPathSegment` for `/events/:slug`
 * navigation — never rely on `slug ?? code` alone (empty string is not nullish).
 */
export function eventListItemToCardProps(e: EventListItem): EventCardProps {
  const r = e as Record<string, unknown>;
  const startAt = e.date_start ?? e.starts_at ?? (typeof r.starts_at === 'string' ? r.starts_at : '') ?? '';
  const { date, time } = formatCardDateTime(startAt);
  const priceFrom = listItemPriceFrom(e);
  const detailPathSegment = eventListItemPublicPathSegment(e);
  const categoryLabel = e.category ?? e.category_name ?? (typeof r.category === 'string' ? r.category : null) ?? 'Event';
  const venueLabel = e.venue ?? e.venue_name ?? (typeof r.venue === 'string' ? r.venue : '') ?? '';
  const cityLabel = e.city ?? e.city_name ?? (typeof r.city === 'string' ? r.city : '') ?? '';
  const featured = typeof e.featured === 'boolean' ? e.featured : Boolean(e.is_featured ?? r.is_featured ?? r.featured);
  const cover =
    (typeof e.cover_image_url === 'string' && e.cover_image_url.trim() !== '' ? e.cover_image_url : null) ??
    (typeof r.cover_image_url === 'string' && r.cover_image_url.trim() !== '' ? r.cover_image_url : null) ??
    (typeof r.cover_image === 'string' && r.cover_image.trim() !== '' ? r.cover_image : null) ??
    (typeof r.image === 'string' && r.image.trim() !== '' ? r.image : null) ??
    '';
  const ticketsLeft = coerceFiniteNumber(e.tickets_left) ?? coerceFiniteNumber(r.tickets_left);
  const ratingVal =
    coerceFiniteNumber(e.rating_average) ??
    coerceFiniteNumber(r.rating_average) ??
    coerceFiniteNumber(r.rating_avg) ??
    coerceFiniteNumber(r.average_rating);
  return {
    eventId: String(e.id),
    detailPathSegment,
    title: e.title,
    category: categoryLabel,
    accentColor: accentForCategory(categoryLabel),
    image: cover,
    date,
    time,
    venue: venueLabel,
    city: cityLabel,
    priceFrom,
    rating: ratingVal,
    isFeatured: featured,
    isSoldOut: ticketsLeft !== null ? ticketsLeft === 0 : false,
  };
}

/**
 * Project an API `EventDetail` onto the legacy `MockEvent` shape that the
 * detail page (and a handful of cross-service helpers it composes with) was
 * built against. Phase 3 keeps those helpers on mocks, so this adapter is
 * a temporary bridge — once auctions / ratings / tickets / waitlist services
 * migrate (phases 6-8), each consumer should read directly from `EventDetail`.
 *
 * `id` is set to the **slug** so cross-service lookups (rating, auction,
 * waitlist, tickets) keyed by the URL param continue to resolve consistently.
 */
export function eventDetailToMockEvent(detail: EventDetail, fallback?: MockEvent | null): MockEvent {
  const startAt = detail.date_start ?? detail.starts_at ?? fallback?.dateStart ?? '';
  const endAt = detail.date_end ?? detail.ends_at ?? startAt;
  const categoryLabel = detail.category ?? detail.category_name ?? fallback?.category ?? 'Event';
  const cityLabel = detail.city ?? detail.city_name ?? fallback?.city ?? '';
  const venueLabel = detail.venue ?? detail.venue_name ?? fallback?.venue ?? '';
  const layoutType = apiLayoutTypeToMockLayout(detail.layout_type);
  const ticketsLeft =
    typeof detail.tickets_left === 'number'
      ? detail.tickets_left
      : (fallback?.ticketsLeft ?? 0);
  const priceMin = typeof detail.price_min === 'number' ? detail.price_min : (fallback?.priceMin ?? 0);
  const priceMax = typeof detail.price_max === 'number' ? detail.price_max : (fallback?.priceMax ?? priceMin);
  return {
    id: detail.slug ?? detail.code ?? String(detail.id),
    title: detail.title,
    excerpt: detail.excerpt ?? fallback?.excerpt ?? '',
    description: detail.description ?? fallback?.description ?? '',
    coverImage: detail.cover_image_url ?? fallback?.coverImage ?? '',
    city: cityLabel,
    venue: venueLabel,
    category: categoryLabel,
    dateStart: startAt,
    dateEnd: endAt,
    priceMin,
    priceMax,
    ticketsLeft,
    layoutType,
    featured: typeof detail.featured === 'boolean' ? detail.featured : Boolean(detail.is_featured),
    organizer: mapEventOrganizerToSummary(detail.organizer, fallback?.organizer),
    showTalents: detail.show_talents ?? fallback?.showTalents ?? false,
    showVendors: detail.show_vendors ?? fallback?.showVendors ?? false,
    talents: (detail.talents ?? []).map((t) => ({
      id: String(t.id),
      slug: t.slug != null && t.slug !== '' ? String(t.slug) : undefined,
      name: t.stage_name,
      photo: t.image_url ?? undefined,
      proficiency: t.proficiency ?? undefined,
    })),
    vendors: (detail.vendors ?? []).map((v) => ({
      id: String(v.id),
      slug: v.slug != null && v.slug !== '' ? String(v.slug) : undefined,
      name: v.business_name,
      serviceType: v.service_type ?? '',
    })),
    rating: typeof detail.rating_average === 'number' ? detail.rating_average : (fallback?.rating ?? null),
    ratingCount:
      typeof detail.ratings_count === 'number'
        ? detail.ratings_count
        : typeof detail.rating_count === 'number'
          ? detail.rating_count
          : (fallback?.ratingCount ?? undefined),
    attendingCount: fallback?.attendingCount,
    attendeeAvatars: fallback?.attendeeAvatars,
    gallery: detail.gallery ?? fallback?.gallery ?? [],
    ticketTypes: (detail.ticket_types ?? fallback?.ticketTypes ?? [])
      .filter((t) => (t as Record<string, unknown>).is_active !== false)
      .map((t) => {
        const r = t as TicketType & Record<string, unknown>;
        return {
          id: String(t.id),
          name: t.name,
          price: priceFromTicketApi(r.price),
          remaining: remainingFromTicketApiRow(r as Record<string, unknown>),
        };
      }),
    lat:
      detail.lat ??
      (detail.latitude != null && detail.latitude !== '' ? Number(detail.latitude) : undefined) ??
      fallback?.lat,
    lng:
      detail.lng ??
      (detail.longitude != null && detail.longitude !== '' ? Number(detail.longitude) : undefined) ??
      fallback?.lng,
    videoUrl: detail.video_url ?? fallback?.videoUrl,
    organizerNotes: detail.organizer_notes ?? fallback?.organizerNotes,
    venueImages: detail.venue_images ?? fallback?.venueImages,
  };
}

/** Maps `GET /events/{slug}/ticket-types` rows onto the `MockEvent.ticketTypes` UI shape. */
export function ticketTypesToMockShape(types: TicketType[]): MockEvent['ticketTypes'] {
  return types.map((t) => ({
    id: String(t.id),
    name: t.name,
    price: typeof t.price === 'number' ? t.price : Number(t.price),
    remaining: typeof t.remaining === 'number' ? t.remaining : Number(t.remaining),
  }));
}

/**
 * Prefer active ticket types from `GET /events/{slug}/ticket-types` when the list is non-empty;
 * otherwise keep types embedded on `EventDetail` (if any).
 */
export function mergeEventTicketTypes(
  detail: EventDetail,
  fromEndpoint: TicketType[] | undefined,
  fallback?: MockEvent | null,
): MockEvent {
  const base = eventDetailToMockEvent(detail, fallback);
  if (fromEndpoint && fromEndpoint.length > 0) {
    return { ...base, ticketTypes: ticketTypesToMockShape(fromEndpoint) };
  }
  return base;
}
