import { ar } from '@/locales/ar';
import { arExt } from '@/locales/ar-ext';
import { en } from '@/locales/en';
import { enExt } from '@/locales/en-ext';

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
  en: mergeLocale(en, enExt),
  ar: mergeLocale(ar, arExt),
} as const;

export type TranslationLanguage = keyof typeof resources;
