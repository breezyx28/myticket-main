import type {
  AuthSuccessResponse,
  LoginResponse,
  TwoFactorChallengeResponse,
} from '@/api/types/auth';
import type { UserMe } from '@/api/types/user';
import type { MockUser } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/domain';
import { TwoFactorRequiredError } from '@/lib/authErrors';

const VALID_ROLES: readonly UserRole[] = ['guest', 'talent', 'vendor', 'organizer'];

function pickRole(roles: string[] | undefined, prev?: UserRole | null): UserRole {
  if (Array.isArray(roles) && roles.length > 0) {
    const match = roles.find((r): r is UserRole => VALID_ROLES.includes(r as UserRole));
    if (match) return match;
  }
  return prev ?? 'guest';
}

/**
 * Project a backend `UserMe` payload onto the local `MockUser` shape so the
 * existing `useAuth()` consumers keep reading from the same fields.
 *
 * Identity fields (`email`, `name`, `phone`, `avatar`) come from the API.
 * Preferences fall back to the previous MockUser until `/me/preferences` hydrates.
 * Role applications use `/role-applications/me` (RTK Query), not MockUser.
 */
export function mapUserMeToMockUser(me: UserMe, prev?: MockUser | null): MockUser {
  const fallback = (prev ?? null) as MockUser | null;
  const name = me.full_name?.trim() || me.display_name?.trim() || fallback?.name || (me.email.split('@')[0] ?? 'User');

  const role = pickRole(me.roles, fallback?.role);

  const apiPrefs = me.preferences;
  const lastPasswordChangedAt =
    fallback?.security.lastPasswordChangedAt ?? me.updated_at ?? me.created_at ?? new Date().toISOString();

  return {
    email: me.email,
    name,
    role,
    phone: me.phone ?? fallback?.phone ?? '',
    city: typeof me['city'] === 'string' ? (me['city'] as string) : (fallback?.city ?? ''),
    region: typeof me['region'] === 'string' ? (me['region'] as string) : (fallback?.region ?? ''),
    bio: me.bio ?? fallback?.bio ?? '',
    profileImage: me.avatar_url ?? fallback?.profileImage ?? '',
    preferences: {
      language: fallback?.preferences.language ?? 'en',
      theme: fallback?.preferences.theme ?? 'system',
      emailNotifications: apiPrefs?.email ?? fallback?.preferences.emailNotifications ?? true,
      pushNotifications: apiPrefs?.push ?? fallback?.preferences.pushNotifications ?? true,
      smsNotifications: apiPrefs?.sms ?? fallback?.preferences.smsNotifications ?? false,
      marketingEmails: fallback?.preferences.marketingEmails ?? false,
    },
    security: {
      twoFactorEnabled: me.two_factor_enabled ?? fallback?.security.twoFactorEnabled ?? false,
      lastPasswordChangedAt,
    },
  };
}

/**
 * Type guards for the canonical login envelopes confirmed in the
 * 2026-05-07 backend update.
 *
 * - `TwoFactorChallengeResponse`: `{ challenge_token: string, two_factor_required: true }`
 * - `AuthSuccessResponse`:        `{ token: string, refresh_token, expires_at, user }`
 */
function isTwoFactorChallenge(
  data: Record<string, unknown>,
): data is TwoFactorChallengeResponse {
  return (
    'two_factor_required' in data &&
    data.two_factor_required === true &&
    typeof data.challenge_token === 'string' &&
    data.challenge_token.length > 0
  );
}

function isAuthSuccess(data: Record<string, unknown>): data is AuthSuccessResponse {
  return typeof data.token === 'string' && data.token.length > 0;
}

/**
 * Project the `LoginResponse` discriminated union onto the local auth-flow
 * outcome. Order of the discriminator matters: 2FA must be checked first so
 * a partially-populated success envelope (e.g. with a `challenge_token` for
 * a step-up) cannot be mistaken for a fully-issued session.
 */
export function parseAuthResponse(
  response: LoginResponse | AuthSuccessResponse | undefined | null,
):
  | { token: string; refresh_token: string | null; user: UserMe | null }
  | { twoFactor: TwoFactorRequiredError } {
  const data = (response ?? {}) as Record<string, unknown>;

  if (isTwoFactorChallenge(data)) {
    return { twoFactor: new TwoFactorRequiredError(data.challenge_token) };
  }

  if (isAuthSuccess(data)) {
    return {
      token: data.token,
      refresh_token:
        typeof data.refresh_token === 'string' && data.refresh_token.length > 0
          ? data.refresh_token
          : null,
      user: (data.user as UserMe | undefined) ?? null,
    };
  }

  return {
    twoFactor: new TwoFactorRequiredError(
      '__pending__',
      'Sign-in is incomplete; verification required.',
    ),
  };
}
