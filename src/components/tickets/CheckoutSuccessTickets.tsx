import { Link } from 'react-router-dom';
import type { ConfirmPaymentTicket } from '@/api/types/ticket';
import { TicketQrPanel } from '@/components/tickets/TicketQrPanel';
import { ticketQrScanValue, useTicketQrDataUrl } from '@/lib/ticketQr';
import { cn } from '@/lib/utils';

function CheckoutTicketQrRow({ ticket }: { ticket: ConfirmPaymentTicket }) {
  const scanValue = ticketQrScanValue(ticket);
  const qr = useTicketQrDataUrl(scanValue);
  const label = [ticket.type_name_cache, ticket.seat_label_cache].filter(Boolean).join(' · ');

  return (
    <div className="border-t border-ink-10 pt-4 first:border-0 first:pt-0">
      {label ? <p className="mb-3 text-center text-[13px] font-semibold text-ink">{label}</p> : null}
      <TicketQrPanel
        compact
        dataUrl={qr.dataUrl}
        loading={qr.loading}
        error={qr.error}
        ticketCode={scanValue}
        status={ticket.status}
      />
      {ticket.id != null && (
        <p className="mt-2 text-center">
          <Link
            to={`/my-tickets/${ticket.id}`}
            className="text-[12px] font-semibold text-coral hover:underline"
          >
            Open full ticket
          </Link>
        </p>
      )}
    </div>
  );
}

type CheckoutSuccessTicketsProps = {
  tickets: ConfirmPaymentTicket[];
  className?: string;
};

/** Gate QRs from `confirm-payment` `data.tickets[]` — no extra detail GET required. */
export function CheckoutSuccessTickets({ tickets, className }: CheckoutSuccessTicketsProps) {
  if (tickets.length === 0) return null;

  return (
    <div
      className={cn(
        'max-h-[min(52vh,420px)] space-y-0 overflow-y-auto',
        tickets.length > 1 && 'pr-1',
        className,
      )}
    >
      {tickets.map((t) => (
        <CheckoutTicketQrRow key={String(t.id)} ticket={t} />
      ))}
    </div>
  );
}
