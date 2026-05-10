import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Thrown by `AuthContext.signIn` when the backend signals that a 2FA
 * challenge is required before issuing a bearer token. The pending
 * `challenge_token` is forwarded to `/auth/2fa/challenge` together with the
 * user's OTP.
 */
export class TwoFactorRequiredError extends Error {
  readonly challengeToken: string;

  constructor(challengeToken: string, message = 'Two-factor authentication required.') {
    super(message);
    this.name = 'TwoFactorRequiredError';
    this.challengeToken = challengeToken;
  }
}

export function isTwoFactorRequiredError(value: unknown): value is TwoFactorRequiredError {
  return value instanceof TwoFactorRequiredError;
}

/**
 * Wraps an RTK Query / fetch failure into a presentable error so pages can
 * `setError(e instanceof AuthApiError ? e.message : ...)` without spelunking
 * into RTK Query's union types.
 */
export class AuthApiError extends Error {
  readonly status: number | 'FETCH_ERROR' | 'PARSING_ERROR' | 'TIMEOUT_ERROR' | 'CUSTOM_ERROR' | 'unknown';
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    status: AuthApiError['status'] = 'unknown',
    fieldErrors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface FetchErrorWithData {
  status: number;
  data?: { message?: string; errors?: Record<string, string[]> } | string | undefined;
}

function isFetchBaseQueryError(value: unknown): value is FetchBaseQueryError {
  return Boolean(value) && typeof value === 'object' && 'status' in (value as Record<string, unknown>);
}

function isSerializedError(value: unknown): value is SerializedError {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'message' in (value as Record<string, unknown>) &&
    !('status' in (value as Record<string, unknown>))
  );
}

/**
 * Map any thrown value (RTK Query error, network error, plain `Error`) to an
 * `AuthApiError` instance carrying a human-readable message and any 422
 * field-level errors the backend produced.
 */
export function toAuthApiError(value: unknown, fallback = 'Something went wrong. Please try again.'): AuthApiError {
  if (value instanceof AuthApiError) return value;

  if (isFetchBaseQueryError(value)) {
    const err = value as FetchErrorWithData;
    if (typeof err.status === 'number') {
      const data = typeof err.data === 'object' && err.data ? err.data : undefined;
      const message =
        data?.message ??
        (err.status === 401
          ? 'Invalid credentials. Please try again.'
          : err.status === 422
            ? 'Please correct the highlighted fields.'
            : err.status === 429
              ? 'Too many attempts. Try again in a moment.'
              : fallback);
      return new AuthApiError(message, err.status, data?.errors ?? {});
    }
    if (err.status === 'FETCH_ERROR') {
      return new AuthApiError('Network error. Check your connection and try again.', err.status);
    }
    if (err.status === 'PARSING_ERROR') {
      return new AuthApiError('Unexpected server response.', err.status);
    }
    if (err.status === 'TIMEOUT_ERROR') {
      return new AuthApiError('The server took too long to respond.', err.status);
    }
    return new AuthApiError(fallback, err.status);
  }

  if (isSerializedError(value)) {
    return new AuthApiError(value.message ?? fallback);
  }

  if (value instanceof Error) return new AuthApiError(value.message || fallback);
  return new AuthApiError(fallback);
}

export function authErrorMessage(value: unknown, fallback?: string): string {
  return toAuthApiError(value, fallback).message;
}
