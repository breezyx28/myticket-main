import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export function createUpdateProfileSchema(t: ValidationTFunction) {
  return yup
    .object({
      full_name: yup.string().trim().min(2, t('profile.fullNameRequired')).max(120).notRequired(),
      display_name: yup.string().trim().max(60).notRequired(),
      bio: yup.string().trim().max(2000).notRequired(),
      phone: yup
        .string()
        .trim()
        .matches(/^\+?[0-9 ()-]{6,20}$/i, t('profile.phoneInvalid'))
        .notRequired(),
      city: yup.string().trim().max(80).notRequired(),
      region: yup.string().trim().max(80).notRequired(),
    })
    .strict();
}

export type UpdateProfileSchema = yup.InferType<ReturnType<typeof createUpdateProfileSchema>>;

/**
 * Mirrors `UpdateUserPreferencesRequest`. Field names match the backend
 * payload exactly (snake_case) so the resolver output can be passed straight
 * into the RTK Query mutation.
 */
export function createUpdatePreferencesSchema(_t: ValidationTFunction) {
  return yup
    .object({
      language: yup.string().oneOf(['en', 'ar']).notRequired(),
      theme: yup.string().oneOf(['system', 'light', 'dark']).notRequired(),
      email_notifications: yup.boolean().notRequired(),
      push_notifications: yup.boolean().notRequired(),
      sms_notifications: yup.boolean().notRequired(),
      marketing_emails: yup.boolean().notRequired(),
    })
    .strict();
}

export type UpdatePreferencesSchema = yup.InferType<ReturnType<typeof createUpdatePreferencesSchema>>;

export function createNotificationPrefsSchema(_t: ValidationTFunction) {
  return yup
    .object({
      email: yup.boolean().notRequired(),
      push: yup.boolean().notRequired(),
      sms: yup.boolean().notRequired(),
    })
    .strict();
}

export type NotificationPrefsSchema = yup.InferType<ReturnType<typeof createNotificationPrefsSchema>>;

/**
 * `PUT /me/talent-availability`. Toggle between `available` (visible in
 * search) and `reserved` (booked / hidden).
 */
export function createTalentAvailabilitySchema(t: ValidationTFunction) {
  return yup
    .object({
      status: yup
        .string()
        .oneOf(['available', 'reserved'], t('profile.statusMustBeAvailableOrReserved'))
        .required(t('profile.statusRequired')),
    })
    .strict();
}

export type TalentAvailabilitySchema = yup.InferType<ReturnType<typeof createTalentAvailabilitySchema>>;

/**
 * `DELETE /me`. The literal `"DELETE"` confirmation gate matches the
 * backend's safety guard so the request body never goes through with a
 * lowercase or partial confirmation.
 */
export function createDeleteAccountSchema(t: ValidationTFunction) {
  return yup
    .object({
      confirmation: yup
        .string()
        .oneOf(['DELETE'], t('profile.typeDeleteToConfirm'))
        .required(t('profile.confirmationRequired')),
      reason: yup.string().trim().max(500, t('profile.reasonTooLong')).notRequired(),
    })
    .strict();
}

export type DeleteAccountSchema = yup.InferType<ReturnType<typeof createDeleteAccountSchema>>;

export function createRegisterDeviceSchema(t: ValidationTFunction) {
  return yup
    .object({
      app: yup.string().required(t('profile.appIdentifierRequired')),
      platform: yup.string().oneOf(['ios', 'android', 'web']).required(t('profile.platformRequired')),
      token: yup.string().required(t('profile.pushTokenRequired')),
      device_label: yup.string().max(120).notRequired(),
    })
    .strict();
}

export type RegisterDeviceSchema = yup.InferType<ReturnType<typeof createRegisterDeviceSchema>>;
