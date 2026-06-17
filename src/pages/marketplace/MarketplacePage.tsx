import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useListTalentsQuery, useListVendorsQuery, useGetMyRoleApplicationsQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { talentToMarketplaceTalent, vendorToMarketplaceVendor } from '@/lib/marketplaceMappers';
import { apiStatusToOnboardingStatus } from '@/lib/roleApplicationMappers';
import { cn } from '@/lib/utils';

const PER_PAGE = 12;

export function MarketplacePage() {
  const { t, i18n } = useTranslation('marketplace');
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { user } = useAuth();
  const { data: myRoleApps } = useGetMyRoleApplicationsQuery(undefined, { skip: !user });
  const vendorAppStatus = apiStatusToOnboardingStatus(myRoleApps?.vendor?.status);
  const organizerAppStatus = apiStatusToOnboardingStatus(myRoleApps?.organizer?.status);
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const [tab, setTab] = useState<'talent' | 'vendor'>(typeParam === 'vendor' ? 'vendor' : 'talent');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeParam === 'vendor') setTab('vendor');
    if (typeParam === 'talent') setTab('talent');
  }, [typeParam]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const talentQuery = useListTalentsQuery(
    { page, per_page: PER_PAGE },
    { skip: tab !== 'talent' }
  );
  const vendorQuery = useListVendorsQuery(
    { page, per_page: PER_PAGE },
    { skip: tab !== 'vendor' }
  );

  const talentPaginated = talentQuery.data;
  const vendorPaginated = vendorQuery.data;

  const isFetching = tab === 'talent' ? talentQuery.isFetching : vendorQuery.isFetching;
  const isError = tab === 'talent' ? talentQuery.isError : vendorQuery.isError;

  const talents = useMemo(
    () => (talentPaginated?.data ?? []).map((t) => talentToMarketplaceTalent(t, null, language)),
    [language, talentPaginated]
  );
  const vendors = useMemo(
    () => (vendorPaginated?.data ?? []).map((v) => vendorToMarketplaceVendor(v)),
    [vendorPaginated]
  );

  const paginated = tab === 'talent' ? talentPaginated : vendorPaginated;
  const currentPage = paginated?.current_page ?? page;
  const lastPage = paginated?.last_page ?? 1;
  const total = paginated?.total ?? 0;
  const list = tab === 'talent' ? talents : vendors;

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-40">{t('eyebrow')}</span>
        <h1 className="mt-2 text-[36px] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[44px]">
          {t('titleFull')}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-60">{t('lead')}</p>
        {user?.role === 'vendor' && (
          <p className="mt-4">
            <Link to="/engagements" className="text-[13px] font-bold text-coral underline-offset-2 hover:underline">
              {t('engagementInbox')}
            </Link>{' '}
            {t('engagementInboxHint')}
          </p>
        )}
        {user &&
          (vendorAppStatus === 'draft' ||
            vendorAppStatus === 'submitted' ||
            organizerAppStatus === 'draft' ||
            organizerAppStatus === 'submitted') && (
            <div className="mt-4 rounded-xl border border-ink-10 bg-ink-5/70 p-4 text-[13px] text-ink-60">
              <p className="font-semibold text-ink">{t('onboardingBanner')}</p>
              <p className="mt-1">
                {t('onboardingHint')}{' '}
                <Link to="/profile" className="font-semibold text-coral hover:underline">
                  {t('account')}
                </Link>{' '}
                {t('onboardingHintComplete')}
              </p>
            </div>
          )}

        <div className="mt-8 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('talent')}
            className={cn(
              'rounded-full px-5 py-2.5 text-[13px] font-bold transition-colors',
              tab === 'talent' ? 'bg-ink text-white' : 'bg-ink-5 text-ink-60 hover:bg-ink-10'
            )}
          >
            {t('tabTalents')}
          </button>
          <button
            type="button"
            onClick={() => setTab('vendor')}
            className={cn(
              'rounded-full px-5 py-2.5 text-[13px] font-bold transition-colors',
              tab === 'vendor' ? 'bg-ink text-white' : 'bg-ink-5 text-ink-60 hover:bg-ink-10'
            )}
          >
            {t('tabVendors')}
          </button>
        </div>

        {isFetching && list.length === 0 ? (
          <p className="mt-10 py-12 text-center text-[12px] text-ink-40">
            {tab === 'talent' ? t('loadingTalents') : t('loadingVendors')}
          </p>
        ) : isError ? (
          <p className="mt-10 py-12 text-center text-[13px] text-coral">{t('error')}</p>
        ) : list.length === 0 ? (
          <p className="mt-10 py-12 text-center text-[13px] text-ink-60">{t('empty')}</p>
        ) : (
          <>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {tab === 'talent'
                ? talents.map((t) => (
                    <Link
                      key={t.slug}
                      to={`/marketplace/talent/${t.slug}`}
                      className="group overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm transition-shadow hover:shadow-card-md"
                    >
                      <div className="aspect-square overflow-hidden bg-ink-10">
                        <img
                          src={t.image}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-coral">
                          {t.categories.slice(0, 2).join(' · ')}
                        </p>
                        <h2 className="mt-1 text-lg font-extrabold text-ink">{t.name}</h2>
                        <p className="mt-2 line-clamp-2 text-[13px] text-ink-60">{t.bio}</p>
                        <p className="mt-3 text-[12px] font-medium text-ink-40">
                          {t.city} · ★ {t.rating.toFixed(1)} · {t.availability}
                        </p>
                      </div>
                    </Link>
                  ))
                : vendors.map((v) => (
                    <Link
                      key={v.slug}
                      to={`/marketplace/vendor/${v.slug}`}
                      className="group overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm transition-shadow hover:shadow-card-md"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-ink-10">
                        <img
                          src={v.image}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-coral">
                          {v.serviceCategories.join(' · ')}
                        </p>
                        <h2 className="mt-1 text-lg font-extrabold text-ink">{v.name}</h2>
                        <p className="mt-2 line-clamp-2 text-[13px] text-ink-60">{v.bio}</p>
                        <p className="mt-3 text-[12px] font-medium text-ink-40">
                          {v.city} · ★ {v.rating.toFixed(1)}
                        </p>
                      </div>
                    </Link>
                  ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-10 pt-6 sm:flex-row">
              <span className="text-[12px] font-medium text-ink-60">
                {t('pagination', {
                  current: currentPage,
                  last: lastPage,
                  total,
                  type: tab === 'talent' ? t('typeTalents') : t('typeVendors'),
                })}
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
