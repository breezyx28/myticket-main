import { cn } from '@/lib/utils';
import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';

const METHOD_BADGE: Record<CardPaymentMethod, string> = {
  visa: 'bg-sky text-white',
  mastercard: 'bg-coral text-white',
  mada: 'bg-mint-dark text-white',
};

interface PaymentMethodCardProps {
  id: CardPaymentMethod;
  label: string;
  helper: string;
  selected: boolean;
  onSelect: (method: CardPaymentMethod) => void;
}

function CardBrandIcon({ id }: { id: CardPaymentMethod }) {
  if (id === 'visa') {
    return (
      <div className="flex h-7 w-12 items-center justify-center rounded-md bg-[#1A1F71] text-[10px] font-black tracking-wide text-white">
        VISA
      </div>
    );
  }
  if (id === 'mastercard') {
    return (
      <div className="relative h-7 w-12 rounded-md bg-white ring-1 ring-ink-10">
        <span className="absolute left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#EB001B]" />
        <span className="absolute left-[18px] top-1.5 h-4 w-4 rounded-full bg-[#F79E1B] opacity-95" />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-12 items-center justify-center rounded-md bg-[#00A3E0] text-[10px] font-black tracking-wide text-white">
      MADA
    </div>
  );
}

export function PaymentMethodCard({
  id,
  label,
  helper,
  selected,
  onSelect,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        'rounded-xl border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-ink bg-ink-5' : 'border-ink-10 bg-white hover:border-ink-30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', METHOD_BADGE[id])}>
          {label}
        </span>
        <CardBrandIcon id={id} />
      </div>
      <p className="mt-2 text-[12px] text-ink-60">{helper}</p>
    </button>
  );
}
