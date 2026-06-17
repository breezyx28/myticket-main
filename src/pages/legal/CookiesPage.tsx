import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InfoPageLayout, InfoSection } from '@/components/layout/InfoPageLayout';

export function CookiesPage() {
  const { t } = useTranslation('legal');

  return (
    <InfoPageLayout
      title={t('cookies.title')}
      lead={t('cookies.lead')}
      lastUpdated="June 2026"
      legalDisclaimer
    >
      <InfoSection title={t('cookies.whatTitle')}>
        <p>{t('cookies.whatBody')}</p>
      </InfoSection>
      <InfoSection title={t('cookies.essentialTitle')}>
        <p>{t('cookies.essentialBody')}</p>
      </InfoSection>
      <InfoSection title={t('cookies.preferenceTitle')}>
        <p>{t('cookies.preferenceBody')}</p>
      </InfoSection>
      <InfoSection title={t('cookies.analyticsTitle')}>
        <p>{t('cookies.analyticsBody')}</p>
      </InfoSection>
      <InfoSection title={t('cookies.managingTitle')}>
        <p>{t('cookies.managingBody1')}</p>
        <p>
          {t('cookies.managingBody2')}{' '}
          <Link to="/privacy" className="font-semibold text-coral hover:underline">
            {t('cookies.privacyLink')}
          </Link>
          .
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
