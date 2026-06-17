import { useTranslation } from 'react-i18next';
import { InfoPageLayout, InfoSection } from '@/components/layout/InfoPageLayout';

export function TermsPage() {
  const { t } = useTranslation('legal');

  return (
    <InfoPageLayout
      title={t('terms.title')}
      lead={t('terms.lead')}
      lastUpdated="June 2026"
      legalDisclaimer
    >
      <InfoSection title={t('terms.accountsTitle')}>
        <p>{t('terms.accountsBody')}</p>
      </InfoSection>
      <InfoSection title={t('terms.purchasesTitle')}>
        <p>{t('terms.purchasesBody1')}</p>
        <p>{t('terms.purchasesBody2')}</p>
      </InfoSection>
      <InfoSection title={t('terms.overlappingTitle')}>
        <p>{t('terms.overlappingBody')}</p>
      </InfoSection>
      <InfoSection title={t('terms.cancellationsTitle')}>
        <p>{t('terms.cancellationsBody')}</p>
      </InfoSection>
      <InfoSection title={t('terms.auctionTitle')}>
        <p>{t('terms.auctionBody')}</p>
      </InfoSection>
      <InfoSection title={t('terms.liabilityTitle')}>
        <p>{t('terms.liabilityBody')}</p>
      </InfoSection>
      <InfoSection title={t('terms.changesTitle')}>
        <p>{t('terms.changesBody')}</p>
      </InfoSection>
    </InfoPageLayout>
  );
}
