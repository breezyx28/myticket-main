export type AppLanguage = 'en' | 'ar';

const GUEST_LANGUAGE_KEY = 'myticket_guest_language';

export function applyDocumentLanguage(language: AppLanguage) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}

export function getGuestLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(GUEST_LANGUAGE_KEY);
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {
    /* ignore private-mode storage errors */
  }
  return null;
}

export function setGuestLanguage(language: AppLanguage) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GUEST_LANGUAGE_KEY, language);
    } catch {
      /* ignore private-mode storage errors */
    }
  }
  applyDocumentLanguage(language);
}

export function getEffectiveLanguage(
  userLanguage?: AppLanguage | null,
): AppLanguage {
  if (userLanguage === 'en' || userLanguage === 'ar') return userLanguage;
  return getGuestLanguage() ?? 'en';
}
