import type { TicketStatus } from '@/api/types/ticket';
import { ticketQrStatusMessage } from '@/lib/ticketQr';
import { cn } from '@/lib/utils';

type TicketQrPanelProps = {
  dataUrl: string | null;
  loading: boolean;
  error: string | null;
  ticketCode: string | null;
  status: TicketStatus | string;
  /** Smaller QR for checkout success modal. */
  compact?: boolean;
  /** Document-style QR for invoice ticket layout. */
  variant?: 'default' | 'invoice';
};

export function TicketQrPanel({
  dataUrl,
  loading,
  error,
  ticketCode,
  status,
  compact = false,
  variant = 'default',
}: TicketQrPanelProps) {
  const statusMessage = ticketQrStatusMessage(status);
  const canEnter = status === 'active';
  const isInvoice = variant === 'invoice';

  if (!ticketCode) {
    return (
      <div
        className={cn(
          'text-[13px] text-ink-60',
          isInvoice
            ? 'flex h-32 w-32 items-center justify-center rounded-lg border border-ink-10 bg-white p-2 text-center text-[11px]'
            : 'rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-8 text-center',
        )}
      >
        Ticket code is not available yet. Open this page again after your order is confirmed, or check My
        Tickets.
      </div>
    );
  }

  const qrSize = compact ? 180 : isInvoice ? 112 : 256;

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-white',
          isInvoice
            ? 'h-32 w-32 rounded-lg border border-ink-10'
            : cn('rounded-2xl border border-ink-10', compact ? 'h-44' : 'h-56'),
        )}
      >
        <p className="text-[13px] text-ink-40">Generating QR…</p>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div
        className={cn(
          'text-center text-[13px] text-coral',
          isInvoice
            ? 'flex h-32 w-32 items-center justify-center rounded-lg border border-coral/40 bg-coral/10 p-2 text-[11px]'
            : 'rounded-2xl border border-coral/40 bg-coral/10 px-4 py-6',
        )}
      >
        {error ?? 'Could not display QR code.'}
      </div>
    );
  }

  if (isInvoice) {
    return (
      <div className="flex flex-col items-start">
        <div className="rounded-lg border border-ink-10 bg-white p-2 shadow-sm">
          <img
            src={dataUrl}
            alt={`Ticket QR code for ${ticketCode}`}
            width={qrSize}
            height={qrSize}
            className={cn('rounded-md outline outline-black/10', !canEnter && 'opacity-80')}
            style={{ width: qrSize, height: qrSize }}
          />
        </div>
        <p className="mt-2 max-w-[8.5rem] font-mono text-[10px] font-bold tabular-nums tracking-wide text-ink">
          {ticketCode}
        </p>
        {statusMessage ? (
          <p
            className={cn(
              'mt-1 max-w-[8.5rem] text-[10px] font-semibold leading-snug',
              canEnter ? 'text-ink-60' : 'text-coral',
            )}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-ink-10 bg-white shadow-sm',
        compact ? 'p-4' : 'p-6',
      )}
    >
      {!compact && (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-ink-40">Entry QR</p>
      )}
      <img
        src={dataUrl}
        alt={`Ticket QR code for ${ticketCode}`}
        width={qrSize}
        height={qrSize}
        className={cn('max-w-full outline outline-black/10', !canEnter && 'opacity-80')}
        style={{ width: qrSize, height: qrSize }}
      />
      <p className={cn('font-mono font-bold tabular-nums tracking-wide text-ink', compact ? 'mt-3 text-[13px]' : 'mt-4 text-[15px]')}>
        {ticketCode}
      </p>
      {!compact && (
        <p className="mt-1 text-[11px] text-ink-40">Manual entry code if the scanner cannot read the QR</p>
      )}
      {statusMessage ? (
        <p
          className={cn(
            'mt-4 max-w-sm text-center text-[13px] font-semibold leading-relaxed',
            canEnter ? 'text-ink-60' : 'text-coral',
          )}
        >
          {statusMessage}
        </p>
      ) : (
        <p className="mt-4 max-w-sm text-center text-[11px] leading-relaxed text-ink-40">
          Show this code at the gate. Increase screen brightness for best results. Do not share screenshots
          publicly.
        </p>
      )}
    </div>
  );
}
