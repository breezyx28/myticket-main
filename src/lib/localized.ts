import type { AppLanguage } from '@/lib/language';

export function isRtl(language: AppLanguage): boolean {
  return language === 'ar';
}

export function pickLocalizedName(
  item: { name_en?: string | null; name_ar?: string | null; name?: string | null },
  language: AppLanguage,
): string {
  const en = item.name_en?.trim() || item.name?.trim() || '';
  const ar = item.name_ar?.trim() || '';
  if (language === 'ar' && ar) return ar;
  return en || ar;
}
