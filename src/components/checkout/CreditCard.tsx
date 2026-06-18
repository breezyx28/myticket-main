import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { themeForNetwork } from '@/components/checkout/cardNetworkTheme';
import { PaypassIcon } from '@/components/checkout/credit-card-icons';
import { cn } from '@/lib/utils';
import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';

const CARD_SURFACE =
  'before:pointer-events-none before:absolute before:inset-0 before:z-[1] before:rounded-[inherit] before:ring-1 before:ring-inset before:ring-white/20';

type CreditCardProps = {
  /** Top-left label on the card (nickname), not the merchant name. */
  label?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiration?: string;
  network?: CardPaymentMethod | null;
  className?: string;
  width?: number;
};

const ORIGINAL_WIDTH = 316;
const ORIGINAL_HEIGHT = 190;

function calculateScale(desiredWidth: number) {
  const scale = desiredWidth / ORIGINAL_WIDTH;
  return {
    scale: scale.toFixed(4),
    scaledWidth: (ORIGINAL_WIDTH * scale).toFixed(2),
    scaledHeight: (ORIGINAL_HEIGHT * scale).toFixed(2),
  };
}

export function CreditCard({
  label,
  cardNumber = '•••• •••• •••• ••••',
  cardHolder,
  cardExpiration,
  network = null,
  className,
  width,
}: CreditCardProps) {
  const { t } = useTranslation('checkout');
  const theme = themeForNetwork(network);
  const resolvedLabel = label ?? t('myCard');
  const resolvedHolder = cardHolder ?? t('cardHolder');
  const resolvedExpiry = cardExpiration ?? t('cardExpiry');

  const { scale, scaledWidth, scaledHeight } = useMemo(() => {
    if (!width) {
      return { scale: '1', scaledWidth: String(ORIGINAL_WIDTH), scaledHeight: String(ORIGINAL_HEIGHT) };
    }
    return calculateScale(width);
  }, [width]);

  return (
    <div
      style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
      className={cn('relative flex', className)}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          width: `${ORIGINAL_WIDTH}px`,
          height: `${ORIGINAL_HEIGHT}px`,
        }}
        className={cn(
          'absolute left-0 top-0 flex origin-top-left flex-col justify-between overflow-hidden rounded-2xl p-4 transition-[background,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          CARD_SURFACE,
          theme.root,
        )}
      >
        {theme.strip ? (
          <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42%]', theme.strip)} />
        ) : null}

        <div className="relative z-[2] flex items-start justify-between px-1 pt-1">
          <div className={cn('text-base font-semibold leading-normal', theme.text)}>{resolvedLabel}</div>
          <PaypassIcon className={theme.paypass} />
        </div>

        <div className="relative z-[2] flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-end gap-1">
              <p
                className={cn(
                  'text-xs font-semibold uppercase leading-snug tracking-[0.6px]',
                  theme.text,
                )}
                style={{ wordBreak: 'break-word' }}
              >
                {resolvedHolder}
              </p>
              <p
                className={cn(
                  'ml-auto text-right text-xs font-semibold leading-normal tracking-[0.6px] tabular-nums',
                  theme.text,
                )}
              >
                {resolvedExpiry}
              </p>
            </div>
            <div
              className={cn(
                'text-base font-semibold leading-normal tracking-[1px] tabular-nums',
                theme.text,
              )}
            >
              {cardNumber}
              <span className="pointer-events-none invisible inline-block w-0 max-w-0 opacity-0">1</span>
            </div>
          </div>

          {theme.logoSrc ? (
            <div className="flex h-9 shrink-0 items-center justify-end">
              <img
                src={theme.logoSrc}
                alt=""
                className={cn('w-auto object-contain', theme.logoHeight, theme.logoClass)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
