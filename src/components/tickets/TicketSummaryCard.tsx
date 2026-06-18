import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import {
  CalendarBlank,
  CalendarCheck,
  Pulse,
  SealCheck,
  Tag,
} from '@phosphor-icons/react';
import type { Ticket } from '@/api/types/ticket';
import {
  deriveEventStatus,
  eventEndIso,
  eventStartIso,
  formatTicketDateTime,
  formatTicketStatusLabel,
  pickFirst,
} from '@/components/tickets/ticketDisplayUtils';
import type { AppLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

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
  const { t, i18n } = useTranslation('tickets');
  const language = i18n.language as AppLanguage;
  const startIso = eventStartIso(ticket);
  const endIso = eventEndIso(ticket);
  const ticketType = pickFirst(ticket.type_name_cache, ticket.ticket_type_name) ?? t('detail.notSpecified');
  const eventStatus = deriveEventStatus(ticket, t);
  const ticketStatus = formatTicketStatusLabel(String(ticket.status), t);
  const notAvailable = t('detail.notAvailableYet');

  return (
    <section className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/35 p-5 shadow-sm">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-ink">{t('detail.eventAndTicket')}</h2>
      <p className="mt-1 text-[12px] text-ink-50">{t('detail.keyDetails')}</p>
      <div className="mt-4 space-y-3">
        <SummaryRow
          icon={<CalendarBlank size={22} weight="duotone" />}
          label={t('detail.eventStarts')}
          value={startIso ? formatTicketDateTime(startIso, language, notAvailable) : notAvailable}
        />
        <SummaryRow
          icon={<CalendarCheck size={22} weight="duotone" />}
          label={t('detail.eventEnds')}
          value={endIso ? formatTicketDateTime(endIso, language, notAvailable) : notAvailable}
        />
        <SummaryRow
          icon={<Tag size={22} weight="duotone" />}
          label={t('detail.ticketType')}
          value={ticketType}
        />
        <SummaryRow
          icon={<Pulse size={22} weight="duotone" />}
          label={t('detail.eventStatus')}
          value={eventStatus}
          iconClass="text-sky"
        />
        <SummaryRow
          icon={<SealCheck size={22} weight="duotone" />}
          label={t('detail.ticketStatus')}
          value={ticketStatus}
          iconClass="text-mint"
        />
      </div>
    </section>
  );
}
