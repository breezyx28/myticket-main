import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Buildings,
  CalendarBlank,
  EnvelopeSimple,
  FilePdf,
  Globe,
  InstagramLogo,
  MapPin,
  Phone,
  Star,
  Ticket,
  TiktokLogo,
  TwitterLogo,
} from '@phosphor-icons/react';
import {
  useGetOrganizerBySlugQuery,
  useGetOrganizerEventsQuery,
  useGetOrganizerRatingsQuery,
} from '@/api/endpoints';
import type { EventListItem } from '@/api/types/event';
import type { Organizer, OrganizerSocialLink, OrganizerVenue } from '@/api/types/organizer';
import { formatCardDateTime } from '@/lib/eventMappers';
import { pickRecentRatings } from '@/lib/marketplaceMappers';
import { resolvePublicStorageUrl } from '@/lib/organizerMedia';
import { cn } from '@/lib/utils';

function organizerLabel(o: { display_name?: string | null; name?: string | null }): string {
  const d = typeof o.display_name === 'string' ? o.display_name.trim() : '';
  if (d) return d;
  const n = typeof o.name === 'string' ? o.name.trim() : '';
  return n || 'Organizer';
}

function parseRatingAverage(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseCount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function organizerRatingCount(o: Organizer): number {
  const r = o as Record<string, unknown>;
  const v = o.ratings_count ?? o.rating_count ?? r.ratings_count ?? r.rating_count;
  return parseCount(v);
}

function isCompanyOrganizer(o: Organizer): boolean {
  if (typeof o.is_company === 'boolean') return o.is_company;
  return Number(o.is_company) === 1;
}

function humanizeOrganizerType(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  return String(raw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeExternalHref(raw: string): string {
  const t = raw.trim();
  if (!t) return '#';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function normalizeSocialLinks(o: Organizer): OrganizerSocialLink[] {
  const raw = o.social_links;
  if (!Array.isArray(raw)) return [];
  const out: OrganizerSocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const platform = typeof row.platform === 'string' ? row.platform.trim() : '';
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!platform || !url) continue;
    out.push({
      id: (row.id as OrganizerSocialLink['id']) ?? `${platform}-${url}`,
      platform,
      url,
      position: typeof row.position === 'number' ? row.position : undefined,
    });
  }
  out.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)));
  return out;
}

function socialPlatformLabel(platform: string): string {
  const p = platform.toLowerCase();
  const map: Record<string, string> = {
    website: 'Website',
    instagram: 'Instagram',
    twitter: 'X / Twitter',
    x: 'X / Twitter',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
  };
  return map[p] ?? platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === 'instagram') return <InstagramLogo size={18} weight="bold" className="shrink-0" />;
  if (p === 'twitter' || p === 'x') return <TwitterLogo size={18} weight="bold" className="shrink-0" />;
  if (p === 'tiktok') return <TiktokLogo size={18} weight="bold" className="shrink-0" />;
  return <Globe size={18} weight="bold" className="shrink-0" />;
}

function venueMapHref(v: OrganizerVenue): string | null {
  const lat = v.latitude != null ? String(v.latitude).trim() : '';
  const lng = v.longitude != null ? String(v.longitude).trim() : '';
  if (lat && lng) return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  const addr = typeof v.address_line === 'string' ? v.address_line.trim() : '';
  if (addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;
  return null;
}

function eventDetailHref(e: EventListItem): string {
  const r = e as Record<string, unknown>;
  const slug = typeof e.slug === 'string' && e.slug.trim() !== '' ? e.slug.trim() : null;
  if (slug) return `/events/${encodeURIComponent(slug)}`;
  const code = typeof e.code === 'string' && e.code.trim() !== '' ? e.code.trim() : null;
  if (code) return `/events/${encodeURIComponent(code)}`;
  for (const key of ['event_slug', 'public_slug'] as const) {
    const v = r[key];
    if (typeof v === 'string' && v.trim() !== '') return `/events/${encodeURIComponent(v.trim())}`;
  }
  return `/events/${encodeURIComponent(String(e.id))}`;
}

function previousEventsList(o: Organizer): EventListItem[] {
  const raw = o.previous_events;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is EventListItem => x != null && typeof x === 'object' && 'id' in x && 'title' in x);
}

export function OrganizerProfilePage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = useMemo(() => {
    if (!slugParam) return '';
    try {
      return decodeURIComponent(slugParam);
    } catch {
      return slugParam;
    }
  }, [slugParam]);

  const {
    data: organizer,
    isLoading: orgLoading,
    isError: orgError,
  } = useGetOrganizerBySlugQuery({ slug }, { skip: !slug });

  const { data: ratingsSummary, isFetching: ratingsLoading } = useGetOrganizerRatingsQuery(
    { slug },
    { skip: !slug },
  );

  const { data: eventsPaged, isFetching: eventsLoading } = useGetOrganizerEventsQuery(
    { slug, page: 1, per_page: 12 },
    { skip: !slug },
  );

  const displayName = organizer ? organizerLabel(organizer) : '';
  const logo = organizer?.logo_url?.trim() ? organizer.logo_url.trim() : undefined;
  const socialRows = useMemo(() => (organizer ? normalizeSocialLinks(organizer) : []), [organizer]);
  const websiteFromSocial = useMemo(
    () => socialRows.find((s) => s.platform.toLowerCase() === 'website')?.url,
    [socialRows],
  );
  const websiteHref =
    (organizer?.website && String(organizer.website).trim()) || websiteFromSocial || null;

  const recentRatings = useMemo(() => pickRecentRatings(ratingsSummary, 5), [ratingsSummary]);
  const eventRows = eventsPaged?.data ?? [];
  const pastEvents = useMemo(() => (organizer ? previousEventsList(organizer) : []), [organizer]);

  const summaryAverageRaw: unknown = ratingsSummary?.average;
  const summaryAverage =
    typeof summaryAverageRaw === 'number' && !Number.isNaN(summaryAverageRaw)
      ? summaryAverageRaw
      : typeof summaryAverageRaw === 'string' && summaryAverageRaw.trim() !== ''
        ? Number.parseFloat(summaryAverageRaw)
        : null;
  const summaryAverageNum =
    summaryAverage != null && Number.isFinite(summaryAverage) ? summaryAverage : null;

  const organizerAvg = organizer ? parseRatingAverage(organizer.rating_average) : 0;
  const displayRating = summaryAverageNum ?? organizerAvg;
  const ratingsCount =
    (typeof ratingsSummary?.count === 'number' && !Number.isNaN(ratingsSummary.count)
      ? ratingsSummary.count
      : null) ?? (organizer ? organizerRatingCount(organizer) : 0);

  const totalEvents = organizer ? parseCount(organizer.total_events) : 0;

  const documentHref = organizer?.document_url
    ? resolvePublicStorageUrl(String(organizer.document_url))
    : null;
  const galleryResolved = useMemo(() => {
    if (!organizer?.gallery_urls?.length) return [];
    return organizer.gallery_urls
      .map((u) => resolvePublicStorageUrl(String(u)))
      .filter((x): x is string => Boolean(x));
  }, [organizer]);

  const venues = useMemo(() => {
    if (!organizer?.venues?.length) return [];
    return [...organizer.venues].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [organizer]);

  if (!slugParam || !slug) {
    return <Navigate to="/events" replace />;
  }

  if (orgLoading) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }

  if (orgError || !organizer) {
    return (
      <div className="bg-white pb-20 pt-10">
        <div className="mx-auto max-w-[960px] px-6 lg:px-8">
          <Link to="/events" className="text-[13px] font-semibold text-coral hover:underline">
            ← Events
          </Link>
          <p className="mt-8 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-[14px] font-semibold text-coral">
            Organizer not found or unavailable.
          </p>
        </div>
      </div>
    );
  }

  const typeLabel = humanizeOrganizerType(organizer.organizer_type ?? undefined);
  const companyLine =
    isCompanyOrganizer(organizer) && organizer.company_name?.trim()
      ? organizer.company_name.trim()
      : null;
  const companyInfo = organizer.company_info?.trim() || null;

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[960px] px-6 lg:px-8">
        <Link to="/events" className="text-[13px] font-semibold text-coral hover:underline">
          ← Events
        </Link>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-48 w-48 shrink-0 rounded-2xl border border-ink-10 object-cover md:h-56 md:w-56"
            />
          ) : (
            <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-lemon text-4xl font-extrabold text-ink md:h-56 md:w-56">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-coral">Organizer</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">{displayName}</h1>
            {companyLine && companyLine !== displayName ? (
              <p className="mt-1 text-[15px] font-semibold text-ink-60">{companyLine}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {organizer.code ? (
                <span className="rounded-full border border-ink-10 bg-ink-5 px-3 py-1 text-[11px] font-mono font-semibold text-ink">
                  {organizer.code}
                </span>
              ) : null}
              {typeLabel ? (
                <span className="rounded-full border border-ink-10 bg-white px-3 py-1 text-[11px] font-semibold text-ink-70">
                  {typeLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-60">
              <span className="inline-flex items-center gap-1.5">
                <Ticket size={16} className="text-ink-40" weight="bold" />
                <span>
                  <span className="font-semibold text-ink">{totalEvents}</span> events
                </span>
              </span>
            </div>
            <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-[14px] text-ink-60">
              <Star size={18} className="text-amber" weight="fill" />
              <span className="font-semibold text-ink">{displayRating.toFixed(1)}</span>
              <span className="text-ink-40">({ratingsCount} ratings)</span>
              {ratingsLoading ? <span className="text-[12px] text-ink-40"> · loading…</span> : null}
            </p>
            {organizer.city ? (
              <p className="mt-2 flex items-center gap-1.5 text-[14px] text-ink-60">
                <MapPin size={16} className="shrink-0 text-coral" weight="bold" />
                {organizer.city}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {organizer.contact_email?.trim() ? (
                <a
                  href={`mailto:${encodeURIComponent(organizer.contact_email.trim())}`}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-coral hover:underline"
                >
                  <EnvelopeSimple size={18} weight="bold" />
                  {organizer.contact_email.trim()}
                </a>
              ) : null}
              {organizer.contact_phone?.trim() ? (
                <a
                  href={`tel:${organizer.contact_phone.trim().replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-coral hover:underline"
                >
                  <Phone size={18} weight="bold" />
                  {organizer.contact_phone.trim()}
                </a>
              ) : null}
            </div>

            {organizer.bio ? (
              <p className="mt-6 text-[15px] leading-relaxed text-ink-70">{organizer.bio}</p>
            ) : null}
            {companyInfo ? (
              <div className="mt-4 rounded-2xl border border-ink-10 bg-ink-5/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-40">Company</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-70">{companyInfo}</p>
              </div>
            ) : null}

            {websiteHref ? (
              <a
                href={safeExternalHref(websiteHref)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-coral hover:underline"
              >
                <Globe size={18} weight="bold" />
                Visit website
              </a>
            ) : null}

            {socialRows.length > 0 ? (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-40">Social</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {socialRows.map((s) => (
                    <li key={String(s.id)}>
                      <a
                        href={safeExternalHref(s.url)}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border border-ink-10 bg-white px-3 py-2',
                          'text-[12px] font-semibold text-ink transition-colors hover:border-coral/40 hover:bg-ink-5',
                        )}
                      >
                        <SocialIcon platform={s.platform} />
                        {socialPlatformLabel(s.platform)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {documentHref ? (
          <section className="mt-10 rounded-2xl border border-ink-10 bg-ink-5/40 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-50">Document</h2>
            <a
              href={documentHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-coral hover:underline"
            >
              <FilePdf size={22} weight="fill" />
              View organizer document (PDF)
            </a>
          </section>
        ) : null}

        {galleryResolved.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-extrabold text-ink">Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {galleryResolved.map((src, i) => (
                <a
                  key={`${src}-${i}`}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-2xl border border-ink-10 bg-ink-5 ring-offset-2 transition-shadow hover:ring-2 hover:ring-coral/30"
                >
                  <img src={src} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {venues.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-extrabold text-ink">Venues</h2>
            <ul className="mt-4 space-y-4">
              {venues.map((v) => {
                const mapHref = venueMapHref(v);
                return (
                  <li
                    key={String(v.id)}
                    className="rounded-2xl border border-ink-10 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-[16px] font-extrabold text-ink">
                          <Buildings size={20} className="text-coral" weight="bold" />
                          {v.name}
                          {v.is_default ? (
                            <span className="rounded-full bg-lemon/80 px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                              Default
                            </span>
                          ) : null}
                        </p>
                        {v.address_line ? (
                          <p className="mt-2 flex items-start gap-2 text-[13px] text-ink-60">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-ink-40" weight="bold" />
                            {v.address_line}
                          </p>
                        ) : null}
                        {typeof v.capacity === 'number' && v.capacity > 0 ? (
                          <p className="mt-2 text-[12px] text-ink-50">Capacity · {v.capacity.toLocaleString()}</p>
                        ) : null}
                        {v.facilities && v.facilities.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {v.facilities.map((f) => (
                              <li
                                key={f}
                                className="rounded-full bg-ink-5 px-2.5 py-0.5 text-[11px] font-semibold text-ink-70"
                              >
                                {f}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      {mapHref ? (
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-full border border-ink-10 bg-ink-5 px-4 py-2 text-[12px] font-semibold text-ink hover:bg-ink-10"
                        >
                          Map
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {recentRatings.length > 0 && (
          <section className="mt-12 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
            <h2 className="text-lg font-extrabold text-ink">Recent reviews</h2>
            <ul className="mt-4 space-y-4">
              {recentRatings.map((r) => (
                <li key={String(r.id)} className="rounded-xl border border-ink-10 bg-white p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <span>{r.user_name ?? 'User'}</span>
                    <span className="inline-flex items-center gap-0.5 text-amber">
                      <Star size={14} weight="fill" />
                      {r.stars}
                    </span>
                  </div>
                  {r.comment ? (
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{r.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-lg font-extrabold text-ink">Upcoming &amp; listed events</h2>
          {eventsLoading ? (
            <p className="mt-4 text-[13px] text-ink-40">Loading events…</p>
          ) : eventRows.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-40">No public events listed.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-10 rounded-2xl border border-ink-10 bg-white">
              {eventRows.map((e) => {
                const startAt = e.date_start ?? e.starts_at ?? '';
                const { date, time } = formatCardDateTime(startAt);
                return (
                  <li key={String(e.id)}>
                    <Link
                      to={eventDetailHref(e)}
                      className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-ink-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-ink">{e.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink-50">
                          {[e.venue ?? e.venue_name, e.city ?? e.city_name].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <p className="shrink-0 text-[12px] font-mono text-ink-60">
                        {date} · {time}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {pastEvents.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-extrabold text-ink">Previous events</h2>
            <ul className="mt-4 divide-y divide-ink-10 rounded-2xl border border-ink-10 bg-white">
              {pastEvents.map((e) => {
                const startAt = e.date_start ?? e.starts_at ?? '';
                const { date, time } = formatCardDateTime(startAt);
                return (
                  <li key={String(e.id)}>
                    <Link
                      to={eventDetailHref(e)}
                      className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-ink-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-2">
                        <CalendarBlank size={18} className="mt-0.5 shrink-0 text-ink-40" weight="bold" />
                        <div>
                          <p className="font-semibold text-ink">{e.title}</p>
                          <p className="mt-0.5 text-[12px] text-ink-50">
                            {[e.venue ?? e.venue_name, e.city ?? e.city_name].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-[12px] font-mono text-ink-60">
                        {date} · {time}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
