import * as yup from 'yup';

const phone = yup
  .string()
  .trim()
  .matches(/^\+?[0-9 ()-]{6,20}$/i, 'Enter a valid phone number.');

/** Mirrors `TalentOnboardingDraft` in src/types/domain.ts. */
export const talentOnboardingSchema = yup
  .object({
    full_name: yup.string().trim().min(2).max(120).required('Full name is required.'),
    contact_email: yup.string().trim().email('Enter a valid email address.').required('Contact email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
    profile_image: yup.string().trim().notRequired(),
    bio: yup.string().trim().min(20, 'Bio should be at least 20 characters.').max(2000).required('Bio is required.'),
    saudi_region_id: yup.string().trim().required('Region is required.'),
    city: yup.string().trim().required('City is required.'),
    travel_ready: yup.boolean().default(false),
    location_public: yup.boolean().default(false),
    verification_media: yup
      .array(yup.string().trim().required())
      .min(1, 'Add at least one verification item (video / image / certificate).'),
    certificate_name: yup.string().trim().max(120).notRequired(),
    accepted_quality_disclaimer: yup
      .boolean()
      .oneOf([true], 'You must accept the quality disclaimer.')
      .required('You must accept the quality disclaimer.'),
  })
  .strict();

export type TalentOnboardingSchema = yup.InferType<typeof talentOnboardingSchema>;

/** Backend-aligned shape used by `POST /role-applications/talent`. */
export const createTalentApplicationSchema = yup
  .object({
    stage_name: yup.string().trim().min(2).max(120).required('Stage name is required.'),
    contact_email: yup.string().trim().email().required('Contact email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
  })
  .strict();

export type CreateTalentApplicationSchema = yup.InferType<typeof createTalentApplicationSchema>;
