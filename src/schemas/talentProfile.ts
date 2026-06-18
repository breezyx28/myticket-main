import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

function phoneField(t: ValidationTFunction) {
  return yup
    .string()
    .trim()
    .matches(/^\+?[0-9 ()-]{6,20}$/i, t('common.phoneInvalid'));
}

/** Mirrors `TalentOnboardingDraft` in src/types/domain.ts. */
export function createTalentOnboardingSchema(t: ValidationTFunction) {
  return yup
    .object({
      full_name: yup.string().trim().min(2).max(120).required(t('talent.fullNameRequired')),
      contact_email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('talent.contactEmailRequired')),
      contact_phone: phoneField(t).required(t('talent.contactPhoneRequired')),
      profile_image: yup.string().trim().notRequired(),
      bio: yup
        .string()
        .trim()
        .min(20, t('talent.bioMin'))
        .max(2000)
        .required(t('talent.bioRequired')),
      saudi_region_id: yup.string().trim().required(t('talent.regionRequired')),
      city: yup.string().trim().required(t('talent.cityRequired')),
      travel_ready: yup.boolean().default(false),
      location_public: yup.boolean().default(false),
      verification_media: yup
        .array(yup.string().trim().required())
        .min(1, t('talent.verificationMediaMin')),
      certificate_name: yup.string().trim().max(120).notRequired(),
      accepted_quality_disclaimer: yup
        .boolean()
        .oneOf([true], t('talent.qualityDisclaimerRequired'))
        .required(t('talent.qualityDisclaimerRequired')),
    })
    .strict();
}

export type TalentOnboardingSchema = yup.InferType<ReturnType<typeof createTalentOnboardingSchema>>;

/** Backend-aligned shape used by `POST /role-applications/talent`. */
export function createTalentApplicationSchema(t: ValidationTFunction) {
  return yup
    .object({
      stage_name: yup.string().trim().min(2).max(120).required(t('talent.stageNameRequired')),
      contact_email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('talent.contactEmailRequired')),
      contact_phone: phoneField(t).required(t('talent.contactPhoneRequired')),
    })
    .strict();
}

export type CreateTalentApplicationSchema = yup.InferType<ReturnType<typeof createTalentApplicationSchema>>;
