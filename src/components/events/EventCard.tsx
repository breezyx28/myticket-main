import { Link } from 'react-router-dom';
import { MapPin } from '@phosphor-icons/react';
import type { MockEvent } from '@/types/domain';
import { eventHasPrimaryInventory, isEventSoldOut } from '@/lib/eventMappers';
import { usableImageSrc } from '@/lib/imageSrc';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventCard({ event }: { event: MockEvent }) {
  const soldOut = isEventSoldOut(event.ticketsLeft);
  const hasInventory = eventHasPrimaryInventory(event.ticketsLeft);
  const coverImageSrc = usableImageSrc(event.coverImage);
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm transition-shadow hover:shadow-card-md'
      )}
    >
      <Link to={`/events/${event.id}`} className="relative aspect-[16/10] overflow-hidden bg-ink-10">
        {coverImageSrc ? (
          <img
            src={coverImageSrc}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-10 via-ink-5 to-white" aria-hidden />
        )}
        {event.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-lemon px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            Featured
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-coral">{event.category}</p>
        <h3 className="mt-1 line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight text-ink">
          <Link to={`/events/${event.id}`} className="hover:text-coral">
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-60">{event.excerpt}</p>
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-40">
          <MapPin size={14} weight="bold" className="shrink-0 text-coral" />
          <span className="truncate">
            {event.venue} · {event.city}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-10 pt-3">
          <span className="text-[12px] font-medium text-ink-60">
            {soldOut ? (
              <span className="text-coral">Sold out</span>
            ) : event.ticketsLeft != null ? (
              <>
                <span className="font-bold text-ink">{event.ticketsLeft}</span> tickets left
              </>
            ) : (
              <span className="text-ink-60">Tickets available</span>
            )}
          </span>
          <span className="text-[11px] text-ink-40">{formatDate(event.dateStart)}</span>
        </div>
        <Link
          to={`/events/${event.id}`}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink text-center text-[13px] font-semibold text-white transition-colors hover:bg-ink-80"
        >
          {hasInventory ? 'Get tickets' : 'View event'}
        </Link>
      </div>
    </article>
  );
}
