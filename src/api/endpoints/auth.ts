import { baseApi } from '@/api/baseApi';
import type {
  AcknowledgementResponse,
  AuthSuccessResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  EmailConfirmRequest,
  EmailVerifyRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  OAuthCallbackRequest,
  OAuthProvider,
  OAuthStartResponse,
  PhoneStartRequest,
  PhoneVerifyRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
  TwoFactorChallengeRequest,
  TwoFactorConfirmRequest,
  TwoFactorDisableRequest,
  TwoFactorSetupResponse,
} from '@/api/types/auth';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<AuthSuccessResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    oauthStart: build.mutation<OAuthStartResponse, { provider: OAuthProvider }>({
      query: ({ provider }) => ({
        url: `/auth/oauth/${encodeURIComponent(provider)}/start`,
        method: 'POST',
      }),
    }),
    oauthCallback: build.mutation<
      AuthSuccessResponse,
      { provider: OAuthProvider; body: OAuthCallbackRequest }
    >({
      query: ({ provider, body }) => ({
        url: `/auth/oauth/${encodeURIComponent(provider)}/callback`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    forgotPassword: build.mutation<AcknowledgementResponse, ForgotPasswordRequest>({
      query: (body) => ({ url: '/auth/password/forgot', method: 'POST', body }),
    }),
    resetPassword: build.mutation<AcknowledgementResponse, ResetPasswordRequest>({
      query: (body) => ({ url: '/auth/password/reset', method: 'POST', body }),
    }),
    confirmEmail: build.mutation<AcknowledgementResponse, EmailConfirmRequest>({
      query: (body) => ({ url: '/auth/email/confirm', method: 'POST', body }),
    }),
    verifyEmail: build.mutation<AcknowledgementResponse, EmailVerifyRequest | void>({
      query: (body) => ({
        url: '/auth/email/verify',
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: ['Me'],
    }),
    startPhoneVerification: build.mutation<AcknowledgementResponse, PhoneStartRequest | void>({
      query: (body) => ({
        url: '/auth/phone/start',
        method: 'POST',
        body: body ?? undefined,
      }),
    }),
    verifyPhone: build.mutation<AcknowledgementResponse, PhoneVerifyRequest>({
      query: (body) => ({ url: '/auth/phone/verify', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    twoFactorChallenge: build.mutation<AuthSuccessResponse, TwoFactorChallengeRequest>({
      query: (body) => ({ url: '/auth/2fa/challenge', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    twoFactorSetup: build.mutation<TwoFactorSetupResponse, void>({
      query: () => ({ url: '/auth/2fa/setup', method: 'POST' }),
    }),
    twoFactorConfirm: build.mutation<AcknowledgementResponse, TwoFactorConfirmRequest>({
      query: (body) => ({ url: '/auth/2fa/confirm', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    twoFactorDisable: build.mutation<AcknowledgementResponse, TwoFactorDisableRequest | void>({
      query: (body) => ({
        url: '/auth/2fa/disable',
        method: 'POST',
        body: body ?? undefined,
      }),
      invalidatesTags: ['Me'],
    }),
    refresh: build.mutation<RefreshTokenResponse, RefreshTokenRequest | void>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: body ?? undefined,
      }),
    }),
    logout: build.mutation<AcknowledgementResponse, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me', 'Session', 'Device'],
    }),
    changePassword: build.mutation<ChangePasswordResponse, ChangePasswordRequest>({
      query: (body) => ({ url: '/auth/password/change', method: 'POST', body }),
      invalidatesTags: ['Session'],
    }),
    changeEmail: build.mutation<ChangeEmailResponse, ChangeEmailRequest>({
      query: (body) => ({ url: '/auth/email/change', method: 'POST', body }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useOauthStartMutation,
  useOauthCallbackMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useConfirmEmailMutation,
  useVerifyEmailMutation,
  useStartPhoneVerificationMutation,
  useVerifyPhoneMutation,
  useTwoFactorChallengeMutation,
  useTwoFactorSetupMutation,
  useTwoFactorConfirmMutation,
  useTwoFactorDisableMutation,
  useRefreshMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useChangeEmailMutation,
} = authApi;
