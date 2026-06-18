import { accountAr } from '@/locales/account-ar';
import { accountEn } from '@/locales/account-en';
import { ar } from '@/locales/ar';
import { arExt } from '@/locales/ar-ext';
import { authFlowAr } from '@/locales/auth-flow-ar';
import { authFlowEn } from '@/locales/auth-flow-en';
import { commerceAr } from '@/locales/commerce-ar';
import { commerceEn } from '@/locales/commerce-en';
import { en } from '@/locales/en';
import { enExt } from '@/locales/en-ext';
import { miscAr } from '@/locales/misc-ar';
import { miscEn } from '@/locales/misc-en';
import { validationAr } from '@/locales/validation-ar';
import { validationEn } from '@/locales/validation-en';

function mergeLocale<T extends Record<string, unknown>>(base: T, ext: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [ns, keys] of Object.entries(ext)) {
    const existing = result[ns];
    if (existing && typeof existing === 'object' && keys && typeof keys === 'object' && !Array.isArray(keys)) {
      result[ns] = { ...(existing as object), ...(keys as object) };
    } else {
      result[ns] = keys;
    }
  }
  return result as T;
}

export const resources = {
  en: mergeLocale(
    mergeLocale(
      mergeLocale(
        mergeLocale(mergeLocale(mergeLocale(en, enExt), commerceEn), miscEn),
        authFlowEn,
      ),
      accountEn,
    ),
    { validation: validationEn },
  ),
  ar: mergeLocale(
    mergeLocale(
      mergeLocale(
        mergeLocale(mergeLocale(mergeLocale(ar, arExt), commerceAr), miscAr),
        authFlowAr,
      ),
      accountAr,
    ),
    { validation: validationAr },
  ),
} as const;

export type TranslationLanguage = keyof typeof resources;
