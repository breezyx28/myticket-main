import type { OrganizerRatingsSummary } from '@/api/types/organizer';
import type { TalentRatingsSummary } from '@/api/types/talent';
import type { Vendor, VendorRatingsSummary } from '@/api/types/vendor';
import type { MarketplaceVendor } from '@/types/domain';

export { talentToMarketplaceTalent } from '@/lib/talentMappers';

function toDisplayRating(average: number | null | undefined, fallback: number): number {
  return typeof average === 'number' && !Number.isNaN(average) ? average : fallback;
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
  summary: TalentRatingsSummary | VendorRatingsSummary | OrganizerRatingsSummary | undefined,
  limit = 3,
) {
  return (summary?.ratings ?? []).slice(0, limit);
}
