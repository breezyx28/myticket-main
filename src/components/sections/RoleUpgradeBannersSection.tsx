import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Buildings,
  CaretLeft,
  CaretRight,
  MicrophoneStage,
  Storefront,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useGetMeQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { roleUpgradeBanners, type RoleUpgradeBanner } from '@/data/roleUpgradeBanners';
import {
  isRoleUpgradeAwaitingReview,
  PROFILE_ROLES_TAB_PATH,
} from '@/lib/roleUpgradeRequest';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/shadcn-carousel';

const ROLE_BADGE_ICONS: Record<RoleUpgradeBanner['id'], Icon> = {
  organizer: Buildings,
  vendor: Storefront,
  talent: MicrophoneStage,
};

type RoleUpgradeCopy = {
  roleLabel: string;
  title: string;
  titleAccent: string;
  summary: string;
  cta: string;
};

type RoleUpgradeBannerCardProps = {
  banner: RoleUpgradeBanner;
  copy: RoleUpgradeCopy;
  index: number;
  className?: string;
  onCta: () => void;
};

function RoleUpgradeBannerCard({
  banner,
  copy,
  index,
  className,
  onCta,
}: RoleUpgradeBannerCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const isLightCard = banner.id === 'vendor';
  const BadgeIcon = ROLE_BADGE_ICONS[banner.id];

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[1.5rem]',
        banner.cardClass,
        reduceMotion ? '' : 'transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
      style={reduceMotion ? undefined : { transitionDelay: `${Math.min(index * 40, 120)}ms` }}
    >
      <div className="relative z-10 flex h-full max-w-[58%] flex-col justify-between p-5 sm:max-w-[56%] sm:p-6">
        <div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
              banner.badgeClass,
            )}
          >
            <BadgeIcon size={12} weight="fill" />
            {copy.roleLabel}
          </span>

          <h3
            className={cn(
              'mt-2 text-[clamp(1.35rem,3.2vw,1.75rem)] font-extrabold leading-[1.05] tracking-tight',
              isLightCard ? 'text-ink' : 'text-white',
            )}
          >
            {copy.title}
            {copy.titleAccent ? (
              <span
                className={cn('block font-semibold', isLightCard ? 'text-ink-40' : 'text-white/55')}
              >
                {copy.titleAccent}
              </span>
            ) : null}
          </h3>

          <p
            className={cn(
              'mt-2 line-clamp-2 text-[11px] leading-snug sm:text-[12px]',
              isLightCard ? 'text-ink-60' : 'text-white/75',
            )}
          >
            {copy.summary}
          </p>
        </div>

        <button
          type="button"
          onClick={onCta}
          className={cn(
            'mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90',
            banner.ctaClass,
          )}
        >
          {copy.cta}
          <ArrowUpRight size={14} weight="bold" className="rtl:-scale-x-100" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 end-0 w-[40%] overflow-visible" aria-hidden>
        <img
          src={banner.image3d}
          alt=""
          className={cn(
            'absolute object-contain drop-shadow-[0_18px_32px_rgba(13,13,13,0.35)]',
            banner.imageClass,
            reduceMotion ? '' : 'transition-transform duration-500 group-hover:scale-[1.03]',
          )}
          loading="lazy"
          draggable={false}
        />
      </div>
    </article>
  );
}

type RoleUpgradeBannersSectionProps = {
  variant?: 'landing' | 'profile';
};

export function RoleUpgradeBannersSection({ variant = 'landing' }: RoleUpgradeBannersSectionProps) {
  const isProfile = variant === 'profile';
  const { t, i18n } = useTranslation(['landing', 'nav', 'profile']);
  const isRtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useGetMeQuery(undefined, { skip: !user });

  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api || isProfile) return;
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect, isProfile]);

  const cards = useMemo(() => {
    return roleUpgradeBanners.map((banner) => ({
      banner,
      copy: {
        roleLabel: t(`landing:${banner.id}Label`),
        title: t(`landing:${banner.id}Title`),
        titleAccent: t(`landing:${banner.id}Accent`),
        summary: t(`landing:${banner.id}Summary`),
        cta: t(`landing:${banner.id}Cta`),
      },
    }));
  }, [t]);

  function navigateWithAuthGuard(route: string) {
    if (!user) {
      navigate('/login', { state: { from: { pathname: route } } });
      return;
    }
    if (!isProfile && user.role !== 'guest') {
      navigate('/profile');
      return;
    }
    const request = me?.role_upgrade_request;
    if (request && isRoleUpgradeAwaitingReview(request)) {
      navigate(PROFILE_ROLES_TAB_PATH);
      return;
    }
    navigate(route);
  }

  const landingCardClass = 'h-[240px] w-[min(90vw,520px)] sm:h-[260px] sm:w-[min(88vw,560px)]';
  const profileCardClass = 'min-h-[220px] w-full sm:min-h-[240px]';

  return (
    <section
      className={cn(
        isProfile
          ? 'mt-10 rounded-2xl border border-ink-10 bg-white p-6'
          : 'relative overflow-hidden border-t border-ink-10 bg-ink-5 px-6 py-16 lg:px-8 lg:py-24',
      )}
    >
      <div className={cn(!isProfile && 'relative mx-auto max-w-[1280px]')}>
        <div
          className={cn(
            'flex flex-col gap-4',
            isProfile
              ? 'mb-6'
              : 'mb-8 gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between',
          )}
        >
          <div className={cn(isProfile ? 'max-w-xl' : 'max-w-2xl')}>
            <span
              className={cn(
                'font-semibold uppercase tracking-[0.14em] text-ink-40',
                isProfile ? 'text-[10px]' : 'text-[11px] text-ink-50',
              )}
            >
              {t('landing:roleUpgrade')}
            </span>
            <h2
              className={cn(
                'font-extrabold tracking-tight text-ink',
                isProfile
                  ? 'mt-1.5 text-balance text-lg'
                  : 'mt-3 text-[clamp(2rem,3.8vw,2.75rem)] leading-[1.05]',
              )}
            >
              {t('landing:roleUpgradeTitle')}
            </h2>
            {isProfile ? (
              <p className="mt-2 text-pretty text-[14px] leading-relaxed text-ink-60">
                {t('profile:rolesUpgrade.lead')}
              </p>
            ) : null}
          </div>

          {!isProfile ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('nav:previousBanners')}
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollPrev ? 'hover:border-ink-20 hover:bg-ink-5' : 'cursor-not-allowed opacity-35',
                )}
              >
                {isRtl ? <CaretRight size={18} weight="bold" /> : <CaretLeft size={18} weight="bold" />}
              </button>
              <button
                type="button"
                aria-label={t('nav:nextBanners')}
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollNext ? 'hover:border-ink-20 hover:bg-ink-5' : 'cursor-not-allowed opacity-35',
                )}
              >
                {isRtl ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
              </button>
            </div>
          ) : null}
        </div>

        {isProfile ? (
          <div className="flex flex-col gap-4">
            {cards.map(({ banner, copy }, index) => (
              <RoleUpgradeBannerCard
                key={banner.id}
                banner={banner}
                copy={copy}
                index={index}
                className={profileCardClass}
                onCta={() => navigateWithAuthGuard(banner.route)}
              />
            ))}
          </div>
        ) : (
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              containScroll: 'trimSnaps',
              dragFree: false,
              slidesToScroll: 1,
              direction: isRtl ? 'rtl' : 'ltr',
            }}
            className="-mx-1"
          >
            <CarouselContent className="-ms-4">
              {cards.map(({ banner, copy }, index) => (
                <CarouselItem key={banner.id} className="basis-auto ps-4">
                  <RoleUpgradeBannerCard
                    banner={banner}
                    copy={copy}
                    index={index}
                    className={landingCardClass}
                    onCta={() => navigateWithAuthGuard(banner.route)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>
    </section>
  );
}
