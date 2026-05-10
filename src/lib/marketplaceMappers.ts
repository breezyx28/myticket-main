import type { Talent, TalentRatingsSummary } from '@/api/types/talent';
import type { Vendor, VendorRatingsSummary } from '@/api/types/vendor';
import type { MarketplaceTalent, MarketplaceVendor, TalentAvailability } from '@/types/domain';

function toAvailability(raw: string | undefined): TalentAvailability {
  return raw === 'reserved' ? 'reserved' : 'available';
}

function toDisplayRating(average: number | null | undefined, fallback: number): number {
  return typeof average === 'number' && !Number.isNaN(average) ? average : fallback;
}

export function talentToMarketplaceTalent(t: Talent, fallback?: MarketplaceTalent | null): MarketplaceTalent {
  const fbRating = fallback?.rating ?? 0;
  return {
    id: t.slug,
    slug: t.slug,
    name: t.stage_name,
    image: t.image_url ?? fallback?.image ?? '',
    bio: t.bio ?? fallback?.bio ?? '',
    city: t.city ?? fallback?.city ?? '',
    categories: t.categories ?? fallback?.categories ?? [],
    rating: toDisplayRating(t.rating_average ?? null, fbRating),
    gallery: t.gallery ?? fallback?.gallery ?? [],
    availability: toAvailability((t.availability as string | undefined) ?? fallback?.availability),
  };
}

export function vendorToMarketplaceVendor(v: Vendor, fallback?: MarketplaceVendor | null): MarketplaceVendor {
  const fbRating = fallback?.rating ?? 0;
  return {
    id: v.slug,
    slug: v.slug,
    name: v.business_name,
    image: v.image_url ?? fallback?.image ?? '',
    bio: v.bio ?? fallback?.bio ?? '',
    city: v.city ?? fallback?.city ?? '',
    serviceCategories: v.service_categories ?? fallback?.serviceCategories ?? [],
    rating: toDisplayRating(v.rating_average ?? null, fbRating),
    gallery: v.gallery ?? fallback?.gallery ?? [],
  };
}

/** Pick the top N most recent items from a ratings summary, defensive when absent. */
export function pickRecentRatings(
  summary: TalentRatingsSummary | VendorRatingsSummary | undefined,
  limit = 3
) {
  return (summary?.ratings ?? []).slice(0, limit);
}
