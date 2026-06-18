import type { Ticket } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';
import {
  admissionLine,
  eventEndIso,
  eventStartIso,
  formatTicketTimeOnly,
  formatTicketStatusLabel,
  pickFirst,
  type TicketTranslate,
} from '@/components/tickets/ticketDisplayUtils';
import { pickCoverUrl } from '@/components/tickets/admit-one/resolveEventCover';
import { formatDate } from '@/lib/intlFormat';
import type { AppLanguage } from '@/lib/language';

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
  timeTbc: string;
  timeTo: string;
};

function formatWeekday(iso: string, language: AppLanguage): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDate(iso, language, { weekday: 'long' }).toUpperCase();
}

function formatMonthDay(iso: string, language: AppLanguage, dateTbc: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dateTbc;
  const month = formatDate(iso, language, { month: 'long' }).toUpperCase();
  const day = d.getDate();
  if (language === 'ar') return `${month} ${day}`;
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

function formatYear(iso: string, language: AppLanguage): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDate(iso, language, { year: 'numeric' });
}

export function mapAdmitOneTicketViewModel(
  ticket: MockTicket,
  t: TicketTranslate,
  language: AppLanguage,
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
  ) ?? t('detail.fallbackTicket');
  const seatLabel = pickFirst(apiTicket?.seat_label, apiTicket?.seat_label_cache, ticket.seatLabel);
  const subtitle = admissionLine(typeName, seatLabel ?? undefined, t);

  const code = pickFirst(scanValue, ticket.ticketCode, apiTicket?.qr_scan_value, apiTicket?.code);
  const ticketNumber = code ? `#${code}` : `#${ticket.orderRef}`;

  const venue = pickFirst(apiTicket?.venue, apiTicket?.venue_cache, ticket.venue) ?? t('detail.venueTbc');
  const city = pickFirst(apiTicket?.city, apiTicket?.city_cache, ticket.city) ?? '';

  const status = ticket.status;
  const isActive = status === 'active';
  const dateTbc = t('detail.dateTbc');

  return {
    eventTitle: ticket.eventTitle?.trim() || t('detail.fallbackEvent'),
    subtitle,
    weekday: startIso ? formatWeekday(startIso, language) : '—',
    monthDay: startIso ? formatMonthDay(startIso, language, dateTbc) : dateTbc,
    year: startIso ? formatYear(startIso, language) : '—',
    timeStart: formatTicketTimeOnly(startIso, language),
    timeEnd: formatTicketTimeOnly(endIso, language),
    venue,
    city,
    ticketNumber,
    coverImageUrl: pickFirst(coverImageOverride, pickCoverUrl(apiTicket)),
    status,
    statusLabel: formatTicketStatusLabel(status, t),
    isActive,
    timeTbc: t('detail.timeTbc'),
    timeTo: t('detail.timeTo'),
  };
}
