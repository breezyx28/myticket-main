import { portalLogin } from '@/api/endpoints/portalAuth';
import { patchPortalProfile } from '@/api/endpoints/portalProfile';
import { PortalApiError } from '@/api/portalBaseApi';
import { draftToPortalPatch } from '@/services/portalProfileMappers';
import type {
  OnboardingRole,
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';

export type RegisterPortalDraft =
  | TalentOnboardingDraft
  | VendorOnboardingDraft
  | OrganizerOnboardingDraft;

export interface SubmitRegisterPortalProfileInput {
  role: OnboardingRole;
  email: string;
  password: string;
  draft: RegisterPortalDraft;
  profileImageUrl?: string;
  uploadProfileImage?: (file: File) => Promise<string>;
  pendingProfileImageFile?: File | null;
}

export async function submitRegisterPortalProfile(
  input: SubmitRegisterPortalProfileInput,
): Promise<void> {
  let profileImageUrl = input.profileImageUrl;

  if (input.pendingProfileImageFile && input.uploadProfileImage) {
    profileImageUrl = await input.uploadProfileImage(input.pendingProfileImageFile);
  }

  const { token } = await portalLogin(input.role, {
    email: input.email,
    password: input.password,
  });

  const body = draftToPortalPatch(input.role, input.draft, profileImageUrl);
  await patchPortalProfile(input.role, token, body);
}

export function portalSubmitErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PortalApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
