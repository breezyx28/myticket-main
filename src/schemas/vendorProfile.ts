import * as yup from 'yup';

const phone = yup
  .string()
  .trim()
  .matches(/^\+?[0-9 ()-]{6,20}$/i, 'Enter a valid phone number.');

export const vendorOnboardingSchema = yup
  .object({
    profile_name: yup.string().trim().min(2).max(120).required('Business name is required.'),
    contact_email: yup.string().trim().email().required('Contact email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
    bio: yup.string().trim().min(20).max(2000).required('Bio is required.'),
    service_categories: yup
      .array(yup.string().trim().required())
      .min(1, 'Select at least one service category.'),
    verification_documents: yup
      .array(yup.string().trim().required())
      .min(1, 'Upload at least one verification document.'),
    gallery: yup.array(yup.string().trim().required()).default([]),
    city: yup.string().trim().required('City is required.'),
    coverage_area: yup.string().trim().required('Coverage area is required.'),
  })
  .strict();

export type VendorOnboardingSchema = yup.InferType<typeof vendorOnboardingSchema>;

export const createVendorApplicationSchema = yup
  .object({
    business_name: yup.string().trim().min(2).max(120).required('Business name is required.'),
    contact_email: yup.string().trim().email().required('Contact email is required.'),
    contact_phone: phone.required('Contact phone is required.'),
    service_categories: yup
      .array(yup.string().trim().required())
      .min(1, 'Select at least one service category.'),
  })
  .strict();

export type CreateVendorApplicationSchema = yup.InferType<typeof createVendorApplicationSchema>;
