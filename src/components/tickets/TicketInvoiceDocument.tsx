import { useTranslation } from 'react-i18next';
import type { Ticket } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';
import { SaudiRiyalIcon } from '@/components/icons/SaudiRiyalIcon';
import { TicketQrPanel } from '@/components/tickets/TicketQrPanel';
import {
  admissionLine,
  deriveEventStatus,
  eventEndIso,
  eventStartIso,
  formatEventWindow,
  formatTicketDate,
  formatTicketDateTime,
  formatTicketStatusLabel,
  parsePricePaid,
  pickFirst,
  STATUS_STYLES,
  ticketStatusLabel,
  venueLine,
} from '@/components/tickets/ticketDisplayUtils';
import { formatSaudiRiyalAmountLatin } from '@/lib/saudiCurrency';
import type { AppLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

type AttendeeInfo = {
  name: string;
  email?: string;
  phone?: string;
};

type TicketInvoiceDocumentProps = {
  ticket: MockTicket;
  apiTicket?: Ticket | null;
  qr: {
    dataUrl: string | null;
    loading: boolean;
    error: string | null;
  };
  scanValue: string | null;
  attendee: AttendeeInfo;
};

export function TicketInvoiceDocument({
  ticket,
  apiTicket,
  qr,
  scanValue,
  attendee,
}: TicketInvoiceDocumentProps) {
  const { t, i18n } = useTranslation('tickets');
  const language = i18n.language as AppLanguage;
  const statusKey = (
    ['active', 'auction', 'gifted', 'used', 'expired', 'cancelled', 'refunded'].includes(ticket.status)
      ? ticket.status
      : 'active'
  ) as TicketStatus;
  const startIso = apiTicket ? eventStartIso(apiTicket) : ticket.dateStart || null;
  const endIso = apiTicket ? eventEndIso(apiTicket) : ticket.dateEnd || null;
  const issuedAt = apiTicket?.created_at ?? null;
  const eventStatus = apiTicket ? deriveEventStatus(apiTicket, t) : '—';
  const ticketType = pickFirst(
    apiTicket?.type_name_cache,
    apiTicket?.ticket_type_name,
    ticket.typeName,
  ) ?? t('detail.fallbackTicket');
  const pricePaid = parsePricePaid(apiTicket?.price_paid ?? ticket.pricePaid);
  const priceLabel = formatSaudiRiyalAmountLatin(pricePaid);
  const itemDescription = admissionLine(ticketType, ticket.seatLabel, t);
  const venue = venueLine(
    pickFirst(apiTicket?.venue_cache, apiTicket?.venue, ticket.venue),
    pickFirst(apiTicket?.city_cache, apiTicket?.city, ticket.city),
    t('detail.venueTbc'),
  );
  const dash = '—';
  const notAvailable = t('detail.notAvailableYet');

  return (
    <article className="overflow-hidden rounded-[2rem] border border-ink-10 bg-white shadow-[0_24px_48px_-20px_rgba(26,26,26,0.12)]">
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <TicketQrPanel
            variant="invoice"
            dataUrl={qr.dataUrl}
            loading={qr.loading}
            error={qr.error}
            ticketCode={scanValue}
            status={ticket.status}
          />
          <div className="text-left sm:text-right">
            <p className="text-[22px] font-extrabold tracking-tight text-ink">{t('detail.brand')}</p>
            <p className="mt-1 text-[12px] font-medium text-ink-60">{t('detail.eventAdmission')}</p>
          </div>
        </div>

        <div className="mt-8 border-b border-ink-10 pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-40">{t('detail.ticketLabel')}</p>
          <h1 className="mt-2 text-balance text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
            {ticket.eventTitle || t('detail.fallbackEvent')}
          </h1>
          <p className="mt-2 text-[13px] text-ink-60">{t('detail.documentSubtitle')}</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr] lg:gap-6">
          <div className="rounded-xl bg-ink p-5 text-white">
            <dl className="space-y-4 text-[12px]">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-white/50">{t('detail.eventDate')}</dt>
                <dd className="mt-1 font-semibold leading-snug">
                  {formatEventWindow(startIso, endIso, language, t)}
                </dd>
              </div>
              <div className="border-t border-white/15 pt-4">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-white/50">{t('detail.issued')}</dt>
                <dd className="mt-1 font-semibold">
                  {issuedAt ? formatTicketDateTime(issuedAt, language, notAvailable) : dash}
                </dd>
              </div>
              <div className="border-t border-white/15 pt-4">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-white/50">{t('detail.to')}</dt>
                <dd className="mt-1 space-y-0.5 font-semibold leading-snug">
                  <p>{attendee.name || t('detail.ticketHolder')}</p>
                  {attendee.phone ? <p className="text-white/80">{attendee.phone}</p> : null}
                  {attendee.email ? <p className="break-all text-white/80">{attendee.email}</p> : null}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-white/15 pt-4">
              <span
                className={cn(
                  'inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  STATUS_STYLES[statusKey],
                )}
              >
                {ticketStatusLabel(statusKey, t)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-10 bg-ink-5/50 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.orderNo')}</p>
              <p className="mt-1 font-mono text-[15px] font-bold tabular-nums text-ink">{ticket.orderRef}</p>
            </div>
            <div className="rounded-xl border border-ink-10 bg-ink-5/50 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.ticketNo')}</p>
              <p className="mt-1 break-all font-mono text-[15px] font-bold tabular-nums text-ink">
                {ticket.ticketCode || scanValue || dash}
              </p>
            </div>
            {apiTicket?.order_id != null && (
              <div className="rounded-xl border border-ink-10 bg-ink-5/50 px-5 py-4 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.payment')}</p>
                <p className="mt-1 text-[13px] font-medium text-ink-60">{t('detail.paidVia')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-ink-10">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 bg-ink px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-white sm:gap-4 sm:px-5">
            <span>{t('detail.itemDescription')}</span>
            <span className="text-right">{t('detail.rate')}</span>
            <span className="text-right">{t('detail.unit')}</span>
            <span className="text-right">{t('detail.subtotal')}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-t border-ink-10 px-4 py-4 text-[13px] sm:gap-4 sm:px-5">
            <span className="min-w-0 font-semibold text-ink">{itemDescription}</span>
            <span className="font-mono tabular-nums text-ink-60">{priceLabel}</span>
            <span className="font-mono tabular-nums text-ink-60">1</span>
            <span className="inline-flex items-center justify-end gap-0.5 font-mono font-bold tabular-nums text-ink">
              {priceLabel}
              <SaudiRiyalIcon className="h-[0.9em] w-[0.9em]" />
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-end gap-2 border-t border-ink-10 pt-6">
          <div className="flex w-full max-w-xs items-center justify-between text-[13px]">
            <span className="text-ink-60">{t('detail.subtotal')}</span>
            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums font-semibold text-ink">
              {priceLabel}
              <SaudiRiyalIcon className="h-[0.85em] w-[0.85em]" />
            </span>
          </div>
          <div className="flex w-full max-w-xs items-center justify-between text-[15px] font-bold text-ink">
            <span>{t('detail.totalPaid')}</span>
            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
              {priceLabel}
              <SaudiRiyalIcon className="h-[1em] w-[1em]" />
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 border-t border-ink-10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.starts')}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">
              {startIso ? formatTicketDateTime(startIso, language, notAvailable) : dash}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.ends')}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">
              {endIso ? formatTicketDateTime(endIso, language, notAvailable) : dash}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.eventStatus')}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">{eventStatus}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('detail.ticketStatus')}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">{formatTicketStatusLabel(ticket.status, t)}</p>
          </div>
        </div>

        <footer className="mt-8 border-t border-ink-10 pt-6">
          <p className="text-[13px] font-semibold text-ink">{venue}</p>
          {startIso ? (
            <p className="mt-1 text-[12px] text-ink-60">
              {formatTicketDate(startIso, language, t('dateTbc'))}
            </p>
          ) : null}
          <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-ink-40">{t('detail.invoiceFooter')}</p>
        </footer>
      </div>
    </article>
  );
}
