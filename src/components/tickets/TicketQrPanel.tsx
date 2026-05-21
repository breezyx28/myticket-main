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
};

export function TicketQrPanel({
  dataUrl,
  loading,
  error,
  ticketCode,
  status,
  compact = false,
}: TicketQrPanelProps) {
  const statusMessage = ticketQrStatusMessage(status);
  const canEnter = status === 'active';

  if (!ticketCode) {
    return (
      <div className="rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-8 text-center text-[13px] text-ink-60">
        Ticket code is not available yet. Open this page again after your order is confirmed, or check My
        Tickets.
      </div>
    );
  }

  const qrSize = compact ? 180 : 256;

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-ink-10 bg-white',
          compact ? 'h-44' : 'h-56',
        )}
      >
        <p className="text-[13px] text-ink-40">Generating QR…</p>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="rounded-2xl border border-coral/40 bg-coral/10 px-4 py-6 text-center text-[13px] text-coral">
        {error ?? 'Could not display QR code.'}
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
        className={cn('max-w-full', !canEnter && 'opacity-80')}
        style={{ width: qrSize, height: qrSize }}
      />
      <p className={cn('font-mono font-bold tracking-wide text-ink', compact ? 'mt-3 text-[13px]' : 'mt-4 text-[15px]')}>
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
