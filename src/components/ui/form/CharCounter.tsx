import { cn } from '@/lib/utils';

export function CharCounter({
  valueLength,
  min,
  max,
  className,
}: {
  valueLength: number;
  min: number;
  max: number;
  className?: string;
}) {
  const ok = valueLength >= min && valueLength <= max;
  return (
    <span className={cn(ok ? 'text-[11px] font-bold text-mint-dark' : 'text-[11px] font-bold text-ink-40', className)}>
      {valueLength} / {max} (min {min})
    </span>
  );
}

