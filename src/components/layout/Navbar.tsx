import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, MagnifyingGlass, Bell, Hamburger, X, Globe, IconContext } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import {
  getEffectiveLanguage,
  setGuestLanguage,
  type AppLanguage,
} from '@/lib/language';
import { changeAppLanguage } from '@/i18n';
import { canAccessEngagementsInbox, canBrowseMarketplace } from '@/lib/marketplaceAccess';
import { isOrganizerUser } from '@/lib/organizerPortal';
import { isTalentUser } from '@/lib/talentPortal';
import { isVendorUser } from '@/lib/vendorPortal';

export function Navbar() {
  const { t } = useTranslation(['common', 'nav']);
  const { user, signOut, updatePreferences } = useAuth();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [langBusy, setLangBusy] = useState(false);

  const currentLanguage = getEffectiveLanguage(user?.preferences.language);

  async function toggleLanguage() {
    if (langBusy) return;
    const nextLanguage: AppLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    setLangBusy(true);
    try {
      if (user) {
        await updatePreferences({ language: nextLanguage });
      } else {
        setGuestLanguage(nextLanguage);
        changeAppLanguage(nextLanguage);
      }
    } catch {
      changeAppLanguage(currentLanguage);
    } finally {
      setLangBusy(false);
    }
  }

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = useMemo(() => {
    const links: { label: string; to: string }[] = [{ label: t('nav:events'), to: '/events' }];
    if (canBrowseMarketplace(user)) {
      links.push({ label: t('nav:marketplace'), to: '/marketplace' });
    }
    if (canAccessEngagementsInbox(user)) {
      links.push({ label: t('nav:engagements'), to: '/engagements' });
    }
    links.push(
      { label: t('nav:auction'), to: '/auction' },
      { label: t('nav:myTickets'), to: '/my-tickets' }
    );
    return links;
  }, [t, user]);
  const profilePath = isOrganizerUser(user)
    ? '/organizer-portal'
    : isTalentUser(user)
      ? '/talent-portal'
      : isVendorUser(user)
        ? '/vendor-portal'
        : '/profile';

  return (
    <IconContext.Provider value={{ weight: 'fill' }}>
      <header
        className={cn(
          'sticky z-50 w-full',
          'transition-[top,padding-left,padding-right] duration-[580ms] ease-[cubic-bezier(0.33,1.45,0.48,1)]',
          scrolled ? 'top-[25px] px-3 sm:px-5 md:px-8' : 'top-0 px-0'
        )}
      >
        <nav
          className={cn(
            'relative flex min-h-[60px] w-full flex-col overflow-visible',
            'transition-[border-radius,background-color,backdrop-filter,box-shadow,border-color] duration-[580ms] ease-[cubic-bezier(0.33,1.45,0.48,1)]',
            scrolled
              ? 'rounded-2xl border border-ink-10/90 bg-white/75 shadow-[0_12px_40px_rgba(0,0,0,0.09)] backdrop-blur-xl backdrop-saturate-150 md:rounded-[1.35rem]'
              : 'rounded-none border-b border-transparent bg-transparent shadow-none backdrop-blur-none'
          )}
        >
          <div className="relative z-10 flex h-[60px] w-full items-center px-6 lg:px-8">
            <Link to="/" className="me-12 flex flex-shrink-0 items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lemon">
                <Ticket size={18} className="text-ink" />
              </div>
              <span className="text-[17px] font-extrabold tracking-tight text-ink">
                My<span className="text-coral">Ticket</span>
              </span>
            </Link>

            <div className="hidden flex-1 items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-[12px] font-bold text-ink-60 transition-colors hover:text-coral"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-40 transition-colors hover:bg-ink-5 hover:text-ink"
                aria-label={t('nav:searchEvents')}
              >
                <MagnifyingGlass size={18} />
              </button>
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-40 transition-colors hover:bg-ink-5 hover:text-ink"
                  aria-label={t('common:notifications')}
                  aria-expanded={notifOpen}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute end-0 top-[calc(100%+8px)] z-[60] w-[min(100vw-2rem,20rem)] rounded-2xl border border-ink-10 bg-white py-2 shadow-card-lg">
                    <div className="flex items-center justify-between border-b border-ink-10 px-3 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{t('common:notifications')}</span>
                      {user && (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-coral hover:underline"
                          onClick={() => markAllRead()}
                        >
                          {t('common:markAllRead')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {!user ? (
                        <div className="px-3 py-6 text-center">
                          <p className="text-[13px] text-ink-40">{t('common:signInToSeeNotifications')}</p>
                          <Link
                            to="/login"
                            onClick={() => setNotifOpen(false)}
                            className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-[12px] font-semibold text-white hover:bg-ink-80"
                          >
                            {t('common:signIn')}
                          </Link>
                        </div>
                      ) : items.length === 0 ? (
                        <p className="px-3 py-6 text-center text-[13px] text-ink-40">{t('common:noNotifications')}</p>
                      ) : (
                        items.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'border-b border-ink-5 px-3 py-2.5 last:border-0',
                              !n.read && 'bg-lemon/10'
                            )}
                          >
                            {n.href ? (
                              <Link
                                to={n.href}
                                className="block text-start"
                                onClick={() => {
                                  markRead(n.id);
                                  setNotifOpen(false);
                                }}
                              >
                                <p className="text-[13px] font-bold text-ink">{n.title}</p>
                                <p className="mt-0.5 text-[12px] text-ink-60">{n.body}</p>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="w-full text-start"
                                onClick={() => markRead(n.id)}
                              >
                                <p className="text-[13px] font-bold text-ink">{n.title}</p>
                                <p className="mt-0.5 text-[12px] text-ink-60">{n.body}</p>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleLanguage()}
                disabled={langBusy}
                className="flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-ink-40 transition-colors hover:bg-ink-5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  currentLanguage === 'ar'
                    ? t('nav:switchToEnglish')
                    : t('nav:switchToArabic')
                }
                title={currentLanguage === 'ar' ? 'English' : 'العربية'}
              >
                <Globe size={18} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {currentLanguage}
                </span>
              </button>
              {user ? (
                <div className="ms-1 hidden items-center gap-2 sm:flex">
                  <Link
                    to={profilePath}
                    className="max-w-[140px] truncate text-[12px] font-bold text-ink hover:text-coral"
                  >
                    {user.name}
                  </Link>
                  <Button variant="ghost" size="sm" className="!px-3" onClick={() => signOut()}>
                    {t('common:signOut')}
                  </Button>
                </div>
              ) : (
                <>
                  <Link to="/register" className="ms-1 hidden text-[12px] font-bold text-ink-60 hover:text-coral sm:inline">
                    {t('common:register')}
                  </Link>
                  <Link to="/login" className="ms-1 hidden sm:inline-flex">
                    <span className="inline-flex h-8 items-center rounded-full bg-ink px-4 text-[12px] font-semibold text-white transition-colors hover:bg-ink-80">
                      {t('common:signIn')}
                    </span>
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="ms-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ink-5 md:hidden"
              >
                {mobileOpen ? <X size={20} /> : <Hamburger size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div
              className={cn(
                'absolute start-0 end-0 z-20 bg-white shadow-card-md md:hidden',
                'top-[calc(100%+12px)]',
                scrolled
                  ? 'rounded-2xl border border-t-0 border-ink-10 shadow-card-lg'
                  : 'border-b border-ink-10'
              )}
            >
              <div className="flex flex-col gap-4 p-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-[14px] font-bold text-ink transition-colors hover:text-coral"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      to={profilePath}
                      className="text-[14px] font-bold text-ink hover:text-coral"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t('common:profile')}
                    </Link>
                    <Button variant="ghost" size="md" className="w-full" onClick={() => signOut()}>
                      {t('common:signOut')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="text-[14px] font-bold text-ink hover:text-coral"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t('common:register')}
                    </Link>
                    <Button
                      variant="dark"
                      size="md"
                      className="mt-2 w-full"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/login');
                      }}
                    >
                      {t('common:signIn')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>
    </IconContext.Provider>
  );
}
