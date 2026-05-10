import * as React from 'react';
import { cn } from '@/lib/utils';

type InlineNoticeProps = {
  title: string;
  children?: React.ReactNode;
  variant?: 'info' | 'warning' | 'success';
  className?: string;
};

export function InlineNotice({ title, children, variant = 'info', className }: InlineNoticeProps) {
  const tone =
    variant === 'success'
      ? 'border-mint/40 bg-mint/15'
      : variant === 'warning'
        ? 'border-lemon/50 bg-lemon/15'
        : 'border-ink-10 bg-ink-5/50';
  return (
    <div className={cn('rounded-xl border p-4 text-[13px] text-ink-60', tone, className)}>
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1.5">{children}</div> : null}
    </div>
  );
}

