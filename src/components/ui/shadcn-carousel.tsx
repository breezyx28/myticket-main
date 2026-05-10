import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type CarouselContextProps = {
  viewportRef: (node: HTMLElement | null) => void;
  api: UseEmblaCarouselType[1];
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarouselCtx() {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) throw new Error('Carousel components must be used inside <Carousel>');
  return ctx;
}

interface CarouselProps {
  className?: string;
  children: React.ReactNode;
  opts?: Parameters<typeof useEmblaCarousel>[0];
  setApi?: (api: NonNullable<UseEmblaCarouselType[1]>) => void;
}

export function Carousel({ className, children, opts, setApi }: CarouselProps) {
  const [viewportRef, api] = useEmblaCarousel(opts);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((embla: NonNullable<UseEmblaCarouselType[1]>) => {
    setCanScrollPrev(embla.canScrollPrev());
    setCanScrollNext(embla.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('select', () => onSelect(api));
    api.on('reInit', () => onSelect(api));
    setApi?.(api);
  }, [api, onSelect, setApi]);

  return (
    <CarouselContext.Provider
      value={{ viewportRef: viewportRef as unknown as (node: HTMLElement | null) => void, api, canScrollPrev, canScrollNext, scrollPrev, scrollNext }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { viewportRef } = useCarouselCtx();
  return (
    <div ref={viewportRef} className="overflow-hidden">
      <div className={cn('flex -ml-4', className)}>{children}</div>
    </div>
  );
}

export function CarouselItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('min-w-0 shrink-0 grow-0 basis-full pl-4', className)}>{children}</div>;
}

export function CarouselPrevious({ className }: { className?: string }) {
  const { scrollPrev, canScrollPrev } = useCarouselCtx();
  return (
    <button
      type="button"
      onClick={scrollPrev}
      disabled={!canScrollPrev}
      className={cn(
        'absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-ink-10 bg-white p-2 text-ink shadow-sm transition hover:bg-ink-5 disabled:opacity-40',
        className
      )}
      aria-label="Previous slide"
    >
      <CaretLeft size={16} weight="bold" />
    </button>
  );
}

export function CarouselNext({ className }: { className?: string }) {
  const { scrollNext, canScrollNext } = useCarouselCtx();
  return (
    <button
      type="button"
      onClick={scrollNext}
      disabled={!canScrollNext}
      className={cn(
        'absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-ink-10 bg-white p-2 text-ink shadow-sm transition hover:bg-ink-5 disabled:opacity-40',
        className
      )}
      aria-label="Next slide"
    >
      <CaretRight size={16} weight="bold" />
    </button>
  );
}
