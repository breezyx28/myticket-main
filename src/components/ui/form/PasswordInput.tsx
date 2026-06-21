import { forwardRef, useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { TextInput } from '@/components/ui/form/inputs';

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  showLabel: string;
  hideLabel: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, showLabel, hideLabel, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <TextInput
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pe-10', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded text-ink-60 hover:text-ink"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
        </button>
      </div>
    );
  },
);
