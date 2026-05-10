import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { buildOrganizerPortalUrl, getOrganizerPortalBaseUrl, isOrganizerUser } from '@/lib/organizerPortal';

export function OrganizerPortalRedirectPage() {
  const { user } = useAuth();
  const organizerUrl = buildOrganizerPortalUrl(user);

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
          <h1 className="text-2xl font-extrabold text-ink">Organizer portal is restricted</h1>
          <p className="mt-3 text-[14px] text-ink-60">
            This portal is only available for approved organizer accounts.
          </p>
          <Link to="/profile" className="mt-5 inline-block text-[13px] font-semibold text-coral hover:underline">
            Go back to Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pb-20 pt-16">
      <div className="mx-auto max-w-[760px] rounded-2xl border border-ink-10 bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Organizer Area</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Redirecting to Organizer Dashboard</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
          Organizer management (content, profile settings, analytics, finance, sold/bought tickets, and scanner
          tools) is handled on a separate application at <strong className="text-ink">{getOrganizerPortalBaseUrl()}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="dark"
            onClick={() => {
              window.location.assign(organizerUrl);
            }}
          >
            Open Organizer Dashboard
          </Button>
          <Link to="/marketplace" className="inline-flex items-center text-[13px] font-semibold text-coral hover:underline">
            Stay on main website
          </Link>
        </div>
      </div>
    </div>
  );
}
