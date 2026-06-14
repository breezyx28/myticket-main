import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import type { MockTicket, TicketStatus } from '@/types/domain';
import {
  formatTicketDateTime,
  STATUS_HEADER_STYLES,
  STATUS_LABEL,
  ticketMetaLine,
  venueLine,
} from '@/components/tickets/ticketDisplayUtils';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

type TicketListCardProps = {
  ticket: MockTicket;
  index?: number;
};

export function TicketListCard({ ticket, index = 0 }: TicketListCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const statusKey = (ticket.status in STATUS_LABEL ? ticket.status : 'active') as TicketStatus;
  const venue = venueLine(ticket.venue, ticket.city);
  const dateLabel = ticket.dateStart ? formatTicketDateTime(ticket.dateStart) : 'Date TBC';

  const content = (
    <Link
      to={`/my-tickets/${ticket.id}`}
      className={cn(
        'group block overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm',
        'transition-[box-shadow,border-color,transform] duration-200',
        'hover:border-coral/30 hover:shadow-card-md',
        'active:scale-[0.98]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-2.5',
          STATUS_HEADER_STYLES[statusKey],
        )}
      >
        <span className="truncate font-mono text-[11px] font-bold tabular-nums tracking-wide opacity-90">
          {ticket.ticketCode || ticket.orderRef}
        </span>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {STATUS_LABEL[statusKey]}
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-balance text-[17px] font-extrabold leading-snug tracking-tight text-ink">
          {ticket.eventTitle || 'Event'}
        </h2>
        <p className="mt-2 text-[13px] text-ink-60">
          {venue}
          {ticket.dateStart ? ` · ${dateLabel}` : ''}
        </p>
        <p className="mt-1 text-[12px] text-ink-40">{ticketMetaLine(ticket)}</p>
        <p className="mt-4 flex items-center justify-end gap-1 text-[13px] font-semibold text-coral transition-colors group-hover:text-coral/80">
          View ticket
          <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </p>
      </div>
    </Link>
  );

  if (reduceMotion) return <li>{content}</li>;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 22,
        delay: index * 0.05,
      }}
    >
      {content}
    </motion.li>
  );
}

export function TicketListCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-sm">
      <div className="h-10 animate-pulse bg-ink-10" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded-md bg-ink-10" />
        <div className="h-4 w-full animate-pulse rounded-md bg-ink-5" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-ink-5" />
      </div>
    </li>
  );
}
