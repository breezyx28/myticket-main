import { ArrowUpRight, MapPin } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import type { TourismAdCarouselItem } from '@/api/types/tourismAd';
import { cn } from '@/lib/utils';

interface TourismAdCardProps {
  ad: TourismAdCarouselItem;
  className?: string;
  index?: number;
  onClick?: () => void;
}

export function TourismAdCard({
  ad,
  className,
  index = 0,
  onClick,
}: TourismAdCardProps) {
  const cover = ad.cover_image_url || ad.gallery_urls[0] || '';
  const services = ad.services?.slice(0, 3) ?? [];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 22,
        delay: index * 0.06,
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative flex w-[300px] flex-col overflow-hidden rounded-[1.75rem] border border-ink-10/80 bg-white text-left shadow-[0_20px_40px_-18px_rgba(13,13,13,0.18)] transition-shadow duration-300 hover:shadow-[0_28px_50px_-20px_rgba(13,13,13,0.22)] focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2',
        className,
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-ink-5">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-teal/20 via-sky/10 to-ink-5 text-[12px] font-medium text-ink-40">
            Destination preview
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        {ad.is_pinned ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink backdrop-blur-sm">
            Featured
          </span>
        ) : null}
        <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition-transform duration-300 group-hover:scale-105">
          <ArrowUpRight size={18} weight="bold" />
        </span>
        <div className="absolute bottom-3 left-3 right-14">
          <div className="flex items-center gap-1.5 text-white/90">
            <MapPin size={14} weight="fill" className="shrink-0 text-mint" />
            <p className="line-clamp-1 text-[12px] font-semibold tracking-wide">
              {ad.location_name}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="line-clamp-3 text-[14px] leading-relaxed text-ink-60">
          {ad.description}
        </p>
        {services.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {services.map((service) => (
              <span
                key={service}
                className="rounded-full border border-teal/25 bg-teal/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-70"
              >
                {service}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.button>
  );
}
