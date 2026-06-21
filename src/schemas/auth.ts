import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

function passwordField(t: ValidationTFunction) {
  return yup
    .string()
    .min(8, t('auth.passwordMin'))
    .max(128, t('auth.passwordTooLong'))
    .required(t('auth.passwordRequired'));
}

function optionalPhoneField(t: ValidationTFunction) {
  return yup
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : value))
    .matches(/^\+?[0-9 ()-]{6,20}$/i, {
      message: t('common.phoneInvalid'),
      excludeEmptyString: true,
    })
    .notRequired();
}

export function createLoginSchema(t: ValidationTFunction) {
  return yup
    .object({
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('auth.emailRequired')),
      password: passwordField(t),
      otp: yup
        .string()
        .trim()
        .transform((value) => (value === '' ? undefined : value))
        .matches(/^[0-9]{6}$/, {
          message: t('auth.otpSixDigits'),
          excludeEmptyString: true,
        })
        .notRequired(),
    })
    .strict();
}

export type LoginSchema = yup.InferType<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(t: ValidationTFunction) {
  return yup
    .object({
      full_name: yup
        .string()
        .trim()
        .min(2, t('auth.fullNameRequired'))
        .required(t('auth.fullNameRequired')),
      display_name: yup
        .string()
        .trim()
        .max(60, t('auth.displayNameTooLong'))
        .notRequired(),
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('auth.emailRequired')),
      phone: optionalPhoneField(t),
      password: passwordField(t),
      password_confirmation: yup
        .string()
        .oneOf([yup.ref('password')], t('auth.passwordsMustMatch'))
        .notRequired(),
      agree_terms: yup
        .boolean()
        .oneOf([true], t('auth.agreeTermsRequired'))
        .required(t('auth.agreeTermsRequired')),
      role: yup
        .string()
        .oneOf(['talent', 'vendor', 'organizer'], t('auth.roleRequired'))
        .required(t('auth.roleRequired')),
    })
    .strict();
}

export type RegisterSchema = yup.InferType<ReturnType<typeof createRegisterSchema>>;

const ONBOARDING_ROLES = ['talent', 'vendor', 'organizer'] as const;
const REGISTER_FORM_ROLES = ['guest', ...ONBOARDING_ROLES] as const;

export type RegisterFormRole = (typeof REGISTER_FORM_ROLES)[number];

/**
 * UI-facing variant matching `BaseRegistrationFields` (camelCase) used by
 * `RegisterPage` + `SharedBasicStep`. The page maps these to `registerSchema`
 * fields when calling the backend (`fullName` -> `full_name`, etc.).
 */
export function createBasicRegistrationSchema(t: ValidationTFunction) {
  return yup
    .object({
      fullName: yup
        .string()
        .trim()
        .min(2, t('auth.fullNameMin'))
        .required(t('auth.fullNameRequired')),
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('auth.emailRequired')),
      contactPhone: yup
        .string()
        .trim()
        .matches(/^\+966\d{10}$/i, t('auth.saudiPhoneInvalid'))
        .required(t('auth.phoneRequired')),
      password: passwordField(t),
      passwordConfirmation: yup
        .string()
        .oneOf([yup.ref('password')], t('auth.passwordsMustMatch'))
        .required(t('auth.confirmPasswordRequired')),
      agreeTerms: yup
        .boolean()
        .oneOf([true], t('auth.agreeTermsOfServiceRequired'))
        .required(t('auth.agreeTermsOfServiceRequired')),
      role: yup
        .string()
        .oneOf(REGISTER_FORM_ROLES, t('auth.roleRequired'))
        .required(t('auth.roleRequired')),
    })
    .strict();
}

export type BasicRegistrationSchema = yup.InferType<ReturnType<typeof createBasicRegistrationSchema>>;

/** Form state allows empty role until the user picks one. */
export type BasicRegistrationFormValues = Omit<BasicRegistrationSchema, 'role'> & {
  role: RegisterFormRole | '';
};

export function createForgotPasswordSchema(t: ValidationTFunction) {
  return yup
    .object({
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('auth.emailRequired')),
    })
    .strict();
}

export type ForgotPasswordSchema = yup.InferType<ReturnType<typeof createForgotPasswordSchema>>;

export function createResetPasswordSchema(t: ValidationTFunction) {
  return yup
    .object({
      token: yup.string().trim().required(t('auth.resetTokenRequired')),
      password: passwordField(t),
      password_confirmation: yup
        .string()
        .oneOf([yup.ref('password')], t('auth.passwordsMustMatch'))
        .required(t('auth.confirmNewPasswordRequired')),
    })
    .strict();
}

export type ResetPasswordSchema = yup.InferType<ReturnType<typeof createResetPasswordSchema>>;

export function createEmailConfirmSchema(t: ValidationTFunction) {
  return yup
    .object({
      token: yup.string().trim().required(t('auth.confirmationTokenRequired')),
    })
    .strict();
}

export function createTwoFactorChallengeSchema(t: ValidationTFunction) {
  return yup
    .object({
      otp: yup
        .string()
        .trim()
        .matches(/^[0-9]{6}$/, t('auth.otpSixDigits'))
        .required(t('auth.otpRequired')),
      challenge_token: yup.string().trim().notRequired(),
    })
    .strict();
}

export type TwoFactorChallengeSchema = yup.InferType<ReturnType<typeof createTwoFactorChallengeSchema>>;

export function createPhoneStartSchema(t: ValidationTFunction) {
  return yup
    .object({
      phone: yup
        .string()
        .trim()
        .matches(/^\+?[0-9 ()-]{6,20}$/i, t('common.phoneInvalid'))
        .required(t('auth.phoneRequired')),
    })
    .strict();
}

export function createPhoneVerifySchema(t: ValidationTFunction) {
  return yup
    .object({
      code: yup
        .string()
        .trim()
        .matches(/^[0-9]{4,8}$/, t('auth.verificationCodeInvalid'))
        .required(t('auth.codeRequired')),
    })
    .strict();
}

export type PhoneVerifySchema = yup.InferType<ReturnType<typeof createPhoneVerifySchema>>;

export function createTwoFactorConfirmSchema(t: ValidationTFunction) {
  return yup
    .object({
      otp: yup
        .string()
        .trim()
        .matches(/^[0-9]{6}$/, t('auth.otpSixDigits'))
        .required(t('auth.otpRequired')),
    })
    .strict();
}

export function createTwoFactorDisableSchema(t: ValidationTFunction) {
  return yup
    .object({
      password: passwordField(t).notRequired(),
      otp: yup
        .string()
        .trim()
        .matches(/^[0-9]{6}$/, t('auth.otpSixDigits'))
        .notRequired(),
    })
    .strict();
}

/**
 * `POST /auth/password/change`. Field names match the backend payload exactly
 * so the resolver output can be passed straight into the RTK Query mutation.
 * The optional `new_password_confirmation` is enforced client-side only.
 */
export function createChangePasswordSchema(t: ValidationTFunction) {
  return yup
    .object({
      current_password: yup
        .string()
        .min(1, t('auth.currentPasswordRequired'))
        .required(t('auth.currentPasswordRequired')),
      new_password: passwordField(t),
      new_password_confirmation: yup
        .string()
        .oneOf([yup.ref('new_password')], t('auth.passwordsMustMatch'))
        .required(t('auth.confirmNewPasswordRequired')),
    })
    .strict();
}

export type ChangePasswordSchema = yup.InferType<ReturnType<typeof createChangePasswordSchema>>;

/**
 * `POST /auth/email/change`. The new email is verified asynchronously; the
 * SPA only collects the address and the user's current password.
 */
export function createChangeEmailSchema(t: ValidationTFunction) {
  return yup
    .object({
      new_email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('auth.newEmailRequired')),
      current_password: yup
        .string()
        .min(1, t('auth.currentPasswordRequired'))
        .required(t('auth.currentPasswordRequired')),
    })
    .strict();
}

export type ChangeEmailSchema = yup.InferType<ReturnType<typeof createChangeEmailSchema>>;
