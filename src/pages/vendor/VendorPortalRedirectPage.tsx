import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildVendorPortalUrl,
  getVendorPortalBaseUrl,
  isGuestVendorApplicant,
  isVendorUser,
} from '@/lib/vendorPortal';

type VendorPortalRedirectPageProps = {
  /** Path on the vendor dashboard, e.g. `/application` or `/engagements`. */
  targetPath?: string;
};

export function VendorPortalRedirectPage({ targetPath = '/' }: VendorPortalRedirectPageProps) {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const canUsePortal = isVendorUser(user) || isGuestVendorApplicant(user);
  const portalUrl = buildVendorPortalUrl(targetPath, user);

  useEffect(() => {
    if (!canUsePortal) return;
    const timer = window.setTimeout(() => {
      window.location.assign(portalUrl);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [canUsePortal, portalUrl]);

  if (!canUsePortal) {
    return (
      <div className="bg-white pb-20 pt-16">
        <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8 text-center">
          <h1 className="text-2xl font-extrabold text-ink">{t('portal.vendor.restricted')}</h1>
          <p className="mt-3 text-[14px] text-ink-60">{t('portal.vendor.restrictedBody')}</p>
          <Link to="/profile" className="mt-5 inline-block text-[13px] font-semibold text-coral hover:underline">
            {t('portal.backToAccount')}
          </Link>
        </div>
      </div>
    );
  }

  const title =
    targetPath === '/application' || targetPath.startsWith('/application')
      ? t('portal.vendor.titleApplication')
      : targetPath.startsWith('/engagements')
        ? t('portal.vendor.titleEngagements')
        : targetPath.startsWith('/profile')
          ? t('portal.vendor.titleProfile')
          : t('portal.vendor.titleDefault');

  return (
    <div className="bg-white pb-20 pt-16">
      <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">
          {t('portal.vendor.eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
          {t('portal.vendor.body')}{' '}
          <strong className="text-ink">{getVendorPortalBaseUrl()}</strong>.
          {user?.role === 'guest' ? t('portal.guestDevNote') : null}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="dark"
            onClick={() => {
              window.location.assign(portalUrl);
            }}
          >
            {t('portal.vendor.open')}
          </Button>
          <Link to="/" className="inline-flex items-center text-[13px] font-semibold text-coral hover:underline">
            {t('portal.stayOnSite')}
          </Link>
        </div>
      </div>
    </div>
  );
}
