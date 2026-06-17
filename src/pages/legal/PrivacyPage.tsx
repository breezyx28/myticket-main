import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InfoPageLayout, InfoSection } from '@/components/layout/InfoPageLayout';

export function PrivacyPage() {
  const { t } = useTranslation('legal');

  return (
    <InfoPageLayout
      title={t('privacy.title')}
      lead={t('privacy.lead')}
      lastUpdated="June 2026"
      legalDisclaimer
    >
      <InfoSection title={t('privacy.collectTitle')}>
        <p>{t('privacy.collectBody1')}</p>
        <p>{t('privacy.collectBody2')}</p>
      </InfoSection>
      <InfoSection title={t('privacy.useTitle')}>
        <p>{t('privacy.useBody1')}</p>
        <p>{t('privacy.useBody2')}</p>
      </InfoSection>
      <InfoSection title={t('privacy.sharingTitle')}>
        <p>{t('privacy.sharingBody1')}</p>
        <p>{t('privacy.sharingBody2')}</p>
      </InfoSection>
      <InfoSection title={t('privacy.retentionTitle')}>
        <p>{t('privacy.retentionBody')}</p>
      </InfoSection>
      <InfoSection title={t('privacy.rightsTitle')}>
        <p>
          {t('privacy.rightsBody')}{' '}
          <Link to="/support?tab=request" className="font-semibold text-coral hover:underline">
            {t('privacy.supportLink')}
          </Link>
          .
        </p>
      </InfoSection>
      <InfoSection title={t('privacy.cookiesTitle')}>
        <p>
          {t('privacy.cookiesBody')}{' '}
          <Link to="/cookies" className="font-semibold text-coral hover:underline">
            {t('privacy.cookiesLink')}
          </Link>
          .
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
