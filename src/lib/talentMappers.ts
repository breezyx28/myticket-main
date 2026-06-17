import type { HotArtistCardProps } from '@/components/cards/HotArtistCard';
import type { Talent, TalentCategoryAttachment, TopTalent } from '@/api/types/talent';
import type { AppLanguage } from '@/lib/language';
import { pickLocalizedName } from '@/lib/localized';
import type { MarketplaceTalent, TalentAvailability } from '@/types/domain';
import { unsplash } from '@/lib/utils';

export const HOT_ARTIST_CARD_COLORS = [
  'bg-coral text-white',
  'bg-lime text-ink',
  'bg-sky text-ink',
  'bg-lavender text-ink',
  'bg-mint text-ink',
  'bg-amber text-ink',
] as const;

const TALENT_IMAGE_FALLBACK = unsplash('1544005313-94ddf0286df2');

function toAvailability(raw: string | undefined): TalentAvailability {
  return raw === 'reserved' ? 'reserved' : 'available';
}

function toDisplayRating(average: number | string | null | undefined, fallback: number): number {
  if (typeof average === 'number' && !Number.isNaN(average)) return average;
  if (typeof average === 'string') {
    const parsed = Number(average);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function talentCategoryLabels(
  categories: Talent['categories'] | TopTalent['categories'] | undefined,
  language: AppLanguage = 'en',
): string[] {
  if (!categories?.length) return [];
  return categories
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      return pickLocalizedName(item as TalentCategoryAttachment, language);
    })
    .filter(Boolean);
}

export function talentProfileImage(talent: Pick<Talent, 'image_url' | 'profile_image' | 'profile_image_url'>): string {
  return (
    talent.profile_image?.trim() ||
    talent.profile_image_url?.trim() ||
    talent.image_url?.trim() ||
    TALENT_IMAGE_FALLBACK
  );
}

export function topTalentToHotArtistCard(talent: TopTalent, index: number, language: AppLanguage = 'en'): HotArtistCardProps {
  const categories = talentCategoryLabels(talent.categories, language);
  const rating = toDisplayRating(talent.rating_average, 0);
  const tags = categories.slice(0, 2);
  if (rating > 0) tags.push(`${rating.toFixed(1)}★`);

  const bio = talent.bio?.trim();
  const description =
    bio ||
    (talent.rating_count
      ? `Top-rated performer with ${talent.rating_count} review${talent.rating_count === 1 ? '' : 's'}.`
      : 'Featured performer on MyTicket.');

  return {
    title: talent.stage_name,
    description,
    tags: tags.length ? tags : [language === 'ar' ? 'موهبة' : 'Talent'],
    image: talentProfileImage(talent),
    color: HOT_ARTIST_CARD_COLORS[index % HOT_ARTIST_CARD_COLORS.length],
    href: `/talents/${encodeURIComponent(talent.slug)}`,
  };
}

export function talentToMarketplaceTalent(
  t: Talent,
  fallback?: MarketplaceTalent | null,
  language: AppLanguage = 'en',
): MarketplaceTalent {
  const fbRating = fallback?.rating ?? 0;
  const gallery = (t.gallery ?? fallback?.gallery ?? []).map((item) =>
    typeof item === 'string' ? item : item.image_url,
  );
  const availabilityRaw =
    (t.availability_status as string | undefined) ?? (t.availability as string | undefined) ?? fallback?.availability;

  return {
    id: t.slug,
    slug: t.slug,
    name: t.stage_name,
    image: talentProfileImage(t) || (fallback?.image ?? ''),
    bio: t.bio ?? fallback?.bio ?? '',
    city: t.city ?? fallback?.city ?? '',
    categories: talentCategoryLabels(t.categories, language).length
      ? talentCategoryLabels(t.categories, language)
      : (fallback?.categories ?? []),
    rating: toDisplayRating(t.rating_average ?? null, fbRating),
    gallery,
    availability: toAvailability(availabilityRaw),
  };
}
