import { cn } from '@/lib/utils';

type CheckoutFlow = 'ga' | 'seated';

type CheckoutStepIndicatorProps = {
  flow: CheckoutFlow;
  /** Internal step: 1 | 2 | 3 (seated skips step 1 in UI). */
  step: 1 | 2 | 3;
  className?: string;
};

const GA_STEPS = [
  { key: 1, label: 'Tickets' },
  { key: 2, label: 'Review' },
  { key: 3, label: 'Pay' },
] as const;

const SEATED_STEPS = [
  { key: 2, label: 'Review' },
  { key: 3, label: 'Pay' },
] as const;

export function CheckoutStepIndicator({ flow, step, className }: CheckoutStepIndicatorProps) {
  const steps = flow === 'seated' ? SEATED_STEPS : GA_STEPS;

  return (
    <nav aria-label="Checkout progress" className={cn('mt-8', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((item, index) => {
          const isComplete = step > item.key;
          const isCurrent = step === item.key;
          const displayIndex = flow === 'seated' ? index + 1 : item.key;

          return (
            <li key={item.key} className="flex items-center gap-2">
              {index > 0 ? (
                <span
                  className={cn(
                    'hidden h-px w-6 sm:block',
                    isComplete || isCurrent ? 'bg-ink-30' : 'bg-ink-10',
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors',
                  isCurrent && 'bg-ink text-white shadow-[0_4px_12px_-4px_rgba(26,26,26,0.25)]',
                  isComplete && !isCurrent && 'bg-ink-10 text-ink',
                  !isCurrent && !isComplete && 'bg-ink-5 text-ink-40',
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
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
