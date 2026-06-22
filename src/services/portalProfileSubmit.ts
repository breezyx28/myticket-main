import { API_BASE_URL } from '@/api/baseApi';
import { getToken } from '@/api/authToken';
import { patchPortalProfile } from '@/api/endpoints/portalProfile';
import { PortalApiError } from '@/api/portalBaseApi';
import { getApiLanguage } from '@/lib/language';
import { parseAuthResponse } from '@/lib/authMapper';
import { uploadProfileImageWithToken } from '@/lib/profileImageUpload';
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

export interface SubmitRegisterOnboardingProfileInput {
  role: OnboardingRole;
  token?: string | null;
  email: string;
  password?: string;
  draft: RegisterPortalDraft;
  pendingProfileImageFile?: File | null;
}

async function loginForRegisterToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': getApiLanguage(),
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new PortalApiError('Could not sign in to save your profile.', res.status);
  }
  const outcome = parseAuthResponse(await res.json());
  if (outcome.kind !== 'session') {
    throw new PortalApiError('Could not sign in to save your profile.', 401);
  }
  return outcome.token;
}

async function resolveRegisterToken(
  token: string | null | undefined,
  email: string,
  password: string | undefined,
): Promise<string> {
  const trimmed = token?.trim();
  if (trimmed) return trimmed;
  const stored = getToken();
  if (stored) return stored;
  const pwd = password?.trim();
  if (!email.trim() || !pwd) {
    throw new PortalApiError('Session expired. Create your account again to continue.', 401);
  }
  return loginForRegisterToken(email.trim(), pwd);
}

export async function submitRegisterOnboardingProfile(
  input: SubmitRegisterOnboardingProfileInput,
): Promise<void> {
  const bearer = await resolveRegisterToken(input.token, input.email, input.password);

  let profileImageUrl: string | undefined;
  if (input.pendingProfileImageFile) {
    profileImageUrl = await uploadProfileImageWithToken(
      input.pendingProfileImageFile,
      bearer,
    );
  }

  const body = draftToPortalPatch(input.role, input.draft, profileImageUrl);
  await patchPortalProfile(input.role, bearer, body);
}

/** @deprecated Use submitRegisterOnboardingProfile */
export const submitRegisterPortalProfile = submitRegisterOnboardingProfile;

export function portalSubmitErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PortalApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
