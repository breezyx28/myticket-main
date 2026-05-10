import { Link } from 'react-router-dom';
import { Ticket, Globe, ChatCircle, ShareNetwork, Play } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';

export function Footer() {
  const { user } = useAuth();

  const footerLinks: Record<string, { label: string; to: string }[]> = useMemo(() => {
    const platform: { label: string; to: string }[] = [
      { label: 'Browse Events', to: '/events' },
      { label: 'My Tickets', to: '/my-tickets' },
      { label: 'Auction', to: '/auction' },
    ];
    if (canBrowseMarketplace(user)) {
      platform.splice(1, 0, { label: 'Marketplace', to: '/marketplace' });
    }
    return {
      Platform: platform,
    Company: [
      { label: 'About Us', to: '/events' },
      { label: 'Careers', to: '/events' },
      { label: 'Press', to: '/events' },
      { label: 'Blog', to: '/events' },
    ],
    Support: [
      { label: 'Help Center', to: '/support' },
      { label: 'Contact Us', to: '/support' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
    ],
      Organizers: [
        { label: 'Create Event', to: '/events' },
        { label: 'Organizer Dashboard', to: '/events' },
        { label: 'Scanner App', to: '/events' },
        { label: 'Analytics', to: '/events' },
      ],
    };
  }, [user]);

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
              Discover, book, and experience live events across Saudi Arabia.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Globe, ChatCircle, ShareNetwork, Play].map((Icon, i) => (
                <a
                  key={i}
                  href="https://example.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-80 text-ink-20 transition-colors hover:bg-coral hover:text-white"
                >
                  <Icon size={16} weight="bold" />
                </a>
              ))}
            </div>
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
          <p className="text-[12px] text-ink-40">&copy; {new Date().getFullYear()} MyTicket. All rights reserved.</p>
          <div className="flex items-center gap-6 text-[12px] text-ink-40">
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/cookies" className="transition-colors hover:text-white">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
