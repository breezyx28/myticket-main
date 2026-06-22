import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { applyDocumentLanguage, getEffectiveLanguage, setApiLanguage, setGuestLanguage, type AppLanguage } from '@/lib/language';
import { pickLocalizedName } from '@/lib/localized';

export type { AppLanguage };
export { pickLocalizedName };
import { resources } from '@/i18n/resources';

const initialLanguage = getEffectiveLanguage();

setApiLanguage(initialLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  defaultNS: 'common',
  ns: [
    'common',
    'nav',
    'footer',
    'landing',
    'support',
    'auth',
    'authPages',
    'validation',
    'events',
    'eventsPage',
    'marketplace',
    'about',
    'legal',
    'auction',
    'tickets',
    'checkout',
    'eventDetail',
    'seats',
    'tourism',
    'profile',
  ],
  interpolation: {
    escapeValue: false,
  },
});

applyDocumentLanguage(initialLanguage);

export function changeAppLanguage(language: AppLanguage) {
  setGuestLanguage(language);
  setApiLanguage(language);
  void i18n.changeLanguage(language);
  applyDocumentLanguage(language);
}

export default i18n;
