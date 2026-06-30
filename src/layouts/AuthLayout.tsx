import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Ticket } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { changeAppLanguage } from '@/i18n';
import { getEffectiveLanguage, type AppLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

export function AuthLayout() {
  const { t } = useTranslation(['common', 'nav', 'footer']);
  const { user, updatePreferences } = useAuth();
  const location = useLocation();
  const [langBusy, setLangBusy] = useState(false);

  const currentLanguage = getEffectiveLanguage(user?.preferences.language);
  const isRegister = location.pathname === '/register';
  const isLogin = location.pathname === '/login';
  const isEmailVerified = location.pathname === '/auth/email-verified';
  const contentWidth = isRegister ? 'max-w-3xl' : isEmailVerified ? 'max-w-lg' : 'max-w-md';

  async function toggleLanguage() {
    if (langBusy) return;
    const nextLanguage: AppLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    setLangBusy(true);
    try {
      if (user) {
        await updatePreferences({ language: nextLanguage });
        changeAppLanguage(nextLanguage);
      } else {
        changeAppLanguage(nextLanguage);
      }
    } catch {
      changeAppLanguage(currentLanguage);
    } finally {
      setLangBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-5">
      <header className="border-b border-ink-10 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lemon">
              <Ticket size={18} className="text-ink" weight="fill" />
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              My<span className="text-coral">Ticket</span>
            </span>
          </Link>

          <nav className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
            <Link
              to="/events"
              className="hidden text-[13px] font-semibold text-ink-60 transition-colors hover:text-coral sm:inline"
            >
              {t('nav:events')}
            </Link>
            <Link
              to="/support"
              className="hidden text-[13px] font-semibold text-ink-60 transition-colors hover:text-coral md:inline"
            >
              {t('footer:helpCenter')}
            </Link>
            {isLogin ? (
              <Link
                to="/register"
                className="hidden text-[13px] font-semibold text-ink-60 transition-colors hover:text-coral sm:inline"
              >
                {t('common:register')}
              </Link>
            ) : null}
            {isRegister ? (
              <Link
                to="/login"
                className="hidden text-[13px] font-semibold text-ink-60 transition-colors hover:text-coral sm:inline"
              >
                {t('common:signIn')}
              </Link>
            ) : null}
            {!isLogin && !isRegister ? (
              <Link
                to="/login"
                className="hidden text-[13px] font-semibold text-ink-60 transition-colors hover:text-coral sm:inline"
              >
                {t('common:signIn')}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void toggleLanguage()}
              disabled={langBusy}
              className={cn(
                'flex h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-ink-40 transition-colors hover:bg-ink-5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60',
              )}
              aria-label={
                currentLanguage === 'ar' ? t('nav:switchToEnglish') : t('nav:switchToArabic')
              }
              title={currentLanguage === 'ar' ? 'English' : 'العربية'}
            >
              <Globe size={18} weight="fill" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {currentLanguage}
              </span>
            </button>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className={cn('w-full', contentWidth)}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
