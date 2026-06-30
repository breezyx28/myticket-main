import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const ok = valueLength >= min && valueLength <= max;
  return (
    <span
      className={cn(
        ok ? 'text-[11px] font-bold text-mint-dark' : 'text-[11px] font-bold text-ink-40',
        className,
      )}
    >
      {t('charCounter', { current: valueLength, min, max })}
    </span>
  );
}
