import type { Ticket } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';
import { formatDate, formatTime } from '@/lib/intlFormat';
import type { AppLanguage } from '@/lib/language';

export type TicketTranslate = (key: string, options?: Record<string, unknown>) => string;

const STATUS_I18N_KEYS: Record<TicketStatus, string> = {
  active: 'display.statusActive',
  auction: 'display.statusAuction',
  gifted: 'display.statusGifted',
  used: 'display.statusUsed',
  expired: 'display.statusExpired',
  cancelled: 'display.statusCancelled',
  refunded: 'display.statusRefunded',
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

/** @deprecated Use ticketStatusLabel(status, t) in UI */
export const STATUS_LABEL: Record<TicketStatus, string> = {
  active: 'Active',
  auction: 'In auction',
  gifted: 'Gifted',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function ticketStatusLabel(status: TicketStatus, t: TicketTranslate): string {
  return t(STATUS_I18N_KEYS[status]);
}

export function pickFirst(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

export function formatTicketDateTime(
  iso: string | null | undefined,
  language: AppLanguage,
  fallback: string,
): string {
  if (!iso?.trim()) return fallback;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return fallback;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatTicketDate(
  iso: string | null | undefined,
  language: AppLanguage,
  fallback: string,
): string {
  if (!iso?.trim()) return fallback;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return fallback;
  return formatDate(iso, language, { dateStyle: 'medium' });
}

export function formatEventWindow(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  language: AppLanguage,
  t: TicketTranslate,
): string {
  const scheduleTbc = t('display.eventScheduleTbc');
  if (!startIso?.trim()) return scheduleTbc;
  const start = formatTicketDateTime(startIso, language, scheduleTbc);
  if (!endIso?.trim() || endIso === startIso) return start;
  const end = formatTicketDateTime(endIso, language, scheduleTbc);
  return `${start} — ${end}`;
}

export function venueLine(
  venue: string | null | undefined,
  city: string | null | undefined,
  venueTbc: string,
): string {
  const parts = [venue, city].filter((p) => p?.trim());
  return parts.length > 0 ? parts.join(', ') : venueTbc;
}

export function admissionLine(typeName: string, seatLabel: string | undefined, t: TicketTranslate): string {
  const type = typeName?.trim() || t('display.generalAdmission');
  return seatLabel?.trim() ? `${type} · ${t('display.seat', { label: seatLabel.trim() })}` : type;
}

export function formatTicketStatusLabel(status: string | undefined, t: TicketTranslate): string {
  if (!status?.trim()) return t('display.unknown');
  const key = status.toLowerCase() as TicketStatus;
  if (key in STATUS_I18N_KEYS) return t(STATUS_I18N_KEYS[key]);
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

export function eventStartIso(ticket: Ticket): string | null {
  return pickFirst(ticket.starts_at_cache, ticket.date_start);
}

export function eventEndIso(ticket: Ticket): string | null {
  return pickFirst(ticket.ends_at_cache, ticket.date_end);
}

export function deriveEventStatus(ticket: Ticket, t: TicketTranslate): string {
  const startS = eventStartIso(ticket);
  if (!startS) return t('display.scheduleNotSet');
  const endS = eventEndIso(ticket) ?? startS;
  const start = new Date(startS).getTime();
  const end = new Date(endS).getTime();
  if (Number.isNaN(start)) return t('display.scheduleNotSet');
  const now = Date.now();
  if (now < start) return t('display.upcoming');
  if (!Number.isNaN(end) && now > end) return t('display.ended');
  return t('display.inProgress');
}

export function parsePricePaid(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function ticketMetaLine(ticket: MockTicket, t: TicketTranslate): string {
  const parts = [
    ticket.typeName || t('detail.fallbackTicket'),
    ticket.seatLabel ? t('display.seat', { label: ticket.seatLabel }) : null,
    ticket.orderRef || null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function formatTicketTimeOnly(
  iso: string | null | undefined,
  language: AppLanguage,
): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatTime(iso, language);
}
