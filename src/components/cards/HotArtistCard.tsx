import { ArrowRight, MusicNotes } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface HotArtistCardProps {
  title: string;
  description: string;
  tags: string[];
  image: string;
  /** Category-style classes, e.g. `bg-coral text-white` or `bg-lime text-ink` */
  color: string;
  href?: string;
  className?: string;
}

export function HotArtistCard({
  title,
  description,
  tags,
  image,
  color,
  href = '#',
  className,
}: HotArtistCardProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] p-px',
        'bg-gradient-to-br from-white/45 via-white/20 to-white/[0.07]',
        'shadow-[0_12px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)]',
        'backdrop-blur-xl backdrop-saturate-150',
        'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_52px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)]',
        className
      )}
    >
    <article
      className={cn(
        'flex h-[520px] w-[300px] flex-shrink-0 flex-col overflow-hidden rounded-[27px] sm:w-[320px]',
        'ring-1 ring-inset ring-white/15',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      )}
    >
      {/* Top: tags + icon, title, description — brand colors like category tiles */}
      <div className={cn('flex shrink-0 flex-col px-6 pb-5 pt-6', color)}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.06]"
            aria-hidden
          >
            <MusicNotes size={22} weight="fill" className="text-ink" />
          </div>
        </div>
        <h3 className="text-[22px] font-extrabold leading-[1.12] tracking-[-0.03em] text-current sm:text-[24px]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-current/70">{description}</p>
      </div>

      {/* Bottom: image inset + glass Read More */}
      <div className="flex min-h-0 flex-1 flex-col p-3 pt-2">
        <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent"
            aria-hidden
          />
          <Link
            to={href}
            className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/55 bg-white/30 py-1.5 pl-5 pr-1.5 shadow-lg backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-white/45"
          >
            <span className="whitespace-nowrap text-[11px] font-bold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              Read More
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/5">
              <ArrowRight size={16} weight="bold" />
            </span>
          </Link>
        </div>
      </div>
    </article>
    </div>
  );
}
