import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CheckoutShellProps = {
  children: ReactNode;
  className?: string;
};

export function CheckoutShell({ children, className }: CheckoutShellProps) {
  return (
    <div className={cn('bg-ink-5/40 pb-20 pt-10', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

type CheckoutLayoutProps = {
  main: ReactNode;
  aside?: ReactNode;
  className?: string;
};

/** Asymmetric checkout layout: main column + optional sticky summary aside on lg+. */
export function CheckoutLayout({ main, aside, className }: CheckoutLayoutProps) {
  if (!aside) {
    return <div className={className}>{main}</div>;
  }

  return (
    <div
      className={cn(
        'mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start',
        className,
      )}
    >
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0 lg:sticky lg:top-24">{aside}</aside>
    </div>
  );
}

type CheckoutMainPanelProps = {
  children: ReactNode;
  className?: string;
};

export function CheckoutMainPanel({ children, className }: CheckoutMainPanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[2rem] border border-ink-10/80 bg-white p-6 shadow-[0_20px_40px_-15px_rgba(26,26,26,0.06)] sm:p-8',
        className,
      )}
    >
      {children}
    </section>
  );
}

export const CHECKOUT_MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-6 backdrop-blur-[2px]';
