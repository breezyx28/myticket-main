import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from '@phosphor-icons/react';
import { useGetTourismAdQuery } from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { TourismAdDetailSkeleton } from '@/components/tourism/TourismAdDetailSkeleton';
import { TourismAdDetailView } from '@/components/tourism/TourismAdDetailView';

export function TourismAdDetailPage() {
  const { t } = useTranslation('tourism');
  const { id } = useParams<{ id: string }>();
  const { data: ad, isLoading, isError } = useGetTourismAdQuery(id ?? '', {
    skip: !id,
  });

  if (isLoading) {
    return <TourismAdDetailSkeleton />;
  }

  if (isError || !ad) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink-5 px-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Compass size={32} weight="duotone" className="text-ink-40" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{t('detail.notAvailableTitle')}</h1>
        <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-ink-60">
          {t('detail.notAvailableBody')}
        </p>
        <Link to="/" className="mt-8">
          <Button type="button" variant="dark" size="md">
            {t('detail.backHome')}
          </Button>
        </Link>
      </div>
    );
  }

  return <TourismAdDetailView ad={ad} />;
}
