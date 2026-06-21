import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CaretDown, MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react';
import { EventCard } from '@/components/cards/EventCard';
import {
  useGetEventCategoriesQuery,
  useGetEventCitiesQuery,
  useListEventsQuery,
} from '@/api/endpoints';
import type { EventLayoutType, EventListQuery } from '@/api/types/event';
import type { EventCategoryRef } from '@/api/types/reference';
import { pickLocalizedName, type AppLanguage } from '@/i18n';
import { eventListItemToCardProps } from '@/lib/eventMappers';
import { cn } from '@/lib/utils';
import {
  clearEventsFilterDraft,
  readEventsFilterDraft,
  writeEventsFilterDraft,
} from '@/lib/formDraftStorage';

const PER_PAGE = 12;

const EMPTY_EVENT_CATEGORIES: EventCategoryRef[] = [];

export function EventsPage() {
  const { t, i18n } = useTranslation('eventsPage');
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const featured = searchParams.get('featured') === 'true';
  const keywordFromUrl = searchParams.get('keyword')?.trim() ?? '';
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [category, setCategory] = useState<string>(() => searchParams.get('category')?.trim() || 'all');
  const [city, setCity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [layoutType, setLayoutType] = useState<'all' | 'seated' | 'free'>('all');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);

  function clearAllFilters() {
    setKeyword('');
    setCategory('all');
    setCity('all');
    setDateFrom('');
    setDateTo('');
    setPriceMin('');
    setPriceMax('');
    setLayoutType('all');
    setAvailabilityOnly(false);
    setAdvancedOpen(false);
    setPage(1);
    clearEventsFilterDraft();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      next.delete('featured');
      next.delete('keyword');
      return next;
    });
  }

  const { data: categoriesResp } = useGetEventCategoriesQuery();
  const { data: citiesResp } = useGetEventCitiesQuery();
  const categories = categoriesResp?.data ?? EMPTY_EVENT_CATEGORIES;
  const cities = citiesResp?.data ?? [];

  /** Numeric category id for `GET /events?category=`; omits slug until taxonomy loads. */
  const categoryQueryParam = useMemo((): string | undefined => {
    if (category === 'all') return undefined;
    if (/^\d+$/.test(category)) {
      if (categories.length === 0) return category;
      return categories.some((c) => String(c.id) === category) ? category : undefined;
    }
    if (categories.length === 0) return undefined;
    const m = categories.find((x) => String(x.slug).toLowerCase() === category.toLowerCase());
    return m ? String(m.id) : undefined;
  }, [category, categories]);

  const categorySelectValue = useMemo(() => {
    if (category === 'all') return 'all';
    if (/^\d+$/.test(category)) {
      if (categories.length === 0) return category;
      return categories.some((c) => String(c.id) === category) ? category : 'all';
    }
    if (categories.length === 0) return category;
    const m = categories.find((c) => String(c.slug).toLowerCase() === category.toLowerCase());
    return m ? String(m.id) : 'all';
  }, [category, categories]);

  const query: EventListQuery = useMemo(() => {
    const q: EventListQuery = { page, per_page: PER_PAGE };
    const kw = keyword.trim();
    if (kw) q.keyword = kw;
    if (categoryQueryParam) q.category = categoryQueryParam;
    if (city !== 'all') q.city = city;
    if (dateFrom) q.date_from = dateFrom;
    if (dateTo) q.date_to = dateTo;
    if (priceMin) q.price_min = Number(priceMin);
    if (priceMax) q.price_max = Number(priceMax);
    if (layoutType !== 'all') q.layout_type = layoutType as EventLayoutType;
    if (availabilityOnly) q.availability_only = true;
    if (featured) q.featured = true;
    return q;
  }, [
    page,
    keyword,
    categoryQueryParam,
    city,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    layoutType,
    availabilityOnly,
    featured,
  ]);

  const { data: paginated, isFetching, isError } = useListEventsQuery(query);
  const events = paginated?.data ?? [];
  const currentPage = paginated?.current_page ?? page;
  const lastPage = paginated?.last_page ?? 1;
  const total = paginated?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [
    keyword,
    categoryQueryParam,
    city,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    layoutType,
    availabilityOnly,
    featured,
  ]);

  useEffect(() => {
    const c = searchParams.get('category')?.trim();
    setCategory(c && c.length > 0 ? c : 'all');
    setKeyword(searchParams.get('keyword')?.trim() ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (category === 'all') return;
    if (categories.length === 0) return;

    if (/^\d+$/.test(category)) {
      if (!categories.some((c) => String(c.id) === category)) {
        setCategory('all');
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('category');
          return next;
        }, { replace: true });
      }
      return;
    }

    const bySlug = categories.find((x) => String(x.slug).toLowerCase() === category.toLowerCase());
    if (bySlug) {
      const id = String(bySlug.id);
      setCategory(id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('category', id);
        return next;
      }, { replace: true });
      return;
    }

    setCategory('all');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      return next;
    }, { replace: true });
  }, [category, categories, setSearchParams]);

  useEffect(() => {
    const stored = readEventsFilterDraft();
    if (stored) {
      setKeyword(keywordFromUrl || stored.keyword);
      setCategory(searchParams.get('category')?.trim() || stored.category || 'all');
      setCity(stored.city);
      setDateFrom(stored.dateFrom);
      setDateTo(stored.dateTo);
      setPriceMin(stored.priceMin);
      setPriceMax(stored.priceMax);
      setLayoutType(stored.layoutType);
      setAvailabilityOnly(Boolean(stored.availabilityOnly));
      setAdvancedOpen(Boolean(stored.advancedOpen));
    }
    setDraftHydrated(true);
    // Mount hydration only: URL already seeds initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    writeEventsFilterDraft({
      keyword,
      category,
      city,
      dateFrom,
      dateTo,
      priceMin,
      priceMax,
      layoutType,
      availabilityOnly,
      advancedOpen,
    });
  }, [
    advancedOpen,
    availabilityOnly,
    category,
    city,
    dateFrom,
    dateTo,
    draftHydrated,
    keyword,
    layoutType,
    priceMax,
    priceMin,
  ]);

  return (
    <div className="bg-white">
      <div className="border-b border-ink-10 bg-ink-5/50">
        <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-8">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-40">{t('eyebrow')}</span>
          <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[40px]">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-60">
            {advancedOpen ? t('leadAdvanced') : t('leadSimple')}{' '}
            {featured && <span className="font-semibold text-ink">{t('featuredBanner')}</span>}
          </p>

          <div className="mt-8 rounded-[28px] border border-ink-10 bg-surface-card p-5 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="relative min-h-[48px] flex-1">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-40"
                  size={18}
                  weight="bold"
                />
                <input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  value={keyword}
                  onChange={(e) => {
                    const v = e.target.value;
                    setKeyword(v);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      if (v.trim()) next.set('keyword', v.trim());
                      else next.delete('keyword');
                      return next;
                    });
                  }}
                  className={cn(
                    'h-12 w-full rounded-full border-2 border-ink-10 bg-ink-5/70 pl-11 pr-4',
                    'text-[13px] font-medium text-ink placeholder:text-ink-40',
                    'transition-[border-color] duration-150',
                    'outline-none focus:border-coral'
                  )}
                />
              </div>
              <button
                type="button"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((o) => !o)}
                className={cn(
                  'inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 px-5',
                  'text-[12px] font-semibold transition-colors duration-150',
                  advancedOpen
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink-10 bg-white text-ink hover:border-ink/25 hover:bg-ink-5'
                )}
              >
                <SlidersHorizontal size={16} weight="bold" className="shrink-0" />
                <span className="whitespace-nowrap">{t('advancedFilters')}</span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={cn('shrink-0 transition-transform duration-200', advancedOpen && 'rotate-180')}
                />
              </button>
            </div>

            {advancedOpen && (
              <>
                <div
                  className="my-6 h-px w-full border-t border-dashed border-ink-10"
                  aria-hidden
                />
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                      {t('refineResults')}
                    </span>
                    <span className="rounded-full bg-lemon/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                      {t('optional')}
                    </span>
                  </div>
                  {featured && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.delete('featured');
                          return next;
                        });
                      }}
                      className="text-[11px] font-semibold text-coral underline underline-offset-2 transition-colors hover:text-coral-dark"
                    >
                      {t('clearFeatured')}
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                      {t('category')}
                    </span>
                    <select
                      value={categorySelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCategory(v);
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          if (v === 'all') next.delete('category');
                          else next.set('category', v);
                          return next;
                        });
                      }}
                      className={cn(
                        'h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] font-medium text-ink',
                        'outline-none transition-colors focus:border-coral'
                      )}
                    >
                      <option value="all">{t('allCategories')}</option>
                      {category !== 'all' &&
                        !/^\d+$/.test(category) &&
                        categories.length === 0 && (
                          <option value={category}>{category}</option>
                        )}
                      {categories.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {pickLocalizedName(c, language) || c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('city')}</span>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] font-medium text-ink outline-none transition-colors focus:border-coral"
                    >
                      <option value="all">{t('allCities')}</option>
                      {cities.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {pickLocalizedName(c, language) || c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('dateFrom')}</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] text-ink outline-none focus:border-coral"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('dateTo')}</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] text-ink outline-none focus:border-coral"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                      {t('minPrice')}
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="font-mono h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] text-ink outline-none focus:border-coral"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                      {t('maxPrice')}
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder={t('priceAny')}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="font-mono h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] text-ink outline-none focus:border-coral"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('layout')}</span>
                    <select
                      value={layoutType}
                      onChange={(e) => setLayoutType(e.target.value as typeof layoutType)}
                      className="h-10 rounded-xl border-2 border-ink-10 bg-white px-3 text-[12px] font-medium text-ink outline-none focus:border-coral"
                    >
                      <option value="all">{t('layoutAny')}</option>
                      <option value="free">{t('layoutFree')}</option>
                      <option value="seated">{t('layoutSeated')}</option>
                    </select>
                  </label>
                  <label className="flex flex-col justify-end gap-1.5 sm:col-span-2 lg:col-span-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                      {t('availability')}
                    </span>
                    <div className="flex h-10 items-center gap-2.5 rounded-xl border-2 border-ink-10 bg-ink-5/50 px-3">
                      <input
                        type="checkbox"
                        id="avail-only"
                        checked={availabilityOnly}
                        onChange={(e) => setAvailabilityOnly(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-ink-20 text-coral"
                      />
                      <label htmlFor="avail-only" className="cursor-pointer text-[11px] font-medium text-ink">
                        {t('availabilityOnly')}
                      </label>
                    </div>
                  </label>
                </div>
              </>
            )}

            {!advancedOpen && featured && (
              <div className="mt-5 flex justify-end border-t border-ink-10 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete('featured');
                      return next;
                    });
                  }}
                  className="text-[11px] font-semibold text-coral underline underline-offset-2 transition-colors hover:text-coral-dark"
                >
                  Clear featured filter
                </button>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border-2 border-ink-10 bg-white px-5 text-[12px] font-semibold text-ink transition-colors duration-150 hover:border-ink/25 hover:bg-ink-5"
              >
                {t('clearAll')}
              </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-8">
        {isFetching && events.length === 0 ? (
          <p className="text-center text-[12px] text-ink-40">{t('loading')}</p>
        ) : isError ? (
          <p className="text-center text-[13px] text-coral">{t('error')}</p>
        ) : events.length === 0 ? (
          <p className="text-center text-[13px] text-ink-60">{t('empty')}</p>
        ) : (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const props = eventListItemToCardProps(e);
                return (
                  <EventCard
                    key={e.id}
                    {...props}
                    onClick={() => {
                      const seg = props.detailPathSegment?.trim();
                      if (!seg) return;
                      void navigate(`/events/${encodeURIComponent(seg)}`);
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-10 pt-6 sm:flex-row">
              <span className="text-[12px] font-medium text-ink-60">
                {t('pagination', { current: currentPage, last: lastPage, total })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isFetching}
                  className="rounded-full border-2 border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink transition-colors hover:border-ink/25 hover:bg-ink-5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage || isFetching}
                  className="rounded-full border-2 border-ink bg-ink px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-ink-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
