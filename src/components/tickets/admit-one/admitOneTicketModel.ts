import type { Ticket } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';
import {
  admissionLine,
  eventEndIso,
  eventStartIso,
  formatTicketStatusLabel,
  pickFirst,
} from '@/components/tickets/ticketDisplayUtils';
import { pickCoverUrl } from '@/components/tickets/admit-one/resolveEventCover';

export type AdmitOneTicketViewModel = {
  eventTitle: string;
  subtitle: string;
  weekday: string;
  monthDay: string;
  year: string;
  timeStart: string | null;
  timeEnd: string | null;
  venue: string;
  city: string;
  ticketNumber: string;
  coverImageUrl: string | null;
  status: TicketStatus | string;
  statusLabel: string;
  isActive: boolean;
};

function formatWeekday(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
}

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'DATE TBC';
  const month = d.toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'ST'
      : day % 10 === 2 && day !== 12
        ? 'ND'
        : day % 10 === 3 && day !== 13
          ? 'RD'
          : 'TH';
  return `${month} ${day}${suffix}`;
}

function formatYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getFullYear());
}

function formatTime(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function mapAdmitOneTicketViewModel(
  ticket: MockTicket,
  apiTicket?: Ticket | null,
  scanValue?: string | null,
  coverImageOverride?: string | null,
): AdmitOneTicketViewModel {
  const startIso = apiTicket ? eventStartIso(apiTicket) : ticket.dateStart || null;
  const endIso = apiTicket ? eventEndIso(apiTicket) : ticket.dateEnd || null;

  const typeName = pickFirst(
    apiTicket?.ticket_type_name,
    apiTicket?.type_name_cache,
    ticket.typeName,
  ) ?? 'Ticket';
  const seatLabel = pickFirst(apiTicket?.seat_label, apiTicket?.seat_label_cache, ticket.seatLabel);
  const subtitle = admissionLine(typeName, seatLabel ?? undefined);

  const code = pickFirst(scanValue, ticket.ticketCode, apiTicket?.qr_scan_value, apiTicket?.code);
  const ticketNumber = code ? `#${code}` : `#${ticket.orderRef}`;

  const venue = pickFirst(apiTicket?.venue, apiTicket?.venue_cache, ticket.venue) ?? 'Venue TBC';
  const city = pickFirst(apiTicket?.city, apiTicket?.city_cache, ticket.city) ?? '';

  const status = ticket.status;
  const isActive = status === 'active';

  return {
    eventTitle: ticket.eventTitle?.trim() || 'Event',
    subtitle,
    weekday: startIso ? formatWeekday(startIso) : '—',
    monthDay: startIso ? formatMonthDay(startIso) : 'DATE TBC',
    year: startIso ? formatYear(startIso) : '—',
    timeStart: formatTime(startIso),
    timeEnd: formatTime(endIso),
    venue,
    city,
    ticketNumber,
    coverImageUrl: pickFirst(coverImageOverride, pickCoverUrl(apiTicket)),
    status,
    statusLabel: formatTicketStatusLabel(status),
    isActive,
  };
}
