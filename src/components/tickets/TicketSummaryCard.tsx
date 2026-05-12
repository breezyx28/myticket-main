import type { ReactNode } from 'react';
import {
  CalendarBlank,
  CalendarCheck,
  Pulse,
  SealCheck,
  Tag,
} from '@phosphor-icons/react';
import type { Ticket } from '@/api/types/ticket';
import { cn } from '@/lib/utils';

function pickFirst(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Not available yet';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Not available yet';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function eventStartIso(t: Ticket): string | null {
  return pickFirst(t.starts_at_cache, t.date_start);
}

function eventEndIso(t: Ticket): string | null {
  return pickFirst(t.ends_at_cache, t.date_end);
}

function deriveEventStatus(t: Ticket): string {
  const startS = eventStartIso(t);
  if (!startS) return 'Schedule not set';
  const endS = eventEndIso(t) ?? startS;
  const start = new Date(startS).getTime();
  const end = new Date(endS).getTime();
  if (Number.isNaN(start)) return 'Schedule not set';
  const now = Date.now();
  if (now < start) return 'Upcoming';
  if (!Number.isNaN(end) && now > end) return 'Ended';
  return 'In progress';
}

function formatTicketStatus(status: string | undefined): string {
  if (!status?.trim()) return 'Unknown';
  const s = status.toLowerCase();
  const labels: Record<string, string> = {
    active: 'Active',
    auction: 'In auction',
    gifted: 'Gifted',
    used: 'Used',
    expired: 'Expired',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return labels[s] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

type RowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  iconClass?: string;
};

function SummaryRow({ icon, label, value, iconClass }: RowProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-ink-10 bg-white/90 p-4 shadow-sm">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-5 text-coral',
          iconClass
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{value}</p>
      </div>
    </div>
  );
}

type TicketSummaryCardProps = {
  ticket: Ticket;
};

/**
 * Human-readable ticket/event summary from API fields (cache columns supported).
 */
export function TicketSummaryCard({ ticket }: TicketSummaryCardProps) {
  const startIso = eventStartIso(ticket);
  const endIso = eventEndIso(ticket);
  const ticketType = pickFirst(ticket.type_name_cache, ticket.ticket_type_name) ?? 'Not specified';
  const eventStatus = deriveEventStatus(ticket);
  const ticketStatus = formatTicketStatus(String(ticket.status));

  return (
    <section className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/35 p-5 shadow-sm">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-ink">Event &amp; ticket</h2>
      <p className="mt-1 text-[12px] text-ink-50">Key details from your booking.</p>
      <div className="mt-4 space-y-3">
        <SummaryRow
          icon={<CalendarBlank size={22} weight="duotone" />}
          label="Event starts"
          value={formatWhen(startIso)}
        />
        <SummaryRow
          icon={<CalendarCheck size={22} weight="duotone" />}
          label="Event ends"
          value={formatWhen(endIso)}
        />
        <SummaryRow
          icon={<Tag size={22} weight="duotone" />}
          label="Ticket type"
          value={ticketType}
        />
        <SummaryRow
          icon={<Pulse size={22} weight="duotone" />}
          label="Event status"
          value={eventStatus}
          iconClass="text-sky"
        />
        <SummaryRow
          icon={<SealCheck size={22} weight="duotone" />}
          label="Ticket status"
          value={ticketStatus}
          iconClass="text-mint"
        />
      </div>
    </section>
  );
}
