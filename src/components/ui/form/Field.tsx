import * as React from 'react';
import { cn } from '@/lib/utils';

type FieldProps = {
  label: string;
  htmlFor?: string;
  helperText?: string;
  errorText?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, helperText, errorText, right, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-semibold text-ink-60"
        >
          {label}
        </label>
        {right}
      </div>
      {children}
      {errorText ? (
        <p className="text-[12px] font-semibold text-coral">{errorText}</p>
      ) : helperText ? (
        <p className="text-[11px] leading-relaxed text-ink-40">{helperText}</p>
      ) : null}
    </div>
  );
}

