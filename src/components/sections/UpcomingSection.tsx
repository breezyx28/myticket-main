import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '@/components/cards/EventCard';
import { useListEventsQuery, useGetEventCategoriesQuery } from '@/api/endpoints';
import type { EventListQuery } from '@/api/types/event';
import { buildCategoryLabelMap, eventListItemToCardProps } from '@/lib/eventMappers';
import type { AppLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

const dateFilters = ['All', 'Today', 'This Week', 'This Month', 'Weekend'] as const;

type DateFilter = (typeof dateFilters)[number];

/** Convert a chip selection to `{ date_from, date_to }` ISO date strings (YYYY-MM-DD). */
function dateRangeForFilter(filter: DateFilter): { date_from?: string; date_to?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (filter === 'All') return {};
  if (filter === 'Today') {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 1);
    return { date_from: iso(startOfDay), date_to: iso(end) };
  }
  if (filter === 'This Week') {
    const day = startOfDay.getDay();
    const monday = new Date(startOfDay);
    monday.setDate(monday.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);
    return { date_from: iso(monday), date_to: iso(sunday) };
  }
  if (filter === 'This Month') {
    const first = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const next = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 1);
    return { date_from: iso(first), date_to: iso(next) };
  }
  if (filter === 'Weekend') {
    const day = startOfDay.getDay();
    const sat = new Date(startOfDay);
    sat.setDate(sat.getDate() + ((6 - day + 7) % 7));
    const mon = new Date(sat);
    mon.setDate(mon.getDate() + 2);
    return { date_from: iso(sat), date_to: iso(mon) };
  }
  return {};
}

const filterLabelKeys: Record<DateFilter, string> = {
  All: 'upcoming.filterAll',
  Today: 'upcoming.filterToday',
  'This Week': 'upcoming.filterThisWeek',
  'This Month': 'upcoming.filterThisMonth',
  Weekend: 'upcoming.filterWeekend',
};

export function UpcomingSection() {
  const { t, i18n } = useTranslation('landing');
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<DateFilter>('All');
  const { data: categoriesData } = useGetEventCategoriesQuery();
  const categoryById = useMemo(
    () => buildCategoryLabelMap(categoriesData?.data ?? [], language),
    [categoriesData, language],
  );

  const query = useMemo<EventListQuery>(() => {
    const range = dateRangeForFilter(activeFilter);
    return { availability_only: true, per_page: 8, ...range };
  }, [activeFilter]);

  const { data: paginated, isFetching, isError } = useListEventsQuery(query);
  const events = useMemo(() => {
    const list = paginated?.data ?? [];
    // Defensive sort by start date ascending in case the API doesn't guarantee ordering.
    const startKey = (s: { date_start?: string | null; starts_at?: string | null }) =>
      s.date_start ?? s.starts_at ?? '';
    return [...list].sort((a, b) => startKey(a).localeCompare(startKey(b)));
  }, [paginated]);

  return (
    <section className="bg-surface-tint px-6 lg:px-8 py-16 lg:py-24">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[11px] text-ink-40 uppercase tracking-[0.14em] block mb-1.5 font-medium">
              {t('upcoming.eyebrow')}
            </span>
            <h2 className="font-extrabold text-[36px] md:text-[48px] leading-[1.1] tracking-[-0.02em] text-ink">
              {t('upcoming.title')}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dateFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-2 rounded-full text-[13px] font-semibold transition-colors cursor-pointer',
                  activeFilter === filter
                    ? 'bg-ink text-white'
                    : 'bg-white text-ink-60 hover:bg-ink-10 border border-ink-10'
                )}
              >
                {t(filterLabelKeys[filter])}
              </button>
            ))}
          </div>
        </div>

        {isFetching && events.length === 0 ? (
          <p className="text-center text-[12px] text-ink-40">{t('upcoming.loading')}</p>
        ) : isError ? (
          <p className="text-center text-[13px] text-coral">{t('upcoming.error')}</p>
        ) : events.length === 0 ? (
          <p className="text-center text-[13px] text-ink-60">{t('upcoming.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {events.map((e) => {
              const props = eventListItemToCardProps(e, { language, categoryById });
              return (
                <EventCard
                  key={e.id}
                  {...props}
                  className="w-full"
                  onClick={() => {
                    const seg = props.detailPathSegment?.trim();
                    if (!seg) return;
                    void navigate(`/events/${encodeURIComponent(seg)}`);
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="flex justify-center mt-12">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-8 py-3 rounded-full text-[14px] font-semibold bg-white text-ink border-2 border-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
          >
            {t('upcoming.viewAll')}
          </button>
        </div>
      </div>
    </section>
  );
}
