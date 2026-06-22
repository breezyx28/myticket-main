import type { VendorServiceCategoryRef } from '@/api/types/reference';
import type { AppLanguage } from '@/lib/language';
import { pickLocalizedName } from '@/lib/localized';

export const VENDOR_CATEGORY_CREATE_KEY = '__create__';

export function encodeCustomVendorCategory(nameEn: string, nameAr: string): string {
  return `custom:${nameEn.trim()}:${nameAr.trim()}`;
}

export function parseVendorCategoryValue(
  value: string,
): { kind: 'custom'; en: string; ar: string } | { kind: 'slug'; slug: string } {
  if (value.startsWith('custom:')) {
    const [en = '', ar = ''] = value.slice(7).split(':');
    return { kind: 'custom', en, ar };
  }
  return { kind: 'slug', slug: value };
}

export function vendorCategoryLabel(
  value: string,
  categories: VendorServiceCategoryRef[],
  language: AppLanguage,
): string {
  const parsed = parseVendorCategoryValue(value);
  if (parsed.kind === 'custom') {
    return language === 'ar' && parsed.ar ? parsed.ar : parsed.en;
  }
  const cat = categories.find((c) => c.slug === parsed.slug);
  return cat ? pickLocalizedName(cat, language) : parsed.slug;
}

/** Value sent on vendor profile / application PATCH bodies. */
export function vendorCategoryToApi(value: string): string {
  const parsed = parseVendorCategoryValue(value);
  if (parsed.kind === 'custom') return parsed.en;
  return parsed.slug;
}

// ponytail: self-check — fails if custom encoding drifts
if (import.meta.env.DEV) {
  const sample = encodeCustomVendorCategory('Lighting', 'إضاءة');
  const parsed = parseVendorCategoryValue(sample);
  console.assert(
    parsed.kind === 'custom' && parsed.en === 'Lighting' && parsed.ar === 'إضاءة',
    'vendorServiceCategories encode/decode mismatch',
  );
}
