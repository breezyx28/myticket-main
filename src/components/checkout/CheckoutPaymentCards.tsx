import { useTranslation } from 'react-i18next';
import { CreditCard } from '@/components/checkout/CreditCard';
import {
  creditCardNetworkForBrand,
  displayCardExpiration,
  displayCardHolder,
  displayCardLabel,
  displayCardNumber,
  maskSavedCardNumber,
  resolveCardNetwork,
} from '@/components/checkout/checkoutCreditCardUtils';
import { formatSavedCardExpiry } from '@/lib/cardPayment';
import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';
import { cn } from '@/lib/utils';

type CheckoutSavedCardButtonProps = {
  brand: string | null | undefined;
  last4: string;
  expMonth: number | string;
  expYear: number | string;
  holderName?: string;
  cardLabel?: string;
  selected: boolean;
  onSelect: () => void;
  width?: number;
};

export function CheckoutSavedCardButton({
  brand,
  last4,
  expMonth,
  expYear,
  holderName,
  cardLabel,
  selected,
  onSelect,
  width = 260,
}: CheckoutSavedCardButtonProps) {
  const { t } = useTranslation('checkout');
  const network = creditCardNetworkForBrand(brand);
  const expiry = formatSavedCardExpiry(Number(expMonth), Number(expYear));

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t('savedCardEnding', { last4 })}
      className={cn(
        'snap-center rounded-[1.25rem] p-1 text-left transition-[transform,box-shadow,opacity] active:scale-[0.96]',
        selected
          ? 'opacity-100 shadow-[0_16px_40px_-16px_rgba(26,26,26,0.35)] ring-2 ring-coral ring-offset-2 ring-offset-white'
          : 'opacity-80 hover:opacity-100',
      )}
    >
      <CreditCard
        network={network}
        label={displayCardLabel(cardLabel ?? '')}
        cardNumber={maskSavedCardNumber(last4)}
        cardHolder={displayCardHolder(holderName ?? '')}
        cardExpiration={displayCardExpiration(expiry)}
        width={width}
      />
    </button>
  );
}

type CheckoutNewCardButtonProps = {
  selected: boolean;
  onSelect: () => void;
  width?: number;
};

export function CheckoutNewCardButton({ selected, onSelect, width = 260 }: CheckoutNewCardButtonProps) {
  const { t } = useTranslation('checkout');

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t('useNewCard')}
      className={cn(
        'flex snap-center items-center justify-center rounded-[1.25rem] border-2 border-dashed p-1 transition-[transform,border-color,opacity] active:scale-[0.96]',
        selected ? 'border-coral opacity-100' : 'border-ink-20 opacity-80 hover:border-ink-30 hover:opacity-100',
      )}
      style={{ width: `${width}px`, height: `${Math.round((width / 316) * 190)}px` }}
    >
      <div className="text-center">
        <p className="text-[13px] font-bold text-ink">{t('newCard')}</p>
        <p className="mt-1 text-[11px] text-ink-60">{t('enterDetailsBelow')}</p>
      </div>
    </button>
  );
}

type CheckoutPaymentCardPreviewProps = {
  cardNumber: string;
  cardholder: string;
  cardLabel: string;
  expiry: string;
  numberPlaceholder: string;
  fallbackNetwork?: CardPaymentMethod | null;
};

export function CheckoutPaymentCardPreview({
  cardNumber,
  cardholder,
  cardLabel,
  expiry,
  numberPlaceholder,
  fallbackNetwork = null,
}: CheckoutPaymentCardPreviewProps) {
  const network = resolveCardNetwork(cardNumber, fallbackNetwork);

  return (
    <div className="flex justify-center rounded-2xl bg-ink-5/60 px-4 py-6">
      <CreditCard
        network={network}
        label={displayCardLabel(cardLabel)}
        cardNumber={displayCardNumber(cardNumber, numberPlaceholder)}
        cardHolder={displayCardHolder(cardholder)}
        cardExpiration={displayCardExpiration(expiry)}
        width={316}
      />
    </div>
  );
}
