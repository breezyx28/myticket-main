import * as yup from 'yup';

const phone = yup
  .string()
  .trim()
  .matches(/^\+?[0-9 ()-]{6,20}$/i, 'Enter a valid phone number.');

export const organizerOnboardingSchema = yup
  .object({
    display_name: yup.string().trim().min(2).max(120).required('Display name is required.'),
    profile_image: yup.string().trim().notRequired(),
    bio: yup.string().trim().min(20).max(2000).required('Bio is required.'),
    email: yup.string().trim().email().required('Contact email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
    location: yup.string().trim().required('Location is required.'),
    social_links: yup.array(yup.string().trim().url('Each social link must be a valid URL.').required()).default([]),
    optional_document: yup.string().trim().notRequired(),
    is_company: yup.boolean().default(false),
    company_name: yup.string().trim().when('is_company', {
      is: true,
      then: (s) => s.required('Company name is required when applying as a company.'),
      otherwise: (s) => s.notRequired(),
    }),
    company_info: yup.string().trim().when('is_company', {
      is: true,
      then: (s) => s.min(20, 'Company info should be at least 20 characters.').required('Company info is required.'),
      otherwise: (s) => s.notRequired(),
    }),
    owner_name: yup.string().trim().min(2).max(120).required('Owner name is required.'),
    owner_info: yup.string().trim().min(10).max(1000).required('Owner info is required.'),
  })
  .strict();

export type OrganizerOnboardingSchema = yup.InferType<typeof organizerOnboardingSchema>;

export const createOrganizerApplicationSchema = yup
  .object({
    display_name: yup.string().trim().min(2).max(120).required('Display name is required.'),
    email: yup.string().trim().email().required('Email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
    is_company: yup.boolean().required(),
  })
  .strict();

export type CreateOrganizerApplicationSchema = yup.InferType<typeof createOrganizerApplicationSchema>;

export const organizerSocialLinkSchema = yup
  .object({
    url: yup.string().trim().url('Enter a valid URL.').required('URL is required.'),
    label: yup.string().trim().max(60).notRequired(),
  })
  .strict();
