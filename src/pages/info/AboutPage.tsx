import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InfoPageLayout, InfoSection } from '@/components/layout/InfoPageLayout';
import { Button } from '@/components/ui/Button';

export function AboutPage() {
  const { t } = useTranslation('about');

  return (
    <InfoPageLayout title={t('title')} lead={t('lead')}>
      <InfoSection title={t('missionTitle')}>
        <p>{t('missionBody')}</p>
      </InfoSection>

      <InfoSection title={t('fansTitle')}>
        <p>{t('fansBody')}</p>
        <p>
          <Link to="/events" className="font-semibold text-coral hover:underline">
            {t('exploreEvents')}
          </Link>{' '}
          or{' '}
          <Link to="/my-tickets" className="font-semibold text-coral hover:underline">
            {t('viewTickets')}
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection title={t('organizersTitle')}>
        <p>{t('organizersBody')}</p>
        <p>
          <Link to="/apply/organizer" className="font-semibold text-coral hover:underline">
            {t('becomeOrganizer')}
          </Link>{' '}
          or{' '}
          <Link to="/organizer-portal" className="font-semibold text-coral hover:underline">
            {t('organizerDashboard')}
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection title={t('marketplaceTitle')}>
        <p>
          {t('marketplaceBody')}{' '}
          <Link to="/terms" className="font-semibold text-coral hover:underline">
            {t('termsLink')}
          </Link>
          .
        </p>
      </InfoSection>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild variant="primary" size="md">
          <Link to="/events">{t('browseEvents')}</Link>
        </Button>
        <Button asChild variant="outline" size="md">
          <Link to="/support">{t('getHelp')}</Link>
        </Button>
      </div>
    </InfoPageLayout>
  );
}
