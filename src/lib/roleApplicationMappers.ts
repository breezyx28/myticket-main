import type {
  RoleApplicationOrganizerDetail,
  RoleApplicationTalentDetail,
  RoleApplicationVendorDetail,
  RoleApplicationStatus,
} from '@/api/types/roleApplication';
import type {
  OrganizerOnboardingDraft,
  RoleOnboardingStatus,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';

/** Maps backend role-application status onto legacy onboarding UI status. */
export function apiStatusToOnboardingStatus(raw: RoleApplicationStatus | string | undefined): RoleOnboardingStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'submitted') return 'submitted';
  if (s === 'rejected' || s === 'changes_requested') return 'rejected';
  if (s === 'draft') return 'draft';
  if (s === 'withdrawn') return 'not_started';
  return 'not_started';
}

function mediaEntryToUrl(entry: string | { url?: string | null }): string {
  if (typeof entry === 'string') return entry;
  return entry.url ?? '';
}

export function apiTalentDetailToDraft(
  detail: RoleApplicationTalentDetail | null | undefined,
  fallback: { name: string; email: string; phone?: string }
): TalentOnboardingDraft {
  const verificationMedia = (detail?.verification_media ?? [])
    .map((m) => mediaEntryToUrl(m))
    .filter((u) => u.trim().length > 0);

  return {
    fullName: detail?.stage_name?.trim() ? detail.stage_name : fallback.name,
    contactEmail: detail?.contact_email?.trim() ? detail.contact_email : fallback.email,
    contactPhone: detail?.contact_phone?.trim() ? detail.contact_phone : (fallback.phone ?? ''),
    profileImage: detail?.profile_image ?? '',
    bio: detail?.bio ?? '',
    saudiRegionId: detail?.saudi_region_id != null ? String(detail.saudi_region_id) : '',
    city: detail?.city ?? '',
    travelReady: Boolean(detail?.travel_ready),
    locationPublic: Boolean(detail?.location_public),
    verificationMedia,
    certificateName: detail?.certificate_name ?? '',
    acceptedQualityDisclaimer: Boolean(detail?.accepted_quality_disclaimer),
  };
}

export function apiVendorDetailToDraft(
  detail: RoleApplicationVendorDetail | null | undefined,
  fallback: { name: string; email: string; phone?: string }
): VendorOnboardingDraft {
  const verificationDocuments = (detail?.verification_documents ?? [])
    .map((d) => mediaEntryToUrl(d))
    .filter(Boolean);
  const gallery = (detail?.gallery ?? []).map((g) => mediaEntryToUrl(g)).filter(Boolean);

  return {
    profileName: detail?.business_name?.trim() ? detail.business_name : fallback.name,
    contactEmail: detail?.contact_email?.trim() ? detail.contact_email : fallback.email,
    contactPhone: detail?.contact_phone?.trim() ? detail.contact_phone : (fallback.phone ?? ''),
    profileImage: detail?.profile_image ?? '',
    bio: detail?.bio ?? '',
    serviceCategories: detail?.service_categories ?? [],
    verificationDocuments,
    gallery,
    city: detail?.city ?? '',
    coverageArea: detail?.coverage_area ?? '',
  };
}

export function apiOrganizerDetailToDraft(
  detail: RoleApplicationOrganizerDetail | null | undefined,
  fallback: { name: string; email: string; phone?: string }
): OrganizerOnboardingDraft {
  const socialLinks = (detail?.social_links ?? [])
    .map((l) => mediaEntryToUrl(l))
    .filter(Boolean);

  return {
    displayName: detail?.display_name?.trim() ? detail.display_name : fallback.name,
    profileImage: detail?.profile_image ?? '',
    bio: detail?.bio ?? '',
    email: detail?.email?.trim() ? detail.email : fallback.email,
    contactPhone: detail?.contact_phone?.trim() ? detail.contact_phone : (fallback.phone ?? ''),
    location: detail?.location ?? '',
    socialLinks,
    optionalDocument: detail?.optional_document ?? '',
    isCompany: Boolean(detail?.is_company),
    companyName: detail?.company_name ?? '',
    companyInfo: detail?.company_info ?? '',
    ownerName: detail?.owner_name?.trim() ? detail.owner_name : fallback.name,
    ownerInfo: detail?.owner_info ?? '',
  };
}
