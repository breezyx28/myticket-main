import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { buildOrganizerPortalUrl, getOrganizerPortalBaseUrl, isOrganizerUser } from '@/lib/organizerPortal';

export function OrganizerPortalRedirectPage() {
  const { t } = useTranslation(['profile', 'nav']);
  const { user } = useAuth();
  const organizerUrl = buildOrganizerPortalUrl('/', user);

  useEffect(() => {
    if (!isOrganizerUser(user)) return;
    const timer = window.setTimeout(() => {
      window.location.assign(organizerUrl);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [organizerUrl, user]);

  if (!isOrganizerUser(user)) {
    return (
      <div className="bg-white pb-20 pt-16">
        <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8 text-center">
          <h1 className="text-2xl font-extrabold text-ink">{t('profile:portal.organizer.restricted')}</h1>
          <p className="mt-3 text-[14px] text-ink-60">{t('profile:portal.organizer.restrictedBody')}</p>
          <Link to="/profile" className="mt-5 inline-block text-[13px] font-semibold text-coral hover:underline">
            {t('profile:portal.backToAccount')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pb-20 pt-16">
      <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">
          {t('profile:portal.organizer.eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">{t('profile:portal.organizer.title')}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
          {t('profile:portal.organizer.body')}{' '}
          <strong className="text-ink">{getOrganizerPortalBaseUrl()}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="dark"
            onClick={() => {
              window.location.assign(organizerUrl);
            }}
          >
            {t('profile:portal.organizer.open')}
          </Button>
          <Link to="/marketplace" className="inline-flex items-center text-[13px] font-semibold text-coral hover:underline">
            {t('profile:portal.stayOnSite')}
          </Link>
        </div>
      </div>
    </div>
  );
}
