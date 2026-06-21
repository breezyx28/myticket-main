import type { PortalProfilePatchBody } from '@/api/endpoints/portalProfile';
import type {
  OnboardingRole,
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';

function httpLike(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return undefined;
}

function mediaUrl(item: string): string | undefined {
  const trimmed = item.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('certificate:')) return httpLike(trimmed.slice(12).trim());
  if (lower.startsWith('video:')) return httpLike(trimmed.slice(6).trim());
  if (lower.startsWith('image:')) return httpLike(trimmed.slice(6).trim());
  return httpLike(trimmed);
}

export function talentDraftToPortalPatch(
  draft: TalentOnboardingDraft,
  profileImageUrl?: string,
): PortalProfilePatchBody {
  const patch: PortalProfilePatchBody = {
    full_name: draft.fullName.trim() || undefined,
    contact_email: draft.contactEmail.trim() || undefined,
    contact_phone: draft.contactPhone.trim() || undefined,
    bio: draft.bio.trim() || undefined,
    saudi_region_id: draft.saudiRegionId.trim() || undefined,
    city: draft.city.trim() || undefined,
    travel_ready: draft.travelReady,
    location_public: draft.locationPublic,
    certificate_name: draft.certificateName?.trim() || undefined,
    accepted_quality_disclaimer: draft.acceptedQualityDisclaimer,
  };

  const pic = httpLike(profileImageUrl) ?? httpLike(draft.profileImage);
  if (pic) patch.profile_image = pic;

  const media = draft.verificationMedia.map(mediaUrl).filter(Boolean) as string[];
  if (media.length) patch.verification_media = media;

  return patch;
}

export function vendorDraftToPortalPatch(draft: VendorOnboardingDraft): PortalProfilePatchBody {
  const cats = draft.serviceCategories.map((c) => c.trim()).filter(Boolean);
  const docs = draft.verificationDocuments.map((u) => u.trim()).filter(Boolean);
  const gallery = draft.gallery.map((u) => u.trim()).filter(Boolean);

  return {
    business_name: draft.profileName.trim() || undefined,
    contact_email: draft.contactEmail.trim() || undefined,
    contact_phone: draft.contactPhone.trim() || undefined,
    bio: draft.bio.trim() || undefined,
    city: draft.city.trim() || undefined,
    coverage_area: draft.coverageArea.trim() || undefined,
    ...(cats.length ? { service_categories: cats } : {}),
    ...(docs.length ? { verification_documents: docs } : {}),
    ...(gallery.length ? { gallery } : {}),
  };
}

export function organizerDraftToPortalPatch(
  draft: OrganizerOnboardingDraft,
  profileImageUrl?: string,
): PortalProfilePatchBody {
  const patch: PortalProfilePatchBody = {
    display_name: draft.displayName.trim() || undefined,
    bio: draft.bio.trim() || undefined,
    email: draft.email.trim() || undefined,
    contact_phone: draft.contactPhone.trim() || undefined,
    location: draft.location.trim() || undefined,
    is_company: draft.isCompany,
    owner_name: draft.ownerName.trim() || undefined,
    owner_info: draft.ownerInfo.trim() || undefined,
  };

  const pic = httpLike(profileImageUrl) ?? httpLike(draft.profileImage);
  if (pic) patch.profile_image = pic;

  const optDoc = httpLike(draft.optionalDocument);
  if (optDoc) patch.optional_document = optDoc;

  if (draft.isCompany) {
    patch.company_name = draft.companyName?.trim() || undefined;
    patch.company_info = draft.companyInfo?.trim() || undefined;
  }

  const links = draft.socialLinks.map((u) => u.trim()).filter(Boolean);
  if (links.length) patch.social_links = links;

  return patch;
}

export function draftToPortalPatch(
  role: OnboardingRole,
  draft: TalentOnboardingDraft | VendorOnboardingDraft | OrganizerOnboardingDraft,
  profileImageUrl?: string,
): PortalProfilePatchBody {
  if (role === 'talent') {
    return talentDraftToPortalPatch(draft as TalentOnboardingDraft, profileImageUrl);
  }
  if (role === 'vendor') {
    return vendorDraftToPortalPatch(draft as VendorOnboardingDraft);
  }
  return organizerDraftToPortalPatch(draft as OrganizerOnboardingDraft, profileImageUrl);
}
