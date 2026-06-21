import { portalFetch } from '@/api/portalBaseApi';
import type { OnboardingRole } from '@/types/domain';

export interface PortalLoginRequest {
  email: string;
  password: string;
}

export interface PortalLoginResponse {
  token: string;
}

export async function portalLogin(
  role: OnboardingRole,
  body: PortalLoginRequest,
): Promise<PortalLoginResponse> {
  return portalFetch<PortalLoginResponse>(role, '/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
