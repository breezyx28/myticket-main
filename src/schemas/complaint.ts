import * as yup from 'yup';

/**
 * Legacy fallback list — kept for any consumer that still wants to display a
 * static taxonomy. Real category ids now come from
 * `useGetComplaintCategoriesQuery` (`GET /complaints/categories`), which is
 * why `createComplaintSchema.category` only validates "non-empty string"
 * instead of `oneOf(COMPLAINT_CATEGORIES)`.
 */
export const COMPLAINT_CATEGORIES = ['organizer', 'venue', 'safety', 'staff', 'other'] as const;

export const createComplaintSchema = yup
  .object({
    category: yup
      .string()
      .trim()
      .min(1, 'Category is required.')
      .max(80, 'Category id is too long.')
      .required('Category is required.'),
    subject: yup
      .string()
      .trim()
      .min(4, 'Subject must be at least 4 characters.')
      .max(140, 'Subject is too long.')
      .required('Subject is required.'),
    body: yup
      .string()
      .trim()
      .min(20, 'Provide at least 20 characters of detail.')
      .max(4000, 'Description is too long.')
      .required('Description is required.'),
    related_order_id: yup.mixed<string | number>().nullable().notRequired(),
    related_event_id: yup.mixed<string | number>().nullable().notRequired(),
    attachments: yup.array(yup.string().trim().url('Each attachment must be a valid URL.').required()).default([]),
  })
  .strict();

export type CreateComplaintSchema = yup.InferType<typeof createComplaintSchema>;
