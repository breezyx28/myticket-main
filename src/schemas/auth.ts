import * as yup from "yup";

const password = yup
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .required("Password is required.");

const optionalPhone = yup
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .matches(/^\+?[0-9 ()-]{6,20}$/i, {
    message: "Enter a valid phone number.",
    excludeEmptyString: true,
  })
  .notRequired();

export const loginSchema = yup
  .object({
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .when("phone", {
        is: (v: string | undefined) => !v || v.trim().length === 0,
        then: (s) => s.required("Provide email or phone."),
        otherwise: (s) => s.notRequired(),
      }),
    phone: optionalPhone,
    password: password,
    passwordConfirmation: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match.")
      .required("Confirm your password."),
    otp: yup
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .matches(/^[0-9]{6}$/, {
        message: "OTP must be 6 digits.",
        excludeEmptyString: true,
      })
      .notRequired(),
  })
  .strict();

export type LoginSchema = yup.InferType<typeof loginSchema>;

export const registerSchema = yup
  .object({
    full_name: yup
      .string()
      .trim()
      .min(2, "Full name is required.")
      .required("Full name is required."),
    display_name: yup
      .string()
      .trim()
      .max(60, "Display name is too long.")
      .notRequired(),
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .required("Email is required."),
    phone: optionalPhone,
    password: password,
    password_confirmation: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match.")
      .notRequired(),
    agree_terms: yup
      .boolean()
      .oneOf([true], "You must accept the terms to continue.")
      .required("You must accept the terms to continue."),
  })
  .strict();

export type RegisterSchema = yup.InferType<typeof registerSchema>;

/**
 * UI-facing variant matching `BaseRegistrationFields` (camelCase) used by
 * `RegisterPage` + `SharedBasicStep`. The page maps these to `registerSchema`
 * fields when calling the backend (`fullName` -> `full_name`, etc.).
 */
export const basicRegistrationSchema = yup
  .object({
    fullName: yup
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .required("Full name is required."),
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .required("Email is required."),
    contactPhone: yup
      .string()
      .trim()
      .matches(
        /^\+966\d{10}$/i,
        "Enter a valid Saudi phone number (10 digits).",
      )
      .required("Phone number is required."),
    password: password,
    passwordConfirmation: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match.")
      .required("Confirm your password."),
    agreeTerms: yup
      .boolean()
      .oneOf([true], "You must accept the Terms of Service to continue.")
      .required("You must accept the Terms of Service to continue."),
  })
  .strict();

export type BasicRegistrationSchema = yup.InferType<
  typeof basicRegistrationSchema
>;

export const forgotPasswordSchema = yup
  .object({
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .required("Email is required."),
  })
  .strict();

export type ForgotPasswordSchema = yup.InferType<typeof forgotPasswordSchema>;

export const resetPasswordSchema = yup
  .object({
    token: yup.string().trim().required("Reset token is required."),
    password: password,
    password_confirmation: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match.")
      .required("Confirm your new password."),
  })
  .strict();

export type ResetPasswordSchema = yup.InferType<typeof resetPasswordSchema>;

export const emailConfirmSchema = yup
  .object({
    token: yup.string().trim().required("Confirmation token is required."),
  })
  .strict();

export const twoFactorChallengeSchema = yup
  .object({
    otp: yup
      .string()
      .trim()
      .matches(/^[0-9]{6}$/, "OTP must be 6 digits.")
      .required("OTP is required."),
    challenge_token: yup.string().trim().notRequired(),
  })
  .strict();

export type TwoFactorChallengeSchema = yup.InferType<
  typeof twoFactorChallengeSchema
>;

export const phoneStartSchema = yup
  .object({
    phone: yup
      .string()
      .trim()
      .matches(/^\+?[0-9 ()-]{6,20}$/i, "Enter a valid phone number.")
      .required("Phone number is required."),
  })
  .strict();

export const phoneVerifySchema = yup
  .object({
    code: yup
      .string()
      .trim()
      .matches(/^[0-9]{4,8}$/, "Enter the verification code.")
      .required("Code is required."),
  })
  .strict();

export type PhoneVerifySchema = yup.InferType<typeof phoneVerifySchema>;

export const twoFactorConfirmSchema = yup
  .object({
    otp: yup
      .string()
      .trim()
      .matches(/^[0-9]{6}$/, "OTP must be 6 digits.")
      .required("OTP is required."),
  })
  .strict();

export const twoFactorDisableSchema = yup
  .object({
    password: password.notRequired(),
    otp: yup
      .string()
      .trim()
      .matches(/^[0-9]{6}$/, "OTP must be 6 digits.")
      .notRequired(),
  })
  .strict();

/**
 * `POST /auth/password/change`. Field names match the backend payload exactly
 * so the resolver output can be passed straight into the RTK Query mutation.
 * The optional `new_password_confirmation` is enforced client-side only.
 */
export const changePasswordSchema = yup
  .object({
    current_password: yup
      .string()
      .min(1, "Enter your current password.")
      .required("Enter your current password."),
    new_password: password,
    new_password_confirmation: yup
      .string()
      .oneOf([yup.ref("new_password")], "Passwords must match.")
      .required("Confirm your new password."),
  })
  .strict();

export type ChangePasswordSchema = yup.InferType<typeof changePasswordSchema>;

/**
 * `POST /auth/email/change`. The new email is verified asynchronously; the
 * SPA only collects the address and the user's current password.
 */
export const changeEmailSchema = yup
  .object({
    new_email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .required("New email is required."),
    current_password: yup
      .string()
      .min(1, "Enter your current password.")
      .required("Enter your current password."),
  })
  .strict();

export type ChangeEmailSchema = yup.InferType<typeof changeEmailSchema>;
