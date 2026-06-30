import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CaretLeft, CaretRight, Compass, Plus } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { TourismAdCard } from '@/components/cards/TourismAdCard';
import { useGetTourismAdsCarouselQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/shadcn-carousel';

function TourismAdSkeleton({ index }: { index: number }) {
  return (
    <div
      className="h-[240px] w-[min(92vw,600px)] shrink-0 animate-pulse overflow-hidden rounded-[1.75rem] bg-ink-80/50 sm:h-[260px] sm:w-[min(90vw,640px)]"
      style={{ animationDelay: `${index * 80}ms` }}
    />
  );
}

export function TourismAdsSection() {
  const { t, i18n } = useTranslation('landing');
  const isRtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ads = [], isFetching, isError } = useGetTourismAdsCarouselQuery();

  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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

  if (isError) {
    return null;
  }

  function goToSubmit() {
    if (!user) {
      navigate('/login', {
        state: { from: { pathname: '/tourism-ads/submit' } },
      });
      return;
    }
    navigate('/tourism-ads/submit');
  }

  return (
    <section className="relative overflow-hidden border-t border-ink-10 bg-gradient-to-b from-surface-warm/40 via-white to-white px-6 py-16 lg:px-8 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-teal/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-coral/8 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1280px]">
        <div className="mb-10 flex flex-col gap-6 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 110, damping: 22 }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-50">
              <Compass size={14} weight="fill" className="text-teal-dark" />
              {t('tourismAds.eyebrow')}
            </span>
            <h2 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              {t('tourismAds.title')}
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-60">
              {t('tourismAds.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 110, damping: 22, delay: 0.05 }}
            className="flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={goToSubmit}
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(13,13,13,0.45)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral text-white transition-transform duration-200 group-hover:rotate-90">
                <Plus size={16} weight="bold" />
              </span>
              {t('tourismAds.addAd')}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('tourismAds.prevAria')}
                onClick={() => api?.scrollPrev()}
                disabled={!canScrollPrev}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollPrev
                    ? 'hover:border-ink-20 hover:bg-ink-5'
                    : 'cursor-not-allowed opacity-35',
                )}
              >
                {isRtl ? <CaretRight size={18} weight="bold" /> : <CaretLeft size={18} weight="bold" />}
              </button>
              <button
                type="button"
                aria-label={t('tourismAds.nextAria')}
                onClick={() => api?.scrollNext()}
                disabled={!canScrollNext}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollNext
                    ? 'hover:border-ink-20 hover:bg-ink-5'
                    : 'cursor-not-allowed opacity-35',
                )}
              >
                {isRtl ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
              </button>
            </div>
          </motion.div>
        </div>

        {isFetching ? (
          <div className="flex gap-4 px-1 pb-1">
            {[0, 1, 2].map((i) => (
              <TourismAdSkeleton key={i} index={i} />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="w-full max-w-[640px] rounded-[1.75rem] border border-dashed border-ink-20 bg-white/70 px-8 py-12 backdrop-blur-sm">
            <p className="text-[18px] font-extrabold tracking-tight text-ink">
              {t('tourismAds.emptyTitle')}
            </p>
            <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink-60">
              {t('tourismAds.emptyBody')}
            </p>
            <button
              type="button"
              onClick={goToSubmit}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
            >
              <Plus size={16} weight="bold" />
              {t('tourismAds.addAd')}
            </button>
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
              {ads.map((ad, index) => (
                <CarouselItem key={String(ad.id)} className="basis-auto ps-4">
                  <TourismAdCard
                    ad={ad}
                    index={index}
                    onClick={() => navigate(`/tourism-ads/${ad.id}`)}
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
