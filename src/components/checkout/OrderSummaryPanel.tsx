import { Link } from 'react-router-dom';
import { SaudiRiyalIcon } from '@/components/icons/SaudiRiyalIcon';
import { formatSaudiRiyalAmountLatin } from '@/lib/saudiCurrency';
import { cn } from '@/lib/utils';

type OrderSummaryPanelProps = {
  eventTitle: string;
  ticketTypeName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  fees: number;
  total: number;
  seatLabels?: string[];
  showPolicies?: boolean;
  className?: string;
};

function MoneyRow({
  label,
  amount,
  emphasis = false,
  muted = false,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  muted?: boolean;
}) {
  const formatted = formatSaudiRiyalAmountLatin(amount);
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        emphasis && 'border-t border-ink-10 pt-3 font-bold text-ink',
        muted && 'text-ink-60',
      )}
    >
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <SaudiRiyalIcon className="h-[0.85em] w-[0.85em]" />
        <span>{formatted}</span>
      </span>
    </div>
  );
}

export function OrderSummaryPanel({
  eventTitle,
  ticketTypeName,
  quantity,
  unitPrice,
  subtotal,
  fees,
  total,
  seatLabels,
  showPolicies = true,
  className,
}: OrderSummaryPanelProps) {
  const unitFormatted = formatSaudiRiyalAmountLatin(unitPrice);

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[2rem] border border-ink-10 bg-white shadow-[0_24px_48px_-20px_rgba(26,26,26,0.12)]',
        className,
      )}
    >
      <div className="border-b border-ink-10 px-6 py-5 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-40">Order summary</p>
        <h2 className="mt-1 text-balance text-[17px] font-extrabold tracking-tight text-ink">
          {eventTitle}
        </h2>
        {ticketTypeName ? (
          <p className="mt-2 text-[13px] text-ink-60">
            {quantity}× {ticketTypeName}
            <span className="mx-1 text-ink-30">·</span>
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <SaudiRiyalIcon className="h-[0.8em] w-[0.8em]" />
              {unitFormatted}
              <span className="text-ink-40"> each</span>
            </span>
          </p>
        ) : null}
      </div>

      {seatLabels && seatLabels.length > 0 ? (
        <div className="border-b border-ink-10 px-6 py-4 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Seats</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{seatLabels.join(', ')}</p>
        </div>
      ) : null}

      <div className="space-y-2 px-6 py-5 text-[14px] sm:px-8">
        <MoneyRow label="Subtotal" amount={subtotal} />
        <MoneyRow label="Fees (demo 5%)" amount={fees} muted />
        <MoneyRow label="Total" amount={total} emphasis />
        <p className="pt-1 text-[11px] leading-relaxed text-ink-40">
          Final totals (taxes, processing fees) are calculated server-side at order creation.
        </p>
      </div>

      {showPolicies ? (
        <div className="space-y-2 border-t border-ink-10 px-6 py-4 text-[12px] leading-relaxed text-ink-60 sm:px-8">
          <details className="group">
            <summary className="cursor-pointer font-bold text-ink">Refund policy (summary)</summary>
            <p className="mt-2">
              No change-of-mind refunds. Resale is via auction before event day. Refunds apply for
              cancellation, major organizer edits, or seat conflicts per{' '}
              <Link to="/terms" className="font-semibold text-coral underline">
                Terms
              </Link>
              .
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-bold text-ink">Seat lock while paying</summary>
            <p className="mt-2">
              Seats are held server-side while payment processes. If payment fails or times out,
              locks release for others automatically.
            </p>
          </details>
        </div>
      ) : null}
    </article>
  );
}
