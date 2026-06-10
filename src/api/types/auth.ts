import type { Id, Iso8601 } from "@/api/types/common";
import type { UserMe } from "@/api/types/user";

export type OAuthProvider = string;

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  full_name: string;
  display_name?: string;
  agree_terms?: boolean;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  otp?: string;
}

export interface AuthSuccessResponse {
  token: string;
  refresh_token: string | null;
  /** When present, drives cookie `Max-Age` so the session expires with the token. */
  expires_at?: Iso8601 | null;
  user: UserMe;
  [key: string]: unknown;
}

/**
 * Returned by `POST /auth/login` when the user has 2FA enabled and the request
 * did not include a valid `otp`. The frontend reads `challenge_token` and
 * forwards it to `POST /auth/2fa/challenge` together with the user's OTP.
 */
export interface TwoFactorChallengeResponse {
  challenge_token: string;
  two_factor_required: true;
  [key: string]: unknown;
}

/** Either a real success envelope or a 2FA challenge envelope. */
export type LoginResponse = AuthSuccessResponse | TwoFactorChallengeResponse;

export interface OAuthStartResponse {
  redirect_url: string;
  state: string;
  [key: string]: unknown;
}

export interface OAuthCallbackRequest {
  code?: string;
  state?: string;
  [key: string]: unknown;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface EmailConfirmRequest {
  token: string;
}

export interface EmailVerifyRequest {
  token?: string;
  code?: string;
  [key: string]: unknown;
}

export interface PhoneStartRequest {
  phone?: string;
  [key: string]: unknown;
}

export interface PhoneVerifyRequest {
  code: string;
}

export interface TwoFactorChallengeRequest {
  otp: string;
  challenge_token?: string;
  [key: string]: unknown;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_url: string;
  recovery_codes?: string[];
  [key: string]: unknown;
}

export interface TwoFactorConfirmRequest {
  otp: string;
}

export interface TwoFactorDisableRequest {
  password?: string;
  otp?: string;
  [key: string]: unknown;
}

export interface RefreshTokenRequest {
  refresh_token?: string;
}

export interface RefreshTokenResponse {
  token: string;
  refresh_token?: string;
  expires_at?: Iso8601;
  [key: string]: unknown;
}

export interface AcknowledgementResponse {
  ok?: boolean;
  message?: string;
  id?: Id;
  [key: string]: unknown;
}

/** `POST /auth/password/change` (authenticated). */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  ok: true;
  password_changed_at: Iso8601;
  [key: string]: unknown;
}

/**
 * `POST /auth/email/change` (authenticated). The backend sends a verification
 * email to the new address; the existing `POST /auth/email/confirm` endpoint
 * finalizes the change.
 */
export interface ChangeEmailRequest {
  new_email: string;
  current_password: string;
}

export interface ChangeEmailResponse {
  message: string;
  [key: string]: unknown;
}
