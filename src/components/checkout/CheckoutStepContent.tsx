import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CheckoutStepContentProps = {
  children: ReactNode;
  className?: string;
};

/** Staggered enter for step panels — CSS only, interruptible. */
export function CheckoutStepContent({ children, className }: CheckoutStepContentProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both',
        className,
      )}
      style={{ animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {children}
    </div>
  );
}
