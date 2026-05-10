import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] outline-none transition-colors ' +
  'focus:border-coral focus:ring-2 focus:ring-coral/25 disabled:cursor-not-allowed disabled:bg-ink-5 disabled:text-ink-40';

export const TextInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, className)} {...props} />
);
TextInput.displayName = 'TextInput';

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(base, className)} {...props} />
  )
);
Select.displayName = 'Select';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, className)} {...props} />
  )
);
TextArea.displayName = 'TextArea';

