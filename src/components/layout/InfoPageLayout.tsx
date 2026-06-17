import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type InfoPageLayoutProps = {
  title: string;
  lead?: string;
  lastUpdated?: string;
  legalDisclaimer?: boolean;
  children: ReactNode;
};

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-60">{children}</div>
    </section>
  );
}

export function InfoPageLayout({
  title,
  lead,
  lastUpdated,
  legalDisclaimer = false,
  children,
}: InfoPageLayoutProps) {
  const { t } = useTranslation('support');
  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
        {lead ? <p className="mt-4 text-[15px] leading-relaxed text-ink-60">{lead}</p> : null}
        {lastUpdated ? (
          <p className="mt-3 text-[13px] text-ink-40">{t('lastUpdated', 'Last updated')}: {lastUpdated}</p>
        ) : null}
        {legalDisclaimer ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-ink-60">
            {t('legalDisclaimer', 'Template product copy — replace with counsel-approved text before production.')}
          </p>
        ) : null}
        {children}
        <p className="mt-12 border-t border-ink-10 pt-6 text-[13px] text-ink-60">
          {t('questionsLead', 'Questions? Visit our')}{' '}
          <Link to="/support" className="font-semibold text-coral hover:underline">
            {t('title')}
          </Link>{' '}
          {t('or', 'or')}{' '}
          <Link to="/support?tab=request" className="font-semibold text-coral hover:underline">
            {t('contactSupport', 'contact support')}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
