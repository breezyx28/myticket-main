import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'colored' | 'outline' | 'dark' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-ink-5 text-ink-60',
  colored: '',
  outline: 'border border-ink-20 text-ink-20',
  dark:    'bg-ink text-white',
  success: 'bg-lime text-ink',
  warning: 'bg-amber text-ink',
  danger:  'bg-coral text-white',
};

export function Badge({ label, variant = 'default', color = '', dot = false, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold',
      variant === 'colored' ? color : variantClasses[variant],
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
      {label}
    </span>
  );
}
