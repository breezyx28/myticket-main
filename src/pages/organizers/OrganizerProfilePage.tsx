import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Star } from '@phosphor-icons/react';
import {
  useGetOrganizerBySlugQuery,
  useGetOrganizerEventsQuery,
  useGetOrganizerRatingsQuery,
} from '@/api/endpoints';
import type { EventListItem } from '@/api/types/event';
import { formatCardDateTime } from '@/lib/eventMappers';
import { pickRecentRatings } from '@/lib/marketplaceMappers';

function organizerLabel(o: { display_name?: string | null; name?: string | null }): string {
  const d = typeof o.display_name === 'string' ? o.display_name.trim() : '';
  if (d) return d;
  const n = typeof o.name === 'string' ? o.name.trim() : '';
  return n || 'Organizer';
}

function eventDetailHref(e: EventListItem): string {
  const key = e.slug ?? e.code ?? String(e.id);
  return `/events/${encodeURIComponent(String(key))}`;
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
  const logo = organizer?.logo_url ?? undefined;
  const recentRatings = useMemo(() => pickRecentRatings(ratingsSummary, 5), [ratingsSummary]);
  const eventRows = eventsPaged?.data ?? [];

  const summaryAverage =
    typeof ratingsSummary?.average === 'number' && !Number.isNaN(ratingsSummary.average)
      ? ratingsSummary.average
      : null;
  const apiAvg =
    typeof organizer?.rating_average === 'number' && !Number.isNaN(organizer.rating_average)
      ? organizer.rating_average
      : null;
  const displayRating = summaryAverage ?? apiAvg ?? 0;
  const ratingsCount = ratingsSummary?.count ?? organizer?.ratings_count ?? 0;

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
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-60">
              <span>
                ID: <span className="font-mono text-ink">{String(organizer.id)}</span>
              </span>
              {organizer.slug ? (
                <span>
                  Slug: <span className="font-mono text-ink">{String(organizer.slug)}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-ink-60">
              <Star size={18} className="text-amber" weight="fill" />
              <span className="font-semibold text-ink">{displayRating.toFixed(1)}</span>
              <span className="text-ink-40">({ratingsCount} ratings)</span>
              {ratingsLoading ? <span className="text-[12px] text-ink-40"> · loading…</span> : null}
            </p>
            {organizer.city ? (
              <p className="mt-1 text-[14px] text-ink-60">{organizer.city}</p>
            ) : null}
            {organizer.bio ? (
              <p className="mt-6 text-[15px] leading-relaxed text-ink-60">{organizer.bio}</p>
            ) : null}
            {organizer.website ? (
              <a
                href={organizer.website}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-[13px] font-semibold text-coral hover:underline"
              >
                Website
              </a>
            ) : null}
          </div>
        </div>

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
          <h2 className="text-lg font-extrabold text-ink">Events</h2>
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
                  <li key={String(e.slug ?? e.id)}>
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
      </div>
    </div>
  );
}
