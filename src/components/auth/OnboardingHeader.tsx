import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function OnboardingHeader({
  title,
  description,
  steps,
  activeIdx,
}: {
  title: string;
  description?: string;
  steps: string[];
  activeIdx: number;
}) {
  const { t } = useTranslation('authPages');

  return (
    <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-ink-10 bg-white/90 px-6 py-4 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
        {t('onboarding.headerLabel')}
      </p>
      <h2 className="mt-1 text-[20px] font-extrabold tracking-tight text-ink">{title}</h2>
      {description ? <p className="mt-1 text-[13px] leading-relaxed text-ink-60">{description}</p> : null}
      <ol className="mt-3 flex flex-wrap gap-2">
        {steps.map((label, idx) => (
          <li
            key={label}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-bold',
              idx <= activeIdx ? 'bg-ink text-white' : 'bg-ink-10 text-ink-40'
            )}
          >
            {idx + 1}. {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
