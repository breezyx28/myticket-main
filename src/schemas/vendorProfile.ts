import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

function phoneField(t: ValidationTFunction) {
  return yup
    .string()
    .trim()
    .matches(/^\+?[0-9 ()-]{6,20}$/i, t('common.phoneInvalid'));
}

export function createVendorOnboardingSchema(t: ValidationTFunction) {
  return yup
    .object({
      profile_name: yup.string().trim().min(2).max(120).required(t('vendor.businessNameRequired')),
      contact_email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('vendor.contactEmailRequired')),
      contact_phone: phoneField(t).required(t('vendor.contactPhoneRequired')),
      bio: yup.string().trim().min(20).max(2000).required(t('vendor.bioRequired')),
      service_categories: yup
        .array(yup.string().trim().required())
        .min(1, t('vendor.serviceCategoriesMin')),
      verification_documents: yup
        .array(yup.string().trim().required())
        .min(1, t('vendor.verificationDocumentsMin')),
      gallery: yup.array(yup.string().trim().required()).default([]),
      city: yup.string().trim().required(t('vendor.cityRequired')),
      coverage_area: yup.string().trim().required(t('vendor.coverageAreaRequired')),
    })
    .strict();
}

export type VendorOnboardingSchema = yup.InferType<ReturnType<typeof createVendorOnboardingSchema>>;

export function createVendorApplicationSchema(t: ValidationTFunction) {
  return yup
    .object({
      business_name: yup.string().trim().min(2).max(120).required(t('vendor.businessNameRequired')),
      contact_email: yup
        .string()
        .trim()
        .email(t('common.emailInvalid'))
        .required(t('vendor.contactEmailRequired')),
      contact_phone: phoneField(t).required(t('vendor.contactPhoneRequired')),
      service_categories: yup
        .array(yup.string().trim().required())
        .min(1, t('vendor.serviceCategoriesMin')),
    })
    .strict();
}

export type CreateVendorApplicationSchema = yup.InferType<ReturnType<typeof createVendorApplicationSchema>>;
