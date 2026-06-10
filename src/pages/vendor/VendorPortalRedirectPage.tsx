import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
          <h1 className="text-2xl font-extrabold text-ink">Vendor dashboard is restricted</h1>
          <p className="mt-3 text-[14px] text-ink-60">
            This area is for guest applicants and approved vendor accounts.
          </p>
          <Link to="/profile" className="mt-5 inline-block text-[13px] font-semibold text-coral hover:underline">
            Go back to Account
          </Link>
        </div>
      </div>
    );
  }

  const title =
    targetPath === '/application' || targetPath.startsWith('/application')
      ? 'Continue your Vendor application'
      : targetPath.startsWith('/engagements')
        ? 'Open Vendor engagements'
        : targetPath.startsWith('/profile')
          ? 'Open Vendor profile'
          : 'Redirecting to Vendor Dashboard';

  return (
    <div className="bg-white pb-20 pt-16">
      <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Vendor Area</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
          Vendor applications, profile, availability, and engagement inbox live on a separate app at{' '}
          <strong className="text-ink">{getVendorPortalBaseUrl()}</strong>.
          {user?.role === 'guest' ? (
            <> You may need to sign in again on that app in local development.</>
          ) : null}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="dark"
            onClick={() => {
              window.location.assign(portalUrl);
            }}
          >
            Open Vendor Dashboard
          </Button>
          <Link to="/" className="inline-flex items-center text-[13px] font-semibold text-coral hover:underline">
            Stay on main website
          </Link>
        </div>
      </div>
    </div>
  );
}
