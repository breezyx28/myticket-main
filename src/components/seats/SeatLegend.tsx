import { useTranslation } from 'react-i18next';

interface SeatLegendProps {
  className?: string;
}

export function SeatLegend({ className }: SeatLegendProps) {
  const { t } = useTranslation('seats');

  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">{t('seatStatus')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-ink-60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-mint" />
          {t('available')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-lemon" />
          {t('held')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-20" />
          {t('booked')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          {t('selected')}
        </span>
      </div>
    </div>
  );
}
