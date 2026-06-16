import { ArrowUpRight, Compass, MapPin, Star } from '@phosphor-icons/react';
import type { TourismAdCarouselItem } from '@/api/types/tourismAd';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

interface TourismAdCardProps {
  ad: TourismAdCarouselItem;
  className?: string;
  index?: number;
  onClick?: () => void;
}

const IMAGE_MASK =
  'radial-gradient(ellipse 120% 160% at -12% 50%, transparent 0%, transparent 32%, rgba(0,0,0,0.45) 48%, rgba(0,0,0,0.88) 62%, #000 76%)';

const imageMaskStyle = {
  WebkitMaskImage: IMAGE_MASK,
  maskImage: IMAGE_MASK,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as const;

export function TourismAdCard({
  ad,
  className,
  index = 0,
  onClick,
}: TourismAdCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const cover = ad.cover_image_url || ad.gallery_urls[0] || '';
  const primaryService = ad.services?.[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-[240px] w-[min(92vw,600px)] shrink-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-ink-80 to-ink-90 text-left text-white sm:h-[260px] sm:w-[min(90vw,640px)]',
        reduceMotion ? '' : 'transition-transform duration-300 hover:-translate-y-0.5',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2',
        className,
      )}
      style={reduceMotion ? undefined : { transitionDelay: `${Math.min(index * 40, 120)}ms` }}
    >
      <div
        className={cn(
          'flex h-full w-fit min-w-[clamp(9.5rem,34%,13.5rem)] max-w-[clamp(13rem,62%,24rem)] shrink-0 flex-col justify-between p-5 sm:p-6',
        )}
      >
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
            {ad.is_pinned ? (
              <>
                <Star size={12} weight="fill" />
                Featured
              </>
            ) : (
              <>
                <Compass size={12} weight="fill" />
                Destination
              </>
            )}
          </span>

          <h3 className="mt-2 text-[clamp(1.25rem,2.8vw,1.65rem)] font-extrabold leading-[1.05] tracking-tight text-white">
            <span className="line-clamp-2">{ad.location_name}</span>
            {primaryService ? (
              <span className="mt-0.5 block font-semibold text-white/55 line-clamp-1">
                {primaryService}
              </span>
            ) : null}
          </h3>

          <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-white/72 sm:text-[12px]">
            {ad.description}
          </p>
        </div>

        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-opacity group-hover:opacity-90">
          <ArrowUpRight size={14} weight="bold" />
          Explore destination
        </span>
      </div>

      <div className="relative min-w-[38%] flex-1 overflow-hidden" aria-hidden>
        {cover ? (
          <img
            src={cover}
            alt=""
            className={cn(
              'absolute inset-y-0 end-0 h-full w-[118%] max-w-none origin-[center_right] object-cover',
              reduceMotion ? '' : 'transition-transform duration-500 group-hover:scale-[1.04]',
            )}
            style={imageMaskStyle}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-ink-90 text-white/35">
            <MapPin size={48} weight="duotone" />
          </div>
        )}
      </div>
    </button>
  );
}
