import type { AppLanguage } from '@/lib/language';

function localeFor(language: AppLanguage): string {
  return language === 'ar' ? 'ar-SA' : 'en-US';
}

export function formatDate(value: string | number | Date, language: AppLanguage, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeFor(language), options).format(new Date(value));
}

export function formatTime(value: string | number | Date, language: AppLanguage, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeFor(language), { hour: 'numeric', minute: '2-digit', ...options }).format(new Date(value));
}

export function formatNumber(value: number, language: AppLanguage, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeFor(language), options).format(value);
}

export function formatCurrency(value: number, language: AppLanguage, currency = 'SAR'): string {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
