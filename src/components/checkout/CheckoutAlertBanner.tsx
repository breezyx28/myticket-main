import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BannerVariant = 'amber' | 'coral' | 'neutral';

type CheckoutAlertBannerProps = {
  title: string;
  children: ReactNode;
  variant?: BannerVariant;
  action?: ReactNode;
  className?: string;
};

const VARIANT_STYLES: Record<BannerVariant, string> = {
  amber: 'border-amber/40 bg-amber/10 text-ink',
  coral: 'border-coral/40 bg-coral/10 text-coral',
  neutral: 'border-ink-10 bg-white text-ink-60 shadow-[0_8px_24px_-12px_rgba(26,26,26,0.08)]',
};

export function CheckoutAlertBanner({
  title,
  children,
  variant = 'amber',
  action,
  className,
}: CheckoutAlertBannerProps) {
  return (
    <div
      className={cn(
        'mt-4 rounded-2xl border px-4 py-3.5 text-[13px] sm:px-5 sm:py-4',
        VARIANT_STYLES[variant],
        className,
      )}
      role={variant === 'coral' ? 'alert' : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('font-semibold', variant === 'coral' ? 'text-coral' : 'text-ink')}>
            {title}
          </p>
          <div className="mt-1 leading-relaxed">{children}</div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
