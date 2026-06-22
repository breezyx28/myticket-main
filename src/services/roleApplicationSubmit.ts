import type { Id } from '@/api/types/common';
import type {
  CreateOrganizerApplicationRequest,
  CreateTalentApplicationRequest,
  CreateVendorApplicationRequest,
  OrganizerSocialLinkUpload,
  RoleApplicationSummary,
  TalentApplicationMediaUpload,
  UpdateOrganizerApplicationRequest,
  UpdateTalentApplicationRequest,
  UpdateVendorApplicationRequest,
} from '@/api/types/roleApplication';
import type { OrganizerOnboardingDraft, TalentOnboardingDraft, VendorOnboardingDraft } from '@/types/domain';
import { vendorCategoryToApi } from '@/lib/vendorServiceCategories';

export type FinalizeMode = 'none' | 'submit';

function httpLike(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return undefined;
}

export function inferTalentMediaUpload(item: string): TalentApplicationMediaUpload {
  const trimmed = item.trim();
  let kind: NonNullable<TalentApplicationMediaUpload['kind']> = 'image';
  let url = trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('certificate:')) {
    kind = 'certificate';
    url = trimmed.slice(12).trim();
  } else if (lower.startsWith('video:')) {
    kind = 'video';
    url = trimmed.slice(6).trim();
  } else if (lower.startsWith('image:')) {
    kind = 'image';
    url = trimmed.slice(6).trim();
  } else if (/\.(mp4|webm|mov|mkv)(\?|$)/i.test(lower)) {
    kind = 'video';
  } else if (/\.(pdf)(\?|$)/i.test(lower)) {
    kind = 'certificate';
  }

  return { url: url || trimmed, kind };
}

export interface TalentPipelineMutations {
  createTalentApplication: (body: CreateTalentApplicationRequest) => Promise<RoleApplicationSummary>;
  updateTalentApplication: (args: { id: Id; body: UpdateTalentApplicationRequest }) => Promise<RoleApplicationSummary>;
  addTalentMedia: (args: { id: Id; body: TalentApplicationMediaUpload }) => Promise<unknown>;
  submitTalentApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
  resubmitTalentApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
}

export interface TalentPipelineInput {
  draft: TalentOnboardingDraft;
  basic: { fullName: string; email: string; contactPhone: string };
  finalize: FinalizeMode;
  existingApplicationId?: Id | null;
  existingApiStatus?: string | null;
  existingMediaUrls?: Iterable<string>;
}

export async function runTalentRoleApplicationPipeline(
  input: TalentPipelineInput,
  m: TalentPipelineMutations,
): Promise<RoleApplicationSummary> {
  const stageName = input.draft.fullName.trim() || input.basic.fullName.trim();
  const email = input.draft.contactEmail.trim() || input.basic.email.trim();
  const phone = input.draft.contactPhone.trim() || input.basic.contactPhone.trim();

  const priorStatus = String(input.existingApiStatus ?? '').toLowerCase();
  const existingId = input.existingApplicationId ?? null;
  const useExisting =
    existingId != null && priorStatus !== '' && priorStatus !== 'withdrawn';

  let id: Id;
  if (useExisting) {
    id = existingId as Id;
  } else {
    const created = await m.createTalentApplication({
      stage_name: stageName,
      contact_email: email,
      contact_phone: phone,
    });
    id = created.id;
  }

  const patch: UpdateTalentApplicationRequest = {
    bio: input.draft.bio.trim() || undefined,
    contact_email: email,
    contact_phone: phone,
    saudi_region_id: input.draft.saudiRegionId.trim() || undefined,
    city: input.draft.city.trim() || undefined,
    travel_ready: input.draft.travelReady,
    location_public: input.draft.locationPublic,
    certificate_name: input.draft.certificateName?.trim() || undefined,
    accepted_quality_disclaimer: input.draft.acceptedQualityDisclaimer,
  };
  const pic = httpLike(input.draft.profileImage);
  if (pic) patch.profile_image = pic;

  let summary = await m.updateTalentApplication({ id, body: patch });

  const existingSet = new Set(
    [...(input.existingMediaUrls ?? [])].map((u) => u.trim()).filter(Boolean),
  );
  const toAdd = input.draft.verificationMedia.filter((item) => !existingSet.has(item.trim()));

  await Promise.all(toAdd.map((item) => m.addTalentMedia({ id, body: inferTalentMediaUpload(item) })));

  if (input.finalize === 'submit') {
    if (priorStatus === 'rejected' || priorStatus === 'changes_requested') {
      summary = await m.resubmitTalentApplication({ id });
    } else {
      summary = await m.submitTalentApplication({ id });
    }
  }

  return summary;
}

export interface VendorPipelineMutations {
  createVendorApplication: (body: CreateVendorApplicationRequest) => Promise<RoleApplicationSummary>;
  updateVendorApplication: (args: { id: Id; body: UpdateVendorApplicationRequest }) => Promise<RoleApplicationSummary>;
  addVendorDocument: (args: { id: Id; body: { url: string; label?: string } }) => Promise<unknown>;
  addVendorGalleryItem: (args: { id: Id; body: { url: string; caption?: string } }) => Promise<unknown>;
  submitVendorApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
  resubmitVendorApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
}

export interface VendorPipelineInput {
  draft: VendorOnboardingDraft;
  basic: { fullName: string; email: string; contactPhone: string };
  finalize: FinalizeMode;
  existingApplicationId?: Id | null;
  existingApiStatus?: string | null;
  existingDocumentUrls?: Iterable<string>;
  existingGalleryUrls?: Iterable<string>;
}

export async function runVendorRoleApplicationPipeline(
  input: VendorPipelineInput,
  m: VendorPipelineMutations,
): Promise<RoleApplicationSummary> {
  const business = input.draft.profileName.trim() || input.basic.fullName.trim();
  const email = input.draft.contactEmail.trim() || input.basic.email.trim();
  const phone = input.draft.contactPhone.trim() || input.basic.contactPhone.trim();
  const cats = input.draft.serviceCategories
    .map((c) => vendorCategoryToApi(c))
    .filter((c) => c.trim().length > 0);

  const priorStatus = String(input.existingApiStatus ?? '').toLowerCase();
  const existingId = input.existingApplicationId ?? null;
  const useExisting =
    existingId != null && priorStatus !== '' && priorStatus !== 'withdrawn';

  let id: Id;
  if (useExisting) {
    id = existingId as Id;
  } else {
    const created = await m.createVendorApplication({
      business_name: business,
      contact_email: email,
      contact_phone: phone,
      service_categories: cats,
    });
    id = created.id;
  }

  let summary = await m.updateVendorApplication({
    id,
    body: {
      business_name: business,
      bio: input.draft.bio.trim() || undefined,
      contact_email: email,
      contact_phone: phone,
      city: input.draft.city.trim() || undefined,
      coverage_area: input.draft.coverageArea.trim() || undefined,
      service_categories: cats.length ? cats : undefined,
      ...(httpLike(input.draft.profileImage)
        ? { profile_image: httpLike(input.draft.profileImage) }
        : {}),
    },
  });

  const docSet = new Set(
    [...(input.existingDocumentUrls ?? [])].map((u) => u.trim()).filter(Boolean),
  );
  const gallSet = new Set(
    [...(input.existingGalleryUrls ?? [])].map((u) => u.trim()).filter(Boolean),
  );

  const docsToAdd = input.draft.verificationDocuments.filter((u) => !docSet.has(u.trim()));
  const gallToAdd = input.draft.gallery.filter((u) => !gallSet.has(u.trim()));

  await Promise.all(
    docsToAdd.map((url, i) =>
      m.addVendorDocument({
        id,
        body: { url: url.trim(), label: `Document ${i + 1}` },
      }),
    ),
  );
  await Promise.all(
    gallToAdd.map((url, i) =>
      m.addVendorGalleryItem({
        id,
        body: { url: url.trim(), caption: `Gallery ${i + 1}` },
      }),
    ),
  );

  if (input.finalize === 'submit') {
    if (priorStatus === 'rejected' || priorStatus === 'changes_requested') {
      summary = await m.resubmitVendorApplication({ id });
    } else {
      summary = await m.submitVendorApplication({ id });
    }
  }

  return summary;
}

export interface OrganizerPipelineMutations {
  createOrganizerApplication: (body: CreateOrganizerApplicationRequest) => Promise<RoleApplicationSummary>;
  updateOrganizerApplication: (args: { id: Id; body: UpdateOrganizerApplicationRequest }) => Promise<RoleApplicationSummary>;
  addOrganizerSocialLink: (args: { id: Id; body: OrganizerSocialLinkUpload }) => Promise<unknown>;
  submitOrganizerApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
  resubmitOrganizerApplication: (args: { id: Id }) => Promise<RoleApplicationSummary>;
}

export interface OrganizerPipelineInput {
  draft: OrganizerOnboardingDraft;
  basic: { fullName: string; email: string; contactPhone: string };
  finalize: FinalizeMode;
  existingApplicationId?: Id | null;
  existingApiStatus?: string | null;
  existingSocialUrls?: Iterable<string>;
}

export async function runOrganizerRoleApplicationPipeline(
  input: OrganizerPipelineInput,
  m: OrganizerPipelineMutations,
): Promise<RoleApplicationSummary> {
  const display = input.draft.displayName.trim() || input.basic.fullName.trim();
  const email = input.draft.email.trim() || input.basic.email.trim();
  const phone = input.draft.contactPhone.trim() || input.basic.contactPhone.trim();

  const priorStatus = String(input.existingApiStatus ?? '').toLowerCase();
  const existingId = input.existingApplicationId ?? null;
  const useExisting =
    existingId != null && priorStatus !== '' && priorStatus !== 'withdrawn';

  let id: Id;
  if (useExisting) {
    id = existingId as Id;
  } else {
    const created = await m.createOrganizerApplication({
      display_name: display,
      email,
      contact_phone: phone,
      is_company: input.draft.isCompany,
    });
    id = created.id;
  }

  const patch: UpdateOrganizerApplicationRequest = {
    display_name: display,
    bio: input.draft.bio.trim() || undefined,
    email,
    contact_phone: phone,
    location: input.draft.location.trim() || undefined,
    is_company: input.draft.isCompany,
    company_name: input.draft.isCompany ? input.draft.companyName?.trim() || undefined : undefined,
    company_info: input.draft.isCompany ? input.draft.companyInfo?.trim() || undefined : undefined,
    owner_name: input.draft.ownerName.trim() || undefined,
    owner_info: input.draft.ownerInfo.trim() || undefined,
  };

  const pic = httpLike(input.draft.profileImage);
  if (pic) patch.profile_image = pic;
  const optDoc = httpLike(input.draft.optionalDocument);
  if (optDoc) patch.optional_document = optDoc;

  let summary = await m.updateOrganizerApplication({ id, body: patch });

  const socialSet = new Set(
    [...(input.existingSocialUrls ?? [])].map((u) => u.trim()).filter(Boolean),
  );
  const linksToAdd = input.draft.socialLinks.filter((u) => !socialSet.has(u.trim()));

  await Promise.all(
    linksToAdd.map((url, i) =>
      m.addOrganizerSocialLink({
        id,
        body: { url: url.trim(), label: `Link ${i + 1}` },
      }),
    ),
  );

  if (input.finalize === 'submit') {
    if (priorStatus === 'rejected' || priorStatus === 'changes_requested') {
      summary = await m.resubmitOrganizerApplication({ id });
    } else {
      summary = await m.submitOrganizerApplication({ id });
    }
  }

  return summary;
}
