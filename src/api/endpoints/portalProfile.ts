import { getPortalProfilePath, portalFetch } from '@/api/portalBaseApi';
import type { OnboardingRole } from '@/types/domain';

export type PortalProfilePatchBody = Record<string, unknown>;

export async function patchPortalProfile(
  role: OnboardingRole,
  token: string,
  body: PortalProfilePatchBody,
): Promise<void> {
  await portalFetch(role, getPortalProfilePath(role), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}
