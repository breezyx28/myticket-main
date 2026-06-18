import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

function phoneField(t: ValidationTFunction) {
  return yup
    .string()
    .trim()
    .matches(/^\+?[0-9 ()-]{6,20}$/i, t('common.phoneInvalid'));
}

export function createOrganizerOnboardingSchema(t: ValidationTFunction) {
  return yup
    .object({
      display_name: yup.string().trim().min(2).max(120).required(t('organizer.displayNameRequired')),
      profile_image: yup.string().trim().notRequired(),
      bio: yup.string().trim().min(20).max(2000).required(t('organizer.bioRequired')),
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('organizer.contactEmailRequired')),
      contact_phone: phoneField(t).required(t('organizer.contactPhoneRequired')),
      location: yup.string().trim().required(t('organizer.locationRequired')),
      social_links: yup
        .array(yup.string().trim().url(t('organizer.socialLinkUrlInvalid')).required())
        .default([]),
      optional_document: yup.string().trim().notRequired(),
      is_company: yup.boolean().default(false),
      company_name: yup.string().trim().when('is_company', {
        is: true,
        then: (s) => s.required(t('organizer.companyNameRequired')),
        otherwise: (s) => s.notRequired(),
      }),
      company_info: yup.string().trim().when('is_company', {
        is: true,
        then: (s) =>
          s.min(20, t('organizer.companyInfoMin')).required(t('organizer.companyInfoRequired')),
        otherwise: (s) => s.notRequired(),
      }),
      owner_name: yup.string().trim().min(2).max(120).required(t('organizer.ownerNameRequired')),
      owner_info: yup.string().trim().min(10).max(1000).required(t('organizer.ownerInfoRequired')),
    })
    .strict();
}

export type OrganizerOnboardingSchema = yup.InferType<ReturnType<typeof createOrganizerOnboardingSchema>>;

export function createOrganizerApplicationSchema(t: ValidationTFunction) {
  return yup
    .object({
      display_name: yup.string().trim().min(2).max(120).required(t('organizer.displayNameRequired')),
      email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('organizer.emailRequired')),
      contact_phone: phoneField(t).required(t('organizer.contactPhoneRequired')),
      is_company: yup.boolean().required(),
    })
    .strict();
}

export type CreateOrganizerApplicationSchema = yup.InferType<
  ReturnType<typeof createOrganizerApplicationSchema>
>;

export function createOrganizerSocialLinkSchema(t: ValidationTFunction) {
  return yup
    .object({
      url: yup.string().trim().url(t('common.urlInvalid')).required(t('organizer.urlRequired')),
      label: yup.string().trim().max(60).notRequired(),
    })
    .strict();
}
