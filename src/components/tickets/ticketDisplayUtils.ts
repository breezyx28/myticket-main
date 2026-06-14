import type { Ticket } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  active: 'Active',
  auction: 'In auction',
  gifted: 'Gifted',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const STATUS_STYLES: Record<TicketStatus, string> = {
  active: 'bg-mint/15 text-mint-dark border-mint/30',
  auction: 'bg-amber/15 text-amber border-amber/40',
  gifted: 'bg-sky/15 text-sky border-sky/40',
  used: 'bg-ink-5 text-ink-60 border-ink-10',
  expired: 'bg-ink-5 text-ink-40 border-ink-10',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
  refunded: 'bg-purple-50 text-purple-800 border-purple-200',
};

export const STATUS_HEADER_STYLES: Record<TicketStatus, string> = {
  active: 'bg-ink text-white',
  auction: 'bg-amber text-ink',
  gifted: 'bg-sky text-ink',
  used: 'bg-ink-80 text-white',
  expired: 'bg-ink-60 text-white',
  cancelled: 'bg-red-800 text-white',
  refunded: 'bg-purple-800 text-white',
};

export function pickFirst(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

export function formatTicketDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'Date TBC';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Date TBC';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatTicketDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'Date TBC';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Date TBC';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatEventWindow(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso?.trim()) return 'Event schedule TBC';
  const start = formatTicketDateTime(startIso);
  if (!endIso?.trim() || endIso === startIso) return start;
  const end = formatTicketDateTime(endIso);
  return `${start} — ${end}`;
}

export function venueLine(venue: string | null | undefined, city: string | null | undefined): string {
  const parts = [venue, city].filter((p) => p?.trim());
  return parts.length > 0 ? parts.join(', ') : 'Venue TBC';
}

export function admissionLine(typeName: string, seatLabel?: string): string {
  const type = typeName?.trim() || 'General admission';
  return seatLabel?.trim() ? `${type} · Seat ${seatLabel.trim()}` : type;
}

export function formatTicketStatusLabel(status: string | undefined): string {
  if (!status?.trim()) return 'Unknown';
  const key = status.toLowerCase() as TicketStatus;
  if (key in STATUS_LABEL) return STATUS_LABEL[key];
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

export function eventStartIso(t: Ticket): string | null {
  return pickFirst(t.starts_at_cache, t.date_start);
}

export function eventEndIso(t: Ticket): string | null {
  return pickFirst(t.ends_at_cache, t.date_end);
}

export function deriveEventStatus(t: Ticket): string {
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

export function parsePricePaid(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function ticketMetaLine(ticket: MockTicket): string {
  const parts = [
    ticket.typeName || 'Ticket',
    ticket.seatLabel ? `Seat ${ticket.seatLabel}` : null,
    ticket.orderRef || null,
  ].filter(Boolean);
  return parts.join(' · ');
}
