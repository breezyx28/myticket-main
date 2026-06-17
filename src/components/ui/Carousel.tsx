import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import useEmblaCarousel from 'embla-carousel-react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface CarouselProps {
  children: ReactNode;
  title?: string;
  overline?: string;
  viewAllHref?: string;
  headerAction?: ReactNode;
  className?: string;
  loop?: boolean;
  variant?: 'light' | 'dark';
}

export function Carousel({
  children,
  title,
  overline,
  viewAllHref,
  headerAction,
  className,
  loop = false,
  variant = 'light',
}: CarouselProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop,
    dragFree: true,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

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

  const isDark = variant === 'dark';

  return (
    <div className={cn('w-full', className)}>
      {(title || overline) && (
        <div className="flex items-end justify-between mb-8">
          <div>
            {overline && (
              <span className={cn(
                'text-[11px] uppercase tracking-[0.14em] block mb-1.5 font-medium',
                isDark ? 'text-ink-40' : 'text-ink-40'
              )}>
                {overline}
              </span>
            )}
            {title && (
              <h2 className={cn(
                'font-extrabold text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.02em]',
                isDark ? 'text-white' : 'text-ink'
              )}>
                {title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-3">
            {headerAction}
            {viewAllHref && (
              <a
                href={viewAllHref}
                className={cn(
                  'text-[14px] font-semibold hover:underline underline-offset-2 me-2 hidden sm:block',
                  isDark ? 'text-white' : 'text-ink'
                )}
              >
                {t('landing:carousel.viewAll')}
              </a>
            )}
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer',
                isDark
                  ? 'bg-white text-ink'
                  : 'bg-ink text-white',
                canScrollPrev
                  ? isDark ? 'hover:bg-ink-10' : 'hover:bg-ink-80'
                  : 'opacity-30 cursor-not-allowed'
              )}
            >
              {isRtl ? <CaretRight size={18} weight="bold" /> : <CaretLeft size={18} weight="bold" />}
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer',
                isDark
                  ? 'bg-white text-ink'
                  : 'bg-ink text-white',
                canScrollNext
                  ? isDark ? 'hover:bg-ink-10' : 'hover:bg-ink-80'
                  : 'opacity-30 cursor-not-allowed'
              )}
            >
              {isRtl ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
            </button>
          </div>
        </div>
      )}
      <div ref={emblaRef} className="overflow-hidden -mx-1">
        <div className="flex gap-4 px-1">
          {children}
        </div>
      </div>
    </div>
  );
}
