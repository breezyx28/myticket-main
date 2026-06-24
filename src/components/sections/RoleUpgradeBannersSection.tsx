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
import { useAuth } from '@/contexts/AuthContext';
import { roleUpgradeBanners, type UpgradeRole } from '@/data/roleUpgradeBanners';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { getEffectiveLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/shadcn-carousel';

const ROLE_BADGE_ICONS: Record<UpgradeRole, Icon> = {
  organizer: Buildings,
  vendor: Storefront,
  talent: MicrophoneStage,
};

type RoleUpgradeBannersSectionProps = {
  variant?: 'landing' | 'profile';
};

export function RoleUpgradeBannersSection({ variant = 'landing' }: RoleUpgradeBannersSectionProps) {
  const isProfile = variant === 'profile';
  const { t } = useTranslation(['landing', 'nav', 'profile']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = usePrefersReducedMotion();

  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const currentLanguage = getEffectiveLanguage(user?.preferences.language);
  const isArabic = currentLanguage === 'ar';

  const onSelect = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

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
    navigate(route);
  }

  const cardSizeClass = isProfile
    ? 'h-[210px] w-[min(calc(100vw-4.5rem),420px)] sm:h-[228px]'
    : 'h-[240px] w-[min(90vw,520px)] sm:h-[260px] sm:w-[min(88vw,560px)]';

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
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
            isProfile ? 'mb-6 sm:flex-row sm:items-end sm:justify-between' : 'mb-8 gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between',
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
              <CaretLeft size={18} weight="bold" />
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
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        </div>

        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            containScroll: 'trimSnaps',
            dragFree: true,
          }}
          className="-mx-1"
        >
          <CarouselContent className="-ml-0 gap-4 px-1 pb-1">
            {cards.map(({ banner, copy }, index) => {
              const isLightCard = banner.id === 'vendor';
              const imageAlt = copy.roleLabel;
              const BadgeIcon = ROLE_BADGE_ICONS[banner.id];

              return (
                <CarouselItem
                  key={banner.id}
                  className="basis-auto pl-0"
                >
                  <article
                    className={cn(
                      'group relative overflow-hidden rounded-[1.5rem]',
                      cardSizeClass,
                      banner.cardClass,
                      reduceMotion ? '' : 'transition-transform duration-300 hover:-translate-y-0.5',
                    )}
                    style={reduceMotion ? undefined : { transitionDelay: `${Math.min(index * 40, 120)}ms` }}
                  >
                    <div
                      className={cn(
                        'relative z-10 flex h-full max-w-[58%] flex-col justify-between p-5 sm:max-w-[56%] sm:p-6',
                      )}
                    >
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
                              className={cn(
                                'block font-semibold',
                                isLightCard ? 'text-ink-40' : 'text-white/55',
                              )}
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
                        onClick={() => navigateWithAuthGuard(banner.route)}
                        className={cn(
                          'mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90',
                          banner.ctaClass,
                        )}
                      >
                        <ArrowUpRight size={14} weight="bold" />
                        {copy.cta}
                      </button>
                    </div>

                    <div
                      className="pointer-events-none absolute inset-y-0 end-0 w-[48%] overflow-visible"
                      aria-hidden
                    >
                      <img
                        src={banner.image3d}
                        alt={imageAlt}
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
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
