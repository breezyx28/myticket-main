import { useTranslation } from 'react-i18next';
import type { TourismAdDayHours, TourismAdOpeningHours } from '@/api/types/tourismAd';
import { TOURISM_AD_WEEKDAYS, tourismWeekdayLabel } from '@/schemas/tourismAd';
import { cn } from '@/lib/utils';

interface OpeningHoursEditorProps {
  value: TourismAdOpeningHours;
  onChange: (next: TourismAdOpeningHours) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
}

export function OpeningHoursEditor({
  value,
  onChange,
  disabled,
  fieldErrors = {},
}: OpeningHoursEditorProps) {
  const { t } = useTranslation('tourism');

  function patchDay(day: (typeof TOURISM_AD_WEEKDAYS)[number], patch: Partial<TourismAdDayHours>) {
    const current = value[day] ?? { closed: true };
    onChange({
      ...value,
      [day]: { ...current, ...patch },
    });
  }

  return (
    <div className="space-y-3">
      {TOURISM_AD_WEEKDAYS.map((day) => {
        const hours = value[day] ?? { closed: true };
        const dayErr =
          fieldErrors[`opening_hours.${day}`] ??
          fieldErrors[`opening_hours.${day}.opens`] ??
          fieldErrors[`opening_hours.${day}.closes`];
        return (
          <div
            key={day}
            className={cn(
              'grid gap-3 rounded-xl border border-ink-10 p-3 sm:grid-cols-[120px_1fr_auto]',
              hours.closed && 'bg-ink-5/40',
              dayErr && 'border-coral/40 bg-coral/5',
            )}
          >
            <p className="text-[13px] font-bold text-ink">{tourismWeekdayLabel(t, day)}</p>
            <label className="flex items-center gap-2 text-[12px] font-medium text-ink-60">
              <input
                type="checkbox"
                checked={hours.closed}
                disabled={disabled}
                onChange={(e) =>
                  patchDay(day, {
                    closed: e.target.checked,
                    ...(e.target.checked
                      ? { opens: undefined, closes: undefined }
                      : { opens: '09:00', closes: '18:00' }),
                  })
                }
                className="rounded border-ink-20"
              />
              {t('openingHours.closed')}
            </label>
            {!hours.closed ? (
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2 sm:justify-end">
                <input
                  type="time"
                  value={hours.opens ?? ''}
                  disabled={disabled}
                  onChange={(e) => patchDay(day, { opens: e.target.value })}
                  className="rounded-lg border border-ink-10 px-2 py-1.5 text-[13px]"
                />
                <span className="text-[12px] text-ink-40">{t('openingHours.to')}</span>
                <input
                  type="time"
                  value={hours.closes ?? ''}
                  disabled={disabled}
                  onChange={(e) => patchDay(day, { closes: e.target.value })}
                  className="rounded-lg border border-ink-10 px-2 py-1.5 text-[13px]"
                />
              </div>
            ) : null}
            {dayErr ? (
              <p className="text-[11px] font-medium text-coral sm:col-span-3">{dayErr}</p>
            ) : null}
          </div>
        );
      })}
      {fieldErrors.opening_hours ? (
        <p className="text-[12px] font-medium text-coral">{fieldErrors.opening_hours}</p>
      ) : null}
    </div>
  );
}
