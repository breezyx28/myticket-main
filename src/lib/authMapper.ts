import type {
  AuthSuccessResponse,
  LoginResponse,
  TwoFactorChallengeResponse,
} from '@/api/types/auth';
import type { UserMe } from '@/api/types/user';
import type { MockUser } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/domain';
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  EmailVerificationRequiredError,
  TwoFactorRequiredError,
} from '@/lib/authErrors';

const VALID_ROLES: readonly UserRole[] = ['guest', 'talent', 'vendor', 'organizer'];

function pickRole(
  roles: string[] | undefined,
  singleRole: string | undefined | null,
  prev?: UserRole | null,
): UserRole {
  if (typeof singleRole === 'string') {
    const r = singleRole.trim().toLowerCase();
    if (VALID_ROLES.includes(r as UserRole)) return r as UserRole;
  }
  if (Array.isArray(roles) && roles.length > 0) {
    const match = roles.find((role): role is UserRole => VALID_ROLES.includes(role as UserRole));
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
  const emailLocal =
    typeof me.email === 'string' && me.email.includes('@') ? me.email.split('@')[0] : undefined;
  const name =
    me.full_name?.trim() || me.display_name?.trim() || fallback?.name || emailLocal || 'User';

  const role = pickRole(me.roles, me.role ?? null, fallback?.role);

  const apiPrefs = me.preferences;
  const lastPasswordChangedAt =
    fallback?.security.lastPasswordChangedAt ?? me.updated_at ?? me.created_at ?? new Date().toISOString();

  return {
    email: typeof me.email === 'string' ? me.email : (fallback?.email ?? ''),
    name,
    role,
    phone: me.phone ?? fallback?.phone ?? '',
    city: typeof me['city'] === 'string' ? (me['city'] as string) : (fallback?.city ?? ''),
    region: typeof me['region'] === 'string' ? (me['region'] as string) : (fallback?.region ?? ''),
    bio: me.bio ?? fallback?.bio ?? '',
    profileImage: me.avatar_url ?? me.profile_image_url ?? fallback?.profileImage ?? '',
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

function pickResponseMessage(data: Record<string, unknown>): string | undefined {
  const raw = data.message;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const joined = raw
      .filter((m: unknown): m is string => typeof m === 'string')
      .join(' ')
      .trim();
    if (joined) return joined;
  }
  return undefined;
}

function isEmailVerificationRequired(data: Record<string, unknown>): boolean {
  if (data.email_verification_required === true) return true;
  if (data.verification_required === true) return true;
  if (data.email_verified === false) return true;
  if (data.user && !data.token) return true;
  if (typeof data.message === 'string' && !data.token) return true;
  return false;
}

export type AuthFlowOutcome =
  | {
      kind: 'session';
      token: string;
      refresh_token: string | null;
      user: UserMe | null;
      expires_at: string | null;
    }
  | { kind: 'two_factor'; error: TwoFactorRequiredError }
  | { kind: 'verification_required'; error: EmailVerificationRequiredError };

/**
 * Project the `LoginResponse` discriminated union onto the local auth-flow
 * outcome. Order of the discriminator matters: 2FA must be checked first so
 * a partially-populated success envelope (e.g. with a `challenge_token` for
 * a step-up) cannot be mistaken for a fully-issued session.
 */
export function parseAuthResponse(
  response: LoginResponse | AuthSuccessResponse | undefined | null,
): AuthFlowOutcome {
  const data = (response ?? {}) as Record<string, unknown>;

  if (isTwoFactorChallenge(data)) {
    return { kind: 'two_factor', error: new TwoFactorRequiredError(data.challenge_token) };
  }

  if (isAuthSuccess(data)) {
    const expiresRaw = data.expires_at;
    const expires_at =
      typeof expiresRaw === 'string' && expiresRaw.length > 0 ? expiresRaw : null;
    return {
      kind: 'session',
      token: data.token,
      refresh_token:
        typeof data.refresh_token === 'string' && data.refresh_token.length > 0
          ? data.refresh_token
          : null,
      user: (data.user as UserMe | undefined) ?? null,
      expires_at,
    };
  }

  if (isEmailVerificationRequired(data)) {
    return {
      kind: 'verification_required',
      error: new EmailVerificationRequiredError(
        pickResponseMessage(data) ?? EMAIL_VERIFICATION_REQUIRED_MESSAGE,
      ),
    };
  }

  throw new Error('Unexpected authentication response.');
}
