import type { EventDetail, EventGalleryItem, EventListItem, EventOrganizerSummary, TicketType } from '@/api/types/event';
import type { EventCardProps } from '@/components/cards/EventCard';
import { resolvePublicStorageUrl } from '@/lib/organizerMedia';
import { priceFromTicketApi, remainingFromTicketApiRow } from '@/lib/ticketTypeFromApi';
import { languageToLocale, type AppLanguage } from '@/lib/language';
import { pickLocalizedName } from '@/lib/localized';
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
export function formatCardDateTime(iso: string, language: AppLanguage = 'en'): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const locale = languageToLocale(language);
  return {
    date: d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
  };
}

export function localizedRefName(
  item: { name?: string | null; name_en?: string | null; name_ar?: string | null },
  language: AppLanguage,
): string {
  return pickLocalizedName(item, language);
}

/**
 * First usable public identifier for `GET /events/{slug}`.
 * The main API resolves **slug** (or sometimes `code`), not numeric `id` alone.
 * Also reads JSON:API-style `attributes.slug` when present.
 */
export function eventListItemPublicPathSegment(e: EventListItem): string {
  const r = e as Record<string, unknown>;
  const attrs =
    r.attributes && typeof r.attributes === 'object'
      ? (r.attributes as Record<string, unknown>)
      : null;

  const pick = (v: unknown): string | null => {
    if (v == null || typeof v === 'object') return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };

  const candidates: unknown[] = [
    e.slug,
    attrs?.slug,
    e.code,
    r.event_slug,
    r.public_slug,
    r.url_slug,
    r.canonical_slug,
    r.handle,
  ];

  for (const v of candidates) {
    const s = pick(v);
    if (s) return s;
  }

  return pick(e.id) ?? '';
}

function minPriceFromListTicketTypes(r: Record<string, unknown>): number | null {
  const range = priceRangeFromTicketTypes(r.ticket_types);
  return range?.min ?? null;
}

function priceRangeFromTicketTypes(types: unknown): { min: number; max: number } | null {
  if (!Array.isArray(types) || types.length === 0) return null;
  let minP = Infinity;
  let maxP = -Infinity;
  for (const t of types) {
    if (!t || typeof t !== 'object') continue;
    const tr = t as Record<string, unknown>;
    if (tr.is_active === false) continue;
    const p = priceFromTicketApi(tr.price ?? tr.amount ?? tr.unit_price);
    if (Number.isFinite(p) && p >= 0) {
      minP = Math.min(minP, p);
      maxP = Math.max(maxP, p);
    }
  }
  if (!Number.isFinite(minP) || minP === Infinity) return null;
  return { min: Math.round(minP), max: Math.round(maxP >= minP ? maxP : minP) };
}

function priceRangeFromDetail(detail: EventDetail, fallback?: MockEvent | null): { min: number; max: number } {
  const r = detail as Record<string, unknown>;
  let min =
    coerceFiniteNumber(detail.price_min) ??
    coerceFiniteNumber(r.price_min) ??
    coerceFiniteNumber(r.price_from);
  let max = coerceFiniteNumber(detail.price_max) ?? coerceFiniteNumber(r.price_max);
  const fromTypes = priceRangeFromTicketTypes(r.ticket_types);
  if (fromTypes) {
    min = min ?? fromTypes.min;
    max = max ?? fromTypes.max;
  }
  const fbMin = fallback?.priceMin ?? 0;
  const fbMax = fallback?.priceMax ?? fbMin;
  return {
    min: min != null ? Math.max(0, Math.round(min)) : fbMin,
    max: max != null ? Math.max(0, Math.round(max)) : fbMax,
  };
}

function eventTicketsLeftFromDetail(detail: EventDetail, fallback?: MockEvent | null): number | null {
  const r = detail as Record<string, unknown>;
  const v = coerceFiniteNumber(detail.tickets_left) ?? coerceFiniteNumber(r.tickets_left);
  if (v !== null) return v;
  if (fallback && fallback.ticketsLeft !== undefined) return fallback.ticketsLeft;
  return null;
}

/** `null` tickets_left means inventory unknown — not sold out. */
export function isEventSoldOut(ticketsLeft: number | null): boolean {
  return ticketsLeft === 0;
}

export function eventHasPrimaryInventory(ticketsLeft: number | null): boolean {
  return ticketsLeft !== 0;
}

export type EventSalesPhase = 'open' | 'not_started' | 'ended';

/** Whether `now` falls inside a sales window (`startsAt` … `endsAt`). */
export function getEventSalesPhase(
  salesStartsAt: string,
  salesEndsAt: string,
  now: Date = new Date(),
): EventSalesPhase {
  const startMs = Date.parse(salesStartsAt);
  const endMs = Date.parse(salesEndsAt);
  const t = now.getTime();
  if (Number.isFinite(startMs) && t < startMs) return 'not_started';
  if (Number.isFinite(endMs) && t > endMs) return 'ended';
  return 'open';
}

/** Primary ticket sales window from `GET /events/{slug}` detail payload. */
export function getTicketSalesPhaseFromDetail(
  detail: Pick<EventDetail, 'ticket_sales_starts_at' | 'ticket_sales_ends_at'> | null | undefined,
  now?: Date,
): EventSalesPhase {
  if (!detail) return 'open';
  const start = detail.ticket_sales_starts_at?.trim() ?? '';
  const end = detail.ticket_sales_ends_at?.trim() ?? '';
  if (!start && !end) return 'open';
  return getEventSalesPhase(start, end, now);
}

export function isEventSalesOpen(salesStartsAt: string, salesEndsAt: string, now?: Date): boolean {
  return getEventSalesPhase(salesStartsAt, salesEndsAt, now) === 'open';
}

export function formatEventLocation(event: {
  venue?: string;
  city?: string;
  venueAddress?: string;
}): string {
  const venue = event.venue?.trim() ?? '';
  const city = event.city?.trim() ?? '';
  const addr = event.venueAddress?.trim() ?? '';
  if (venue && city) return `${venue}, ${city}`;
  if (venue) return venue;
  if (addr && city) return `${addr}, ${city}`;
  if (city) return city;
  if (addr) return addr;
  return '';
}

/** Resolve gallery rows (`url` / `image_url`) or plain strings to absolute URLs. */
export function normalizeEventGalleryUrls(gallery: EventDetail['gallery']): string[] {
  if (!Array.isArray(gallery)) return [];
  const urls: string[] = [];
  for (const item of gallery) {
    if (typeof item === 'string') {
      const u = resolvePublicStorageUrl(item) ?? item.trim();
      if (u) urls.push(u);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as EventGalleryItem & Record<string, unknown>;
    const raw = row.url ?? row.image_url;
    if (raw == null || String(raw).trim() === '') continue;
    const u = resolvePublicStorageUrl(String(raw)) ?? String(raw).trim();
    if (u) urls.push(u);
  }
  return urls;
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
  const r = detail as Record<string, unknown>;
  const startAt = detail.date_start ?? detail.starts_at ?? fallback?.dateStart ?? '';
  const endAt = detail.date_end ?? detail.ends_at ?? startAt;
  const categoryLabel = detail.category ?? detail.category_name ?? fallback?.category ?? 'Event';
  const cityLabel = detail.city ?? detail.city_name ?? fallback?.city ?? '';
  const venueLabel = detail.venue ?? detail.venue_name ?? fallback?.venue ?? '';
  const venueAddress =
    typeof detail.venue_address === 'string' && detail.venue_address.trim() !== ''
      ? detail.venue_address.trim()
      : fallback?.venueAddress;
  const layoutType = apiLayoutTypeToMockLayout(detail.layout_type);
  const ticketsLeft = eventTicketsLeftFromDetail(detail, fallback);
  const { min: priceMin, max: priceMax } = priceRangeFromDetail(detail, fallback);
  const attendingCount =
    coerceFiniteNumber(detail.attending_count) ??
    coerceFiniteNumber(r.attending_count) ??
    fallback?.attendingCount;
  const ticketsSold =
    coerceFiniteNumber(detail.tickets_sold) ?? coerceFiniteNumber(r.tickets_sold) ?? fallback?.ticketsSold;
  const galleryFromApi = normalizeEventGalleryUrls(detail.gallery);
  const venueImagesRaw = detail.venue_images ?? fallback?.venueImages;
  const venueImages = Array.isArray(venueImagesRaw)
    ? venueImagesRaw
        .map((src) => (typeof src === 'string' ? resolvePublicStorageUrl(src) ?? src : null))
        .filter((u): u is string => Boolean(u))
    : undefined;

  return {
    id: eventListItemPublicPathSegment(detail) || String(detail.id),
    title: detail.title,
    excerpt: detail.excerpt ?? fallback?.excerpt ?? '',
    description: detail.description ?? fallback?.description ?? '',
    coverImage: detail.cover_image_url ?? fallback?.coverImage ?? '',
    city: cityLabel,
    venue: venueLabel,
    ...(venueAddress ? { venueAddress } : {}),
    category: categoryLabel,
    dateStart: startAt,
    dateEnd: endAt,
    priceMin,
    priceMax,
    ticketsLeft,
    layoutType,
    featured:
      typeof detail.featured === 'boolean' ? detail.featured : Boolean(detail.is_featured ?? r.is_featured),
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
    rating:
      coerceFiniteNumber(detail.rating_average) ??
      coerceFiniteNumber(r.rating_average) ??
      fallback?.rating ??
      null,
    ratingCount:
      coerceFiniteNumber(detail.ratings_count) ??
      coerceFiniteNumber(detail.rating_count) ??
      coerceFiniteNumber(r.rating_count) ??
      fallback?.ratingCount,
    ...(attendingCount !== undefined ? { attendingCount } : {}),
    ...(ticketsSold !== undefined ? { ticketsSold } : {}),
    gallery: galleryFromApi.length > 0 ? galleryFromApi : (fallback?.gallery ?? []),
    ticketTypes: (detail.ticket_types ?? fallback?.ticketTypes ?? [])
      .filter((t) => (t as Record<string, unknown>).is_active !== false)
      .map((t) => {
        const row = t as TicketType & Record<string, unknown>;
        return {
          id: String(t.id),
          name: t.name,
          price: priceFromTicketApi(row.price),
          remaining: remainingFromTicketApiRow(row as Record<string, unknown>),
        };
      }),
    lat:
      detail.lat ??
      coerceFiniteNumber(detail.latitude) ??
      (detail.latitude != null && detail.latitude !== '' ? Number(detail.latitude) : undefined) ??
      fallback?.lat,
    lng:
      detail.lng ??
      coerceFiniteNumber(detail.longitude) ??
      (detail.longitude != null && detail.longitude !== '' ? Number(detail.longitude) : undefined) ??
      fallback?.lng,
    videoUrl: detail.video_url ?? fallback?.videoUrl,
    organizerNotes: detail.organizer_notes ?? fallback?.organizerNotes,
    ...(venueImages && venueImages.length > 0 ? { venueImages } : {}),
  };
}

/** Maps `GET /events/{slug}/ticket-types` rows onto the `MockEvent.ticketTypes` UI shape. */
export function ticketTypesToMockShape(types: TicketType[]): MockEvent['ticketTypes'] {
  return types
    .filter((t) => (t as Record<string, unknown>).is_active !== false)
    .map((t) => {
      const r = t as Record<string, unknown>;
      return {
        id: String(t.id),
        name: t.name,
        price: priceFromTicketApi(r.price ?? t.price),
        remaining: remainingFromTicketApiRow(r),
      };
    });
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
