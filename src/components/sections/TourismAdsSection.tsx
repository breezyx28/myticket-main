import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { CaretLeft, CaretRight, Compass, Plus } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { TourismAdCard } from '@/components/cards/TourismAdCard';
import { useGetTourismAdsCarouselQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

function TourismAdSkeleton({ index }: { index: number }) {
  return (
    <div
      className="w-[300px] shrink-0 overflow-hidden rounded-[1.75rem] border border-ink-10 bg-white"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="aspect-[5/4] animate-pulse bg-gradient-to-br from-ink-5 via-ink-10/40 to-ink-5" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-ink-10" />
        <div className="h-3 w-full animate-pulse rounded bg-ink-10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-ink-10" />
      </div>
    </div>
  );
}

export function TourismAdsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ads = [], isFetching, isError } = useGetTourismAdsCarouselQuery();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

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
              Discover Saudi destinations
            </span>
            <h2 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              Tourism Ads
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-60">
              Curated places to visit, explore, and book experiences. Promote your
              destination and reach travelers across the platform.
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
              Add your Ad
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous ads"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollPrev
                    ? 'hover:border-ink-20 hover:bg-ink-5'
                    : 'cursor-not-allowed opacity-35',
                )}
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <button
                type="button"
                aria-label="Next ads"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScrollNext}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border border-ink-10 bg-white text-ink transition-colors',
                  canScrollNext
                    ? 'hover:border-ink-20 hover:bg-ink-5'
                    : 'cursor-not-allowed opacity-35',
                )}
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </motion.div>
        </div>

        <div ref={emblaRef} className="-mx-1 overflow-hidden">
          <div className="flex gap-5 px-1 pb-1">
            {isFetching ? (
              [0, 1, 2].map((i) => <TourismAdSkeleton key={i} index={i} />)
            ) : ads.length === 0 ? (
              <div className="w-full max-w-[640px] rounded-[1.75rem] border border-dashed border-ink-20 bg-white/70 px-8 py-12 backdrop-blur-sm">
                <p className="text-[18px] font-extrabold tracking-tight text-ink">
                  No destinations live yet
                </p>
                <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink-60">
                  Be the first to showcase your location. Submit your tourism ad for
                  admin review and appear in this carousel once approved.
                </p>
                <button
                  type="button"
                  onClick={goToSubmit}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
                >
                  <Plus size={16} weight="bold" />
                  Add your Ad
                </button>
              </div>
            ) : (
              ads.map((ad, index) => (
                <TourismAdCard
                  key={String(ad.id)}
                  ad={ad}
                  index={index}
                  onClick={() => navigate(`/tourism-ads/${ad.id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
