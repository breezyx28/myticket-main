import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CheckoutStep } from '@/lib/checkoutNav';

type CheckoutFlow = 'ga' | 'seated';

type StepItem = {
  key: CheckoutStep | 'seats';
  labelKey: string;
};

type CheckoutStepIndicatorProps = {
  flow: CheckoutFlow;
  step: CheckoutStep;
  /** Furthest step reached this session — enables clicking back through completed steps. */
  maxStepReached: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
  /** Seated flow only — jump back to the seat map. */
  onSeatsClick?: () => void;
  className?: string;
};

const GA_STEPS: StepItem[] = [
  { key: 1, labelKey: 'stepTickets' },
  { key: 2, labelKey: 'stepReview' },
  { key: 3, labelKey: 'stepPay' },
];

const SEATED_STEPS: StepItem[] = [
  { key: 'seats', labelKey: 'stepSeats' },
  { key: 2, labelKey: 'stepReview' },
  { key: 3, labelKey: 'stepPay' },
];

function stepRank(key: StepItem['key']): number {
  if (key === 'seats') return 0;
  return key;
}

export function CheckoutStepIndicator({
  flow,
  step,
  maxStepReached,
  onStepClick,
  onSeatsClick,
  className,
}: CheckoutStepIndicatorProps) {
  const { t } = useTranslation('checkout');
  const steps = flow === 'seated' ? SEATED_STEPS : GA_STEPS;

  return (
    <nav aria-label={t('progressAria')} className={cn('mt-8', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((item, index) => {
          const rank = stepRank(item.key);
          const isSeats = item.key === 'seats';
          const isComplete = isSeats ? step >= 2 : step > rank;
          const isCurrent = !isSeats && step === item.key;
          const displayIndex = index + 1;
          const canClickSeats = isSeats && !!onSeatsClick;
          const canClickStep =
            !isSeats && !!onStepClick && typeof item.key === 'number' && item.key <= maxStepReached;
          const clickable = canClickSeats || canClickStep;

          const pill = (
            <span
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors',
                isCurrent && 'bg-ink text-white shadow-[0_4px_12px_-4px_rgba(26,26,26,0.25)]',
                isComplete && !isCurrent && 'bg-ink-10 text-ink',
                !isCurrent && !isComplete && 'bg-ink-5 text-ink-40',
                clickable && !isCurrent && 'hover:bg-ink-10 hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[10px] tabular-nums',
                  isCurrent ? 'bg-white/20' : 'bg-ink-10 text-ink-60',
                )}
              >
                {displayIndex}
              </span>
              {t(item.labelKey)}
            </span>
          );

          return (
            <li key={String(item.key)} className="flex items-center gap-2">
              {index > 0 ? (
                <span
                  className={cn(
                    'hidden h-px w-6 sm:block',
                    isComplete || isCurrent ? 'bg-ink-30' : 'bg-ink-10',
                  )}
                  aria-hidden
                />
              ) : null}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isSeats) onSeatsClick?.();
                    else if (typeof item.key === 'number') onStepClick?.(item.key);
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                >
                  {pill}
                </button>
              ) : (
                <span aria-current={isCurrent ? 'step' : undefined}>{pill}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
