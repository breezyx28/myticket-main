import { PortalApiError, portalFetch } from '@/api/portalBaseApi';
import type { LoginResponse } from '@/api/types/auth';
import { parseAuthResponse } from '@/lib/authMapper';
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
  const raw = await portalFetch<LoginResponse>(role, '/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  try {
    const outcome = parseAuthResponse(raw);
    if (outcome.kind === 'session') {
      return { token: outcome.token };
    }
    if (outcome.kind === 'two_factor') {
      throw new PortalApiError(outcome.error.message, 401);
    }
    throw new PortalApiError(outcome.error.message, 403);
  } catch (error) {
    if (error instanceof PortalApiError) throw error;
    throw new PortalApiError(
      error instanceof Error ? error.message : 'Login failed',
      401,
    );
  }
}
