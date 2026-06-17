import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock } from '@phosphor-icons/react';
import { useGetAuctionStatsQuery, useListAuctionsQuery } from '@/api/endpoints';
import { apiAuctionToMockAuctionListing } from '@/lib/auctionMappers';
import { PLATFORM_AUCTION_COMMISSION_PCT } from '@/lib/constants';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const PLACEHOLDER_PALETTE = [
  'bg-gradient-to-br from-coral/40 via-amber/30 to-lemon/40',
  'bg-gradient-to-br from-sky/40 via-mint/40 to-lemon/30',
  'bg-gradient-to-br from-amber/40 via-coral/30 to-blush/30',
  'bg-gradient-to-br from-mint/40 via-sky/30 to-lavender/40',
  'bg-gradient-to-br from-lavender/40 via-blush/30 to-coral/30',
  'bg-gradient-to-br from-lemon/40 via-mint/30 to-sky/40',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function placeholderClass(eventId: string): string {
  const palette = PLACEHOLDER_PALETTE[hashString(eventId) % PLACEHOLDER_PALETTE.length];
  return palette ?? PLACEHOLDER_PALETTE[0]!;
}

interface EventCardData {
  eventId: string;
  title: string;
  city: string;
  venue: string;
}

export function AuctionPage() {
  const { t } = useTranslation('auction');
  const now = useNow();

  function formatRemaining(ms: number) {
    if (ms <= 0) return t('ended');
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useGetAuctionStatsQuery();
  const {
    data: listingsPaged,
    isLoading: listingsLoading,
    isError: listingsError,
  } = useListAuctionsQuery({ per_page: 200 });

  const isLoading = statsLoading || listingsLoading;
  const isError = statsError || listingsError;

  const cards = useMemo<EventCardData[]>(() => {
    const apiListings = listingsPaged?.data ?? [];
    if (apiListings.length === 0) return [];
    const map = new Map<string, EventCardData>();
    for (const raw of apiListings) {
      const l = apiAuctionToMockAuctionListing(raw);
      const eventId = String(l.eventId);
      if (map.has(eventId)) continue;
      map.set(eventId, {
        eventId,
        title: l.eventTitle || t('fallbackEvent'),
        city: l.city,
        venue: l.venue,
      });
    }
    const items = [...map.values()];
    items.sort((a, b) => {
      const na = stats?.nearest_end?.[a.eventId] ?? '';
      const nb = stats?.nearest_end?.[b.eventId] ?? '';
      return new Date(na).getTime() - new Date(nb).getTime();
    });
    return items;
  }, [listingsPaged, stats, t]);

  const totalActive = listingsPaged?.data?.length ?? 0;

  return (
    <div className="bg-ink-5/40 pb-20 pt-10">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-40">{t('eyebrow')}</span>
        <h1 className="mt-2 text-[36px] font-extrabold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-60">
          {t('lead', { pct: PLATFORM_AUCTION_COMMISSION_PCT })}
        </p>

        {!isLoading && !isError && (
          <p className="mt-4 text-[13px] text-ink-40">
            {t('stats', { listings: totalActive, events: cards.length })}
          </p>
        )}

        {isLoading && <p className="mt-10 text-center text-[13px] text-ink-40">{t('loading')}</p>}
        {isError && !isLoading && (
          <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
            {t('error')}
          </p>
        )}

        {!isLoading && !isError && (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => {
              const n = stats?.by_event?.[c.eventId] ?? 0;
              const end = stats?.nearest_end?.[c.eventId];
              const ms = end ? new Date(end).getTime() - now : 0;
              const timeLabel = end ? formatRemaining(ms) : '—';
              return (
                <article
                  key={c.eventId}
                  className="overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm transition-shadow hover:shadow-card-md"
                >
                  <Link
                    to={`/auction/events/${c.eventId}`}
                    className={`block aspect-[16/10] ${placeholderClass(c.eventId)}`}
                    aria-label={c.title}
                  />
                  <div className="p-4">
                    <h2 className="font-extrabold text-ink">
                      <Link to={`/auction/events/${c.eventId}`} className="hover:text-coral">
                        {c.title}
                      </Link>
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-[12px] font-medium text-ink-60">
                      <Clock size={16} className="text-coral" />
                      {t('resaleTickets', { count: n, time: timeLabel })}
                    </p>
                    {c.city && <p className="mt-2 text-[13px] text-ink-40">{c.city}</p>}
                    <Link
                      to={`/auction/events/${c.eventId}`}
                      className="mt-4 inline-block text-[13px] font-bold text-coral hover:underline"
                    >
                      {t('viewListings')} →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !isError && cards.length === 0 && (
          <p className="mt-12 text-center text-[15px] text-ink-40">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
