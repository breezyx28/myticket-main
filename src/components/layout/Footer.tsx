import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ticket } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';

export function Footer() {
  const { t } = useTranslation(['footer', 'nav']);
  const { user } = useAuth();

  const footerLinks: Record<string, { label: string; to: string }[]> = useMemo(() => {
    const platform: { label: string; to: string }[] = [
      { label: t('footer:browseEvents'), to: '/events' },
      { label: t('nav:myTickets'), to: '/my-tickets' },
      { label: t('nav:auction'), to: '/auction' },
    ];
    if (canBrowseMarketplace(user)) {
      platform.splice(1, 0, { label: t('nav:marketplace'), to: '/marketplace' });
    }
    return {
      [t('footer:platform')]: platform,
      [t('footer:company')]: [{ label: t('footer:aboutUs'), to: '/about' }],
      [t('footer:support')]: [
        { label: t('footer:helpCenter'), to: '/support' },
        { label: t('footer:contactUs'), to: '/support?tab=request' },
        { label: t('footer:termsOfService'), to: '/terms' },
        { label: t('footer:privacyPolicy'), to: '/privacy' },
      ],
      [t('footer:organizers')]: [
        { label: t('footer:becomeOrganizer'), to: '/apply/organizer' },
        { label: t('footer:organizerDashboard'), to: '/organizer-portal' },
      ],
    };
  }, [t, user]);

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1280px] px-6 pb-8 pt-16 lg:px-8">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lemon">
                <Ticket size={18} weight="bold" className="text-ink" />
              </div>
              <span className="text-[17px] font-extrabold tracking-tight">
                My<span className="text-coral">Ticket</span>
              </span>
            </Link>
            <p className="max-w-[220px] text-[13px] leading-relaxed text-ink-40">
              {t('footer:brandDescription')}
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-ink-40">{title}</h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[14px] text-ink-20 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink-80 pt-8 sm:flex-row">
          <p className="text-[12px] text-ink-40">&copy; {new Date().getFullYear()} MyTicket. {t('footer:rightsReserved')}</p>
          <div className="flex items-center gap-6 text-[12px] text-ink-40">
            <Link to="/terms" className="transition-colors hover:text-white">
              {t('footer:terms')}
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              {t('footer:privacy')}
            </Link>
            <Link to="/cookies" className="transition-colors hover:text-white">
              {t('footer:cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
