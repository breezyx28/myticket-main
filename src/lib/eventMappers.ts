import type { EventDetail, EventListItem } from '@/api/types/event';
import type { EventCardProps } from '@/components/cards/EventCard';
import type { LayoutType, MockEvent } from '@/types/domain';

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
 * Project an API `EventListItem` onto the shape `EventCard` expects, so the
 * card markup stays untouched while the data source moves from mocks to
 * `useListEventsQuery` / `useGetFeaturedEventsQuery`.
 *
 * `eventId` is intentionally set to the **slug** so existing `onClick` /
 * navigation handlers (`/events/${eventId}`) keep working — the route param
 * is treated as a slug end-to-end in Phase 3.
 */
export function eventListItemToCardProps(e: EventListItem): EventCardProps {
  const { date, time } = formatCardDateTime(e.date_start);
  const priceFrom = typeof e.price_min === 'number' ? e.price_min : 0;
  return {
    eventId: e.slug,
    title: e.title,
    category: e.category ?? 'Event',
    accentColor: accentForCategory(e.category),
    image: e.cover_image_url ?? '',
    date,
    time,
    venue: e.venue ?? '',
    city: e.city ?? '',
    priceFrom,
    rating: typeof e.rating_average === 'number' ? e.rating_average : null,
    isFeatured: Boolean(e.featured),
    isSoldOut: typeof e.tickets_left === 'number' ? e.tickets_left === 0 : false,
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
  const layoutType: LayoutType = detail.layout_type === 'seated' ? 'seated' : 'free';
  const ticketsLeft =
    typeof detail.tickets_left === 'number'
      ? detail.tickets_left
      : (fallback?.ticketsLeft ?? 0);
  const priceMin = typeof detail.price_min === 'number' ? detail.price_min : (fallback?.priceMin ?? 0);
  const priceMax = typeof detail.price_max === 'number' ? detail.price_max : (fallback?.priceMax ?? priceMin);
  return {
    id: detail.slug,
    title: detail.title,
    excerpt: detail.excerpt ?? fallback?.excerpt ?? '',
    description: detail.description ?? fallback?.description ?? '',
    coverImage: detail.cover_image_url ?? fallback?.coverImage ?? '',
    city: detail.city ?? fallback?.city ?? '',
    venue: detail.venue ?? fallback?.venue ?? '',
    category: detail.category ?? fallback?.category ?? 'Event',
    dateStart: detail.date_start,
    dateEnd: detail.date_end ?? detail.date_start,
    priceMin,
    priceMax,
    ticketsLeft,
    layoutType,
    featured: Boolean(detail.featured),
    organizer: {
      id: String(detail.organizer?.id ?? fallback?.organizer.id ?? ''),
      name: detail.organizer?.display_name ?? fallback?.organizer.name ?? '',
      logo: detail.organizer?.logo_url ?? fallback?.organizer.logo,
      bio: fallback?.organizer.bio ?? '',
    },
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
        : (fallback?.ratingCount ?? undefined),
    attendingCount: fallback?.attendingCount,
    attendeeAvatars: fallback?.attendeeAvatars,
    gallery: detail.gallery ?? fallback?.gallery ?? [],
    ticketTypes: (detail.ticket_types ?? fallback?.ticketTypes ?? []).map((t) => ({
      id: String(t.id),
      name: t.name,
      price: typeof t.price === 'number' ? t.price : Number(t.price),
      remaining: t.remaining,
    })),
    lat: detail.lat ?? fallback?.lat,
    lng: detail.lng ?? fallback?.lng,
    videoUrl: detail.video_url ?? fallback?.videoUrl,
    organizerNotes: detail.organizer_notes ?? fallback?.organizerNotes,
    venueImages: detail.venue_images ?? fallback?.venueImages,
  };
}
