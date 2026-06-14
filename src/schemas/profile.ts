import * as yup from 'yup';

export const updateProfileSchema = yup
  .object({
    full_name: yup.string().trim().min(2, 'Full name is required.').max(120).notRequired(),
    display_name: yup.string().trim().max(60).notRequired(),
    bio: yup.string().trim().max(2000).notRequired(),
    phone: yup
      .string()
      .trim()
      .matches(/^\+?[0-9 ()-]{6,20}$/i, 'Enter a valid phone number.')
      .notRequired(),
    city: yup.string().trim().max(80).notRequired(),
    region: yup.string().trim().max(80).notRequired(),
  })
  .strict();

export type UpdateProfileSchema = yup.InferType<typeof updateProfileSchema>;

/**
 * Mirrors `UpdateUserPreferencesRequest`. Field names match the backend
 * payload exactly (snake_case) so the resolver output can be passed straight
 * into the RTK Query mutation.
 */
export const updatePreferencesSchema = yup
  .object({
    language: yup.string().oneOf(['en', 'ar']).notRequired(),
    theme: yup.string().oneOf(['system', 'light', 'dark']).notRequired(),
    email_notifications: yup.boolean().notRequired(),
    push_notifications: yup.boolean().notRequired(),
    sms_notifications: yup.boolean().notRequired(),
    marketing_emails: yup.boolean().notRequired(),
  })
  .strict();

export type UpdatePreferencesSchema = yup.InferType<typeof updatePreferencesSchema>;

export const notificationPrefsSchema = yup
  .object({
    email: yup.boolean().notRequired(),
    push: yup.boolean().notRequired(),
    sms: yup.boolean().notRequired(),
  })
  .strict();

export type NotificationPrefsSchema = yup.InferType<typeof notificationPrefsSchema>;

/**
 * `PUT /me/talent-availability`. Toggle between `available` (visible in
 * search) and `reserved` (booked / hidden).
 */
export const talentAvailabilitySchema = yup
  .object({
    status: yup
      .string()
      .oneOf(['available', 'reserved'], 'Status must be available or reserved.')
      .required('Status is required.'),
  })
  .strict();

export type TalentAvailabilitySchema = yup.InferType<typeof talentAvailabilitySchema>;

/**
 * `DELETE /me`. The literal `"DELETE"` confirmation gate matches the
 * backend's safety guard so the request body never goes through with a
 * lowercase or partial confirmation.
 */
export const deleteAccountSchema = yup
  .object({
    confirmation: yup
      .string()
      .oneOf(['DELETE'], 'Type DELETE in capitals to confirm.')
      .required('Confirmation is required.'),
    reason: yup.string().trim().max(500, 'Reason is too long.').notRequired(),
  })
  .strict();

export type DeleteAccountSchema = yup.InferType<typeof deleteAccountSchema>;

export const registerDeviceSchema = yup
  .object({
    app: yup.string().required('App identifier is required.'),
    platform: yup.string().oneOf(['ios', 'android', 'web']).required('Platform is required.'),
    token: yup.string().required('Push token is required.'),
    device_label: yup.string().max(120).notRequired(),
  })
  .strict();

export type RegisterDeviceSchema = yup.InferType<typeof registerDeviceSchema>;
