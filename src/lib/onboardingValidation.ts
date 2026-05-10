import type {
  BaseRegistrationFields,
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';
import { isValidSaudiCity } from '@/lib/saudiLocations';

export const TALENT_BIO_MIN_CHARS = 30;
export const TALENT_BIO_MAX_CHARS = 500;
export const VENDOR_BIO_MIN_CHARS = 25;

export function isBasicValid(basic: BaseRegistrationFields) {
  return (
    basic.fullName.trim().length >= 3 &&
    basic.email.includes('@') &&
    basic.password.length >= 8 &&
    basic.agreeTerms
  );
}

export function isTalentDraftReady(draft: TalentOnboardingDraft) {
  const regionOk = Boolean(draft.saudiRegionId) && isValidSaudiCity(draft.saudiRegionId, draft.city.trim());
  return (
    draft.bio.trim().length >= TALENT_BIO_MIN_CHARS &&
    draft.bio.trim().length <= TALENT_BIO_MAX_CHARS &&
    draft.verificationMedia.length > 0 &&
    draft.acceptedQualityDisclaimer &&
    regionOk
  );
}

export function isVendorDraftReady(draft: VendorOnboardingDraft) {
  return (
    draft.profileName.trim().length >= 2 &&
    draft.bio.trim().length >= VENDOR_BIO_MIN_CHARS &&
    draft.bio.trim().length <= TALENT_BIO_MAX_CHARS &&
    draft.serviceCategories.length > 0 &&
    draft.verificationDocuments.length > 0
  );
}

export function isOrganizerDraftReady(draft: OrganizerOnboardingDraft) {
  const coreValid =
    draft.displayName.trim().length >= 2 &&
    draft.bio.trim().length >= TALENT_BIO_MIN_CHARS &&
    draft.bio.trim().length <= TALENT_BIO_MAX_CHARS &&
    draft.email.includes('@') &&
    draft.location.trim().length >= 2 &&
    draft.ownerName.trim().length >= 2 &&
    draft.ownerInfo.trim().length >= 10;

  if (!coreValid) return false;
  if (!draft.isCompany) return true;
  return (draft.companyName?.trim().length ?? 0) >= 2 && (draft.companyInfo?.trim().length ?? 0) >= 10;
}
