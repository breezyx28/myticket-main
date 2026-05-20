import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Copy,
  MapPin,
  ShareNetwork,
  Star,
  Ticket as TicketIcon,
} from '@phosphor-icons/react';
import { EventCard as RichEventCard } from '@/components/cards/EventCard';
import {
  Carousel as ShadcnCarousel,
  CarouselContent as ShadcnCarouselContent,
  CarouselItem as ShadcnCarouselItem,
  CarouselNext as ShadcnCarouselNext,
  CarouselPrevious as ShadcnCarouselPrevious,
} from '@/components/ui/shadcn-carousel';
import { Badge } from '@/components/ui/Badge';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatAttendingLabel } from '@/lib/attendingFormat';
import {
  useGetEventBySlugQuery,
  useGetEventTicketTypesQuery,
  useJoinWaitlistMutation,
  useListAuctionsQuery,
  useListEventsQuery,
  useListMyRatingsQuery,
  useListMyTicketsQuery,
  useListMyWaitlistQuery,
  useSubmitRatingMutation,
} from '@/api/endpoints';
import type { EventListQuery } from '@/api/types/event';
import {
  eventHasPrimaryInventory,
  formatEventLocation,
  isEventSoldOut,
  mergeEventTicketTypes,
  eventListItemPublicPathSegment,
  eventListItemToCardProps,
} from '@/lib/eventMappers';
import { formatTicketRemainingLabel } from '@/lib/ticketTypeFromApi';
import { apiAuctionToMockAuctionListing } from '@/lib/auctionMappers';
import type { MockAuctionListing, MockEvent } from '@/types/domain';
import { cn } from '@/lib/utils';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

function EventCoverSlider({ slides }: { slides: string[] }) {
  const [activeCoverIdx, setActiveCoverIdx] = useState(0);
  const [coverApi, setCoverApi] = useState<NonNullable<UseEmblaCarouselType[1]>>();

  useEffect(() => {
    if (!coverApi) return;
    const onSelect = () => setActiveCoverIdx(coverApi.selectedScrollSnap());
    queueMicrotask(onSelect);
    coverApi.on('select', onSelect);
    coverApi.on('reInit', onSelect);
    return () => {
      coverApi.off('select', onSelect);
      coverApi.off('reInit', onSelect);
    };
  }, [coverApi]);

  if (slides.length === 0) return null;

  return (
    <div className="mt-4">
      <ShadcnCarousel opts={{ loop: true }} setApi={setCoverApi} className="w-full">
        <ShadcnCarouselContent>
          {slides.map((src) => (
            <ShadcnCarouselItem key={src} className="basis-full">
              <div className="overflow-hidden rounded-3xl border border-ink-10 bg-ink-5">
                <img src={src} alt="" className="aspect-[16/9] w-full object-cover" />
              </div>
            </ShadcnCarouselItem>
          ))}
        </ShadcnCarouselContent>
        {slides.length > 1 && (
          <>
            <ShadcnCarouselPrevious />
            <ShadcnCarouselNext />
          </>
        )}
      </ShadcnCarousel>
      {slides.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => coverApi?.scrollTo(idx)}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-all',
                idx === activeCoverIdx ? 'w-6 bg-coral' : 'bg-ink-20 hover:bg-ink-40',
              )}
              aria-label={`Show image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type EventWaitlistCtaProps = {
  joinedFromApi: boolean;
  eventSlugForApi: string;
  joiningWaitlist: boolean;
  joinWaitlist: ReturnType<typeof useJoinWaitlistMutation>[0];
  onJoined: () => void;
};

function EventWaitlistCta({
  joinedFromApi,
  eventSlugForApi,
  joiningWaitlist,
  joinWaitlist,
  onJoined,
}: EventWaitlistCtaProps) {
  const [optimisticJoined, setOptimisticJoined] = useState(false);
  const waitlistJoined = optimisticJoined || joinedFromApi;

  async function onJoinWaitlist() {
    if (waitlistJoined || joiningWaitlist) return;
    try {
      await joinWaitlist({ slug: eventSlugForApi }).unwrap();
      setOptimisticJoined(true);
      onJoined();
    } catch {
      /* keep button live so the user can retry */
    }
  }

  return (
    <>
      {waitlistJoined ? (
        <p className="text-center text-[12px] text-ink-60">You&apos;re on the waitlist — we&apos;ll notify you if tickets return.</p>
      ) : (
        <button
          type="button"
          onClick={() => void onJoinWaitlist()}
          disabled={joiningWaitlist}
          className="flex h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-white text-[14px] font-semibold text-ink hover:bg-ink-5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joiningWaitlist ? 'Joining…' : 'Join waitlist'}
        </button>
      )}
    </>
  );
}

function formatRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const sameDay = a.toDateString() === b.toDateString();
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (sameDay) {
    return `${a.toLocaleDateString('en-US', opts)} · ${a.toLocaleTimeString('en-US', time)} – ${b.toLocaleTimeString('en-US', time)}`;
  }
  return `${a.toLocaleString('en-US', { ...opts, ...time })} → ${b.toLocaleString('en-US', { ...opts, ...time })}`;
}

function formatRemaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / (1000 * 60 * 60));
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m left`;
}

function buildMapEmbedUrl(event: MockEvent) {
  if (event.lat != null && event.lng != null) {
    return `https://www.google.com/maps?q=${event.lat},${event.lng}&z=14&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(`${event.venue}, ${event.city}`)}&z=14&output=embed`;
}

function buildMapOpenUrl(event: MockEvent) {
  if (event.lat != null && event.lng != null) {
    return `https://www.google.com/maps?q=${event.lat},${event.lng}`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
}

function ShareRow({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 text-[12px] font-bold text-ink shadow-sm transition-colors hover:bg-ink-5"
      >
        <Copy size={16} weight="bold" />
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink hover:bg-ink-5"
      >
        X / Twitter
      </a>
      <a
        href={`https://wa.me/?text=${text}%20${encoded}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink hover:bg-ink-5"
      >
        WhatsApp
      </a>
      <a
        href={`mailto:?subject=${text}&body=${text}%0A${encoded}`}
        className="inline-flex items-center gap-2 rounded-full border border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink hover:bg-ink-5"
      >
        Email
      </a>
      <button
        type="button"
        onClick={() => {
          if (navigator.share) {
            void navigator.share({ title, url });
          } else {
            void copy();
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white hover:bg-ink-80"
      >
        <ShareNetwork size={16} weight="bold" />
        Share
      </button>
    </div>
  );
}

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const slugParam = (eventId ?? '').trim();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const showMarketplaceLinks = canBrowseMarketplace(user);

  const {
    data: detail,
    isLoading: detailIsLoading,
    isError: detailError,
  } = useGetEventBySlugQuery(slugParam ? { slug: slugParam } : { slug: '' }, {
    skip: !slugParam,
  });

  const { data: ticketTypesList } = useGetEventTicketTypesQuery(
    { slug: slugParam },
    { skip: !slugParam },
  );

  const { data: myRatingsData } = useListMyRatingsQuery(
    detail ? { subject_type: 'event', subject_id: detail.id } : { subject_type: 'event', subject_id: '' },
    { skip: !detail || !user }
  );
  const rated = (myRatingsData?.data ?? []).length > 0;
  const [submitRating, { isLoading: rateSubmitting }] = useSubmitRatingMutation();

  const { data: myWaitlist } = useListMyWaitlistQuery(undefined, { skip: !user });
  const myWaitlistEntries = useMemo(() => {
    if (!myWaitlist) return [];
    if (Array.isArray(myWaitlist)) return myWaitlist;
    return Array.isArray(myWaitlist.data) ? myWaitlist.data : [];
  }, [myWaitlist]);
  const waitlistJoinedFromApi = useMemo(() => {
    if (!detail) return false;
    return myWaitlistEntries.some((e) => String(e.event_id) === String(detail.id));
  }, [detail, myWaitlistEntries]);
  const [joinWaitlistMutation, { isLoading: joiningWaitlist }] = useJoinWaitlistMutation();

  const event: MockEvent | null | undefined = useMemo(() => {
    if (!slugParam) return null;
    if (detailError) return null;
    if (!detail) return detailIsLoading ? undefined : null;
    return mergeEventTicketTypes(detail, ticketTypesList);
  }, [slugParam, detailIsLoading, detailError, detail, ticketTypesList]);

  const relatedListQuery = useMemo((): EventListQuery => {
    const base: EventListQuery = { page: 1, per_page: 4 };
    if (!detail) return base;
    const r = detail as Record<string, unknown>;
    const cid = detail.category_id ?? r.category_id;
    if (cid != null && /^\d+$/.test(String(cid).trim())) {
      return { ...base, category: String(cid).trim() };
    }
    if (typeof detail.category === 'string' && /^\d+$/.test(detail.category.trim())) {
      return { ...base, category: detail.category.trim() };
    }
    return base;
  }, [detail]);

  const { data: relatedPaginated } = useListEventsQuery(relatedListQuery, { skip: !detail });
  const relatedEvents = useMemo(() => {
    if (!detail || !relatedPaginated?.data) return [];
    return relatedPaginated.data.filter((re) => String(re.id) !== String(detail.id)).slice(0, 3);
  }, [detail, relatedPaginated]);

  const { data: myTicketsPaged } = useListMyTicketsQuery(undefined, { skip: !user });
  const hasUsedTicket = useMemo(() => {
    if (!user || !detail) return false;
    const tickets = myTicketsPaged?.data ?? [];
    return tickets.some(
      (t) => String(t.event_id) === String(detail.id) && t.status === 'used',
    );
  }, [user, detail, myTicketsPaged]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#rate') return;
    const el = document.getElementById('rate');
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [event]);

  const ratingStats = useMemo(() => {
    if (!event) return { average: 0, count: 0 };
    const average = typeof event.rating === 'number' ? event.rating : 0;
    const count = typeof event.ratingCount === 'number' ? event.ratingCount : 0;
    return { average, count };
  }, [event]);
  const gallerySlides = useMemo(() => {
    if (!event) return [];
    const extra = [...event.gallery, ...(event.venueImages ?? [])].filter(Boolean);
    return Array.from(new Set(extra.length > 0 ? extra : event.coverImage ? [event.coverImage] : []));
  }, [event]);
  const { data: auctionListingsPaged } = useListAuctionsQuery(
    detail ? { event_id: detail.id, per_page: 50 } : { per_page: 50 },
    { skip: !detail }
  );
  const eventAuctionListings: MockAuctionListing[] = useMemo(
    () => (auctionListingsPaged?.data ?? []).map(apiAuctionToMockAuctionListing),
    [auctionListingsPaged]
  );

  if (!slugParam) {
    return <Navigate to="/events" replace />;
  }

  if (event === undefined) {
    return (
      <div className="px-6 py-24 text-center text-[14px] text-ink-40">Loading…</div>
    );
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-[16px] font-extrabold text-ink">This event could not be loaded</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-60">
          The link may be incorrect or the event is no longer available.
        </p>
        <Link
          to="/events"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[13px] font-semibold text-white transition-colors hover:bg-ink-80"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const avatars = event.attendeeAvatars?.slice(0, 3) ?? [];
  const avatarsHiddenCount = Math.max(0, (event.attendeeAvatars?.length ?? 0) - avatars.length);
  const ticketsBoughtCount = event.ticketsSold ?? event.attendingCount ?? 0;
  const boughtLabel = formatAttendingLabel(ticketsBoughtCount);
  const showTicketsBoughtRow = ticketsBoughtCount > 0 || avatars.length > 0;
  const locationLabel = formatEventLocation(event);
  const soldOut = isEventSoldOut(event.ticketsLeft);
  const hasInventory = eventHasPrimaryInventory(event.ticketsLeft);
  const mapEmbedUrl = buildMapEmbedUrl(event);
  const mapOpenUrl = buildMapOpenUrl(event);
  const org = event.organizer;
  const showOrganizerBlock = Boolean(org.id || org.name);

  async function onRate(stars: number) {
    if (!user || !detail) return;
    if (rated || rateSubmitting) return;
    try {
      await submitRating({ subject_type: 'event', subject_id: detail.id, stars }).unwrap();
    } catch {
      /* The mutation invalidates rating tags; if it fails the UI stays unchanged. */
    }
  }

  return (
    <div className="bg-white">
      <div className="relative aspect-[21/9] max-h-[420px] w-full overflow-hidden bg-ink-10">
        <img src={event.coverImage} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-lemon px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                {event.category}
              </span>
              {event.featured && (
                <span className="inline-block rounded-full bg-coral px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Featured
                </span>
              )}
              {soldOut ? (
                <span className="inline-block rounded-full bg-coral px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  No seats
                </span>
              ) : event.layoutType === 'free' ? (
                <span className="inline-block rounded-full bg-mint/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                  Free seating
                </span>
              ) : (
                <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                  Assigned seats
                </span>
              )}
              {ratingStats.count > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-ink">
                  <Star size={14} className="text-amber" weight="fill" />
                  {ratingStats.average.toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight tracking-tight text-white">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={16} weight="bold" />
                {formatRange(event.dateStart, event.dateEnd)}
              </span>
              {locationLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={16} weight="bold" />
                  {locationLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-10 lg:grid-cols-[1fr_340px] lg:px-8 lg:py-14">
        <div>
          {showTicketsBoughtRow || event.ticketsLeft !== null ? (
            <div className="rounded-3xl border border-ink-10 bg-surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {showTicketsBoughtRow ? (
                  <div className="flex items-center gap-3">
                    {avatars.length > 0 ? (
                      <AvatarGroup className="grayscale">
                        {avatars.map((avatar, idx) => (
                          <Avatar key={`${avatar}-${idx}`}>
                            <AvatarImage src={avatar} alt={`Attendee ${idx + 1}`} />
                            <AvatarFallback>{`U${idx + 1}`}</AvatarFallback>
                          </Avatar>
                        ))}
                        {avatarsHiddenCount > 0 && (
                          <AvatarGroupCount>{`+${avatarsHiddenCount}`}</AvatarGroupCount>
                        )}
                      </AvatarGroup>
                    ) : null}
                    <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <span className="font-mono text-[15px] font-extrabold text-ink">{boughtLabel}</span>
                      <span className="text-[12px] font-medium text-ink-60">tickets bought</span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
                {event.ticketsLeft !== null ? (
                  <Badge
                    label={soldOut ? 'Sold out' : `${event.ticketsLeft} left now`}
                    variant={soldOut ? 'danger' : 'success'}
                  />
                ) : hasInventory ? (
                  <Badge label="Tickets available" variant="success" />
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-40">Images & highlights</p>
                <h2 className="mt-1 text-lg font-extrabold text-ink">Event cover slider</h2>
              </div>
            </div>
            {gallerySlides.length > 0 && <EventCoverSlider key={event.id} slides={gallerySlides} />}
            {event.videoUrl && (
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-3xl border border-ink-10 bg-black">
                <iframe
                  src={event.videoUrl}
                  title="Event video"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-extrabold text-ink">About</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-60">{event.description}</p>
            {event.organizerNotes && (
              <div className="mt-5 rounded-2xl border border-lemon bg-lemon/15 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-ink-60">Note from organizer</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{event.organizerNotes}</p>
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-extrabold text-ink">Map & location</h2>
            <div className="mt-4 overflow-hidden rounded-3xl border border-ink-10 bg-ink-5">
              <iframe
                title="Map"
                className="aspect-[21/9] w-full min-h-[220px] border-0"
                loading="lazy"
                src={mapEmbedUrl}
              />
            </div>
            <a
              href={mapOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[13px] font-semibold text-coral hover:underline"
            >
              Open in Google Maps
            </a>
          </div>

          {(event.venueImages?.length ?? 0) > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-extrabold text-ink">Images of the event place</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {event.venueImages!.map((src) => (
                  <img key={src} src={src} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" />
                ))}
              </div>
            </div>
          )}

          {event.layoutType === 'seated' && (
            <div className="mt-10">
              <h2 className="text-lg font-extrabold text-ink">Seat map</h2>
              <p className="mt-2 text-[13px] text-ink-60">
                Interactive preview — full seat choice happens on the seat selection step before payment.
              </p>
              <div className="mt-4 flex aspect-[2/1] max-h-[320px] w-full items-center justify-center rounded-2xl border border-dashed border-ink-20 bg-ink-5/80">
                <svg viewBox="0 0 400 200" className="h-full w-full max-w-[640px] text-ink-20" aria-hidden>
                  <ellipse cx="200" cy="100" rx="180" ry="85" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text x="200" y="105" textAnchor="middle" className="fill-ink-40 text-[10px] font-sans">
                    STAGE
                  </text>
                  {[0, 1, 2, 3, 4].map((row) => (
                    <g key={row}>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
                        <rect
                          key={col}
                          x={60 + col * 32}
                          y={40 + row * 22}
                          width="14"
                          height="14"
                          rx="2"
                          className={cn(
                            'fill-white stroke-ink-20',
                            (row + col) % 3 === 0 ? 'fill-coral/30' : 'fill-mint/20'
                          )}
                        />
                      ))}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          <div id="rate" className="mt-10 scroll-mt-28 rounded-3xl border border-ink-10 bg-surface-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Ratings</h2>
                <p className="mt-1 text-[13px] text-ink-60">Stars only. Ratings appear after verified attendance.</p>
              </div>
              {ratingStats.count > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-ink-5 px-3 py-1.5 text-[13px] font-semibold text-ink">
                  <Star size={16} weight="fill" className="text-amber" />
                  {ratingStats.average.toFixed(1)}
                  <span className="text-ink-40">({ratingStats.count})</span>
                </div>
              ) : (
                <Badge label="No ratings yet" variant="outline" />
              )}
            </div>

            {user && hasUsedTicket && !rated ? (
              <div className="mt-4">
                <p className="text-[13px] text-ink-60">You can rate this event once.</p>
                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={rateSubmitting}
                      onClick={() => onRate(n)}
                      className="rounded-lg p-2 text-amber transition-transform hover:scale-110 disabled:opacity-50"
                      aria-label={`${n} stars`}
                    >
                      <Star size={30} weight="fill" />
                    </button>
                  ))}
                </div>
              </div>
            ) : rated && user && hasUsedTicket ? (
              <p className="mt-4 rounded-xl bg-ink-5 px-4 py-3 text-[13px] text-ink-60">
                Thanks, you already rated this event.
              </p>
            ) : (
              <p className="mt-4 text-[13px] text-ink-60">
                Attend the event with a used ticket to unlock rating.
              </p>
            )}
          </div>

          {showOrganizerBlock && (
            <div className="mt-10 rounded-3xl border border-ink-10 bg-ink-5/40 p-6">
              <h2 className="text-lg font-extrabold text-ink">Organizer profile</h2>
              <div className="mt-4 flex gap-4">
                {org.logo ? (
                  <img
                    src={org.logo}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl border border-ink-10 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-lemon text-[18px] font-extrabold text-ink">
                    {(org.name || org.code || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{org.name || 'Organizer'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-50">
                    {org.id ? (
                      <span>
                        ID: <span className="font-mono text-ink-60">{org.id}</span>
                      </span>
                    ) : null}
                    {org.code ? (
                      <span>
                        Code: <span className="font-mono text-ink-60">{org.code}</span>
                      </span>
                    ) : null}
                    {typeof org.eventsCount === 'number' ? (
                      <span className="font-semibold text-ink-60">
                        {org.eventsCount} event{org.eventsCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  {org.bio ? (
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{org.bio}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {org.slug?.trim() ? (
                      <Link
                        to={`/organizers/${encodeURIComponent(org.slug.trim())}`}
                        className="inline-flex items-center justify-center rounded-full border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink-80"
                      >
                        View organizer profile
                      </Link>
                    ) : (
                      <span
                        className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-ink-10 bg-ink-5 px-4 py-2 text-[13px] font-semibold text-ink-40"
                        title="This organizer has no public profile URL yet."
                      >
                        View organizer profile
                      </span>
                    )}
                    {org.name ? (
                      <Link
                        to={`/events?keyword=${encodeURIComponent(org.name)}`}
                        className="text-[13px] font-semibold text-coral hover:underline"
                      >
                        Search events by name
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {event.showTalents && event.talents.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-extrabold text-ink">Participated talents</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {event.talents.map((t) => (
                  <li key={t.id}>
                    <article className="rounded-2xl border border-ink-10 bg-white p-4">
                      <div className="flex items-start gap-3">
                        {t.photo ? (
                          <img src={t.photo} alt="" className="h-14 w-14 rounded-full object-cover" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-mint/40" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{t.name}</p>
                          <p className="mt-0.5 text-[12px] text-ink-40">{t.proficiency ?? 'Performer'}</p>
                          <Badge label="Participating" variant="default" className="mt-2 text-[10px]" />
                        </div>
                      </div>
                      {showMarketplaceLinks ? (
                        <Link
                          to={`/marketplace/talent/${t.slug ?? t.id}`}
                          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-ink-10 px-4 text-[12px] font-semibold text-ink hover:bg-ink-5"
                        >
                          View profile
                        </Link>
                      ) : (
                        <p className="mt-3 text-[11px] text-ink-40">
                          Marketplace profiles are visible to organizers and vendors.
                        </p>
                      )}
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.showVendors && event.vendors.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-extrabold text-ink">Vendors</h2>
              <ul className="mt-4 space-y-2">
                {event.vendors.map((v) => (
                  <li key={v.id}>
                    {showMarketplaceLinks ? (
                      <Link
                        to={`/marketplace/vendor/${v.slug ?? v.id}`}
                        className="flex items-center justify-between rounded-xl border border-ink-10 bg-white px-4 py-3 font-medium text-ink hover:border-coral"
                      >
                        <span>{v.name}</span>
                        <span className="text-[12px] text-ink-40">{v.serviceType}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-ink-10 bg-white px-4 py-3 font-medium text-ink">
                        <span>{v.name}</span>
                        <span className="text-[12px] text-ink-40">{v.serviceType}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 rounded-3xl border border-ink-10 bg-surface-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-ink">Auctioned tickets for this event</h2>
              <Badge label={`${eventAuctionListings.length} live listings`} variant="outline" />
            </div>
            {eventAuctionListings.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {eventAuctionListings.slice(0, 4).map((listing) => (
                  <li
                    key={listing.id}
                    className="rounded-2xl border border-ink-10 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {listing.listingCode && (
                          <p className="font-mono text-[11px] font-semibold text-ink-50">{listing.listingCode}</p>
                        )}
                        <p className="font-semibold text-ink">
                          {listing.seatLabel ?? listing.ticketTypeLabel ?? 'General admission'}
                        </p>
                        <p className="mt-1 text-[12px] text-ink-40">Seller: {listing.sellerLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[17px] font-black text-ink">
                          {listing.price} {listing.currency ?? 'SAR'}
                        </p>
                        {listing.originalPrice > listing.price && (
                          <p className="text-[12px] text-ink-40 line-through">
                            {listing.originalPrice} {listing.currency ?? 'SAR'}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] font-semibold text-coral">{formatRemaining(listing.endsAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-ink-60">
                No resale tickets are live right now. Join waitlist updates or check back later.
              </p>
            )}
            <Link
              to={`/auction/events/${event.id}`}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-[13px] font-semibold text-white hover:bg-ink-80"
            >
              Open auction for this event
            </Link>
          </div>

          {relatedEvents.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-extrabold text-ink">Related events</h2>
              <p className="mt-1 text-[13px] text-ink-60">You may also like these nearby picks.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedEvents.map((re) => {
                  const props = eventListItemToCardProps(re);
                  return (
                    <RichEventCard
                      key={re.id}
                      {...props}
                      onClick={() =>
                        navigate(`/events/${encodeURIComponent(eventListItemPublicPathSegment(re))}`)
                      }
                      className="w-full"
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-10 border-t border-ink-10 pt-8">
            <h2 className="text-lg font-extrabold text-ink">Share</h2>
            <p className="mt-2 text-[13px] text-ink-60">Send this event to friends or copy the link.</p>
            <div className="mt-4">
              <ShareRow title={event.title} url={url} />
            </div>
          </div>
        </div>

        <aside className="lg:pt-0">
          <div className="sticky top-24 rounded-3xl border border-ink-10 bg-white p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
              <TicketIcon size={22} weight="fill" className="text-coral" />
              Tickets
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {soldOut ? (
                <Badge label="No seats" variant="danger" className="text-[11px] font-bold uppercase tracking-wide" />
              ) : event.layoutType === 'free' ? (
                <Badge label="Free seating" variant="success" className="text-[11px] font-bold uppercase tracking-wide" />
              ) : (
                <Badge label="Assigned seats" variant="default" className="text-[11px] font-bold uppercase tracking-wide" />
              )}
            </div>
            <p className="mt-2 text-[12px] text-ink-40">
              {soldOut
                ? 'There is no primary inventory left — try the waitlist or verified resale.'
                : event.layoutType === 'seated'
                  ? 'Choose your seats on the next screen, then pay on checkout.'
                  : 'Start a short ticket hold on the next screen (no seat map), then complete payment on checkout.'}
            </p>
            {event.ticketTypes.length > 0 && (
              <p className="mt-1 font-mono text-[13px] font-bold text-ink">
                {event.priceMin === event.priceMax
                  ? `From ${event.priceMin} SAR`
                  : `${event.priceMin} – ${event.priceMax} SAR`}
              </p>
            )}
            <ul className="mt-4 space-y-3">
              {event.ticketTypes.map((tt) => (
                <li
                  key={tt.id}
                  className="flex items-center justify-between rounded-xl border border-ink-10 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-ink">{tt.name}</p>
                    <p className="text-[12px] text-ink-40">{formatTicketRemainingLabel(tt.remaining)}</p>
                  </div>
                  <span className="font-mono text-[15px] font-bold text-ink">{tt.price} SAR</span>
                </li>
              ))}
            </ul>
            {hasInventory ? (
              <Link
                to={
                  event.layoutType === 'seated'
                    ? `/checkout/${event.id}/seats`
                    : `/checkout/${event.id}`
                }
                state={
                  event.layoutType === 'free'
                    ? {
                        selectedTicketTypeId: event.ticketTypes[0]?.id,
                        generalAdmissionQuantity: 1,
                      }
                    : undefined
                }
                className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-white transition-colors hover:bg-ink-80"
              >
                {event.layoutType === 'seated' ? 'Choose seats' : 'Continue to checkout'}
              </Link>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-center text-[13px] font-semibold text-coral">Sold out</p>
                {detail ? (
                  <EventWaitlistCta
                    key={String(detail.id)}
                    joinedFromApi={waitlistJoinedFromApi}
                    eventSlugForApi={String(detail.slug ?? slugParam)}
                    joiningWaitlist={joiningWaitlist}
                    joinWaitlist={joinWaitlistMutation}
                    onJoined={() => {
                      pushNotification({
                        title: "You're on the waitlist",
                        body: `We'll notify you if tickets return for ${event.title}.`,
                        kind: 'waitlist',
                        href: `/events/${encodeURIComponent(String(detail.slug ?? slugParam))}`,
                      });
                    }}
                  />
                ) : null}
                <Link
                  to={`/auction/events/${event.id}`}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-ink-5 text-[13px] font-semibold text-ink hover:bg-ink-10"
                >
                  Check auction for resale
                </Link>
              </div>
            )}
            {hasInventory && (
              <Link
                to={`/auction/events/${event.id}`}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-ink-10 bg-white text-[13px] font-semibold text-ink hover:bg-ink-5"
              >
                View resale auction
              </Link>
            )}
            <div className="mt-4 rounded-xl border border-ink-10 bg-ink-5/50 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-40">Reminder</p>
              <p className="mt-1 text-[12px] text-ink-60">
                You will receive reminder notifications before event time based on platform settings.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
