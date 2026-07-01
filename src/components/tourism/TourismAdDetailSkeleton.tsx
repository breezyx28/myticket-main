import { useTranslation } from 'react-i18next';

export function TourismAdDetailSkeleton() {
  const { t } = useTranslation('tourism');

  return (
    <div className="min-h-[100dvh] animate-pulse bg-ink-5" role="status" aria-live="polite">
      <span className="sr-only">{t('detail.loading')}</span>
      <div className="min-h-[min(72dvh,640px)] bg-ink-10" />
      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-4 w-32 rounded bg-ink-10" />
            <div className="h-24 rounded-2xl bg-ink-10" />
            <div className="h-4 w-24 rounded bg-ink-10" />
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-full bg-ink-10" />
              <div className="h-9 w-28 rounded-full bg-ink-10" />
            </div>
          </div>
          <div className="h-80 rounded-[1.75rem] bg-ink-10" />
        </div>
        <div className="mt-14 h-72 rounded-[1.75rem] bg-ink-10" />
      </div>
    </div>
  );
}
