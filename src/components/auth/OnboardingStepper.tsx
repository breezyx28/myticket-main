import { cn } from '@/lib/utils';

interface OnboardingStepperProps {
  steps: string[];
  activeIdx: number;
}

export function OnboardingStepper({ steps, activeIdx }: OnboardingStepperProps) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((label, idx) => (
        <li
          key={label}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-bold',
            idx <= activeIdx ? 'bg-ink text-white' : 'bg-ink-10 text-ink-40'
          )}
        >
          {idx + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
