import { CreditCard } from '@/components/checkout/CreditCard';
import {
  displayCardExpiration,
  displayCardHolder,
  displayCardNumber,
} from '@/components/checkout/checkoutCreditCardUtils';
import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';
import { cn } from '@/lib/utils';

interface PaymentMethodCardProps {
  id: CardPaymentMethod;
  label: string;
  helper: string;
  selected: boolean;
  onSelect: (method: CardPaymentMethod) => void;
  cardNumberPlaceholder?: string;
  previewHolder?: string;
  previewExpiry?: string;
  width?: number;
}

/** Auction / legacy manual network picker — checkout uses auto-detect instead. */
export function PaymentMethodCard({
  id,
  label,
  helper,
  selected,
  onSelect,
  cardNumberPlaceholder = '1234 1234 1234 1234',
  previewHolder = 'CARD HOLDER',
  previewExpiry = 'MM/YY',
  width = 260,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`${label}. ${helper}`}
      className={cn(
        'group snap-center rounded-[1.25rem] p-1 text-left transition-[transform,box-shadow,opacity] active:scale-[0.96]',
        selected
          ? 'opacity-100 shadow-[0_16px_40px_-16px_rgba(26,26,26,0.35)] ring-2 ring-coral ring-offset-2 ring-offset-white'
          : 'opacity-80 hover:opacity-100',
      )}
    >
      <CreditCard
        network={id}
        label={label}
        cardNumber={displayCardNumber('', cardNumberPlaceholder)}
        cardHolder={displayCardHolder(previewHolder)}
        cardExpiration={displayCardExpiration(previewExpiry)}
        width={width}
      />
      <span className="sr-only">{selected ? 'Selected' : 'Not selected'}</span>
    </button>
  );
}

export const checkoutSelectableChipClass = (selected: boolean) =>
  cn(
    'min-h-[44px] rounded-2xl border px-3.5 py-2.5 text-left transition-[transform,box-shadow,border-color,background-color] active:scale-[0.96]',
    selected
      ? 'border-ink/20 bg-white shadow-[0_12px_28px_-12px_rgba(26,26,26,0.18)]'
      : 'border-ink-10/80 bg-white shadow-[0_4px_16px_-8px_rgba(26,26,26,0.06)] hover:border-ink-30',
  );
