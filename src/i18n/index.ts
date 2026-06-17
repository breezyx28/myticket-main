import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { applyDocumentLanguage, getEffectiveLanguage, type AppLanguage } from '@/lib/language';
import { resources } from '@/i18n/resources';

const initialLanguage = getEffectiveLanguage();

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
  ],
  interpolation: {
    escapeValue: false,
  },
});

applyDocumentLanguage(initialLanguage);

export function changeAppLanguage(language: AppLanguage) {
  void i18n.changeLanguage(language);
  applyDocumentLanguage(language);
}

export default i18n;
