import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

/**
 * Legacy fallback list — kept for any consumer that still wants to display a
 * static taxonomy. Real category ids now come from
 * `useGetComplaintCategoriesQuery` (`GET /complaints/categories`), which is
 * why `createComplaintSchema.category` only validates "non-empty string"
 * instead of `oneOf(COMPLAINT_CATEGORIES)`.
 */
export const COMPLAINT_CATEGORIES = ['organizer', 'venue', 'safety', 'staff', 'other'] as const;

export function createComplaintSchema(t: ValidationTFunction) {
  return yup
    .object({
      category: yup
        .string()
        .trim()
        .min(1, t('complaint.categoryRequired'))
        .max(80, t('complaint.categoryIdTooLong'))
        .required(t('complaint.categoryRequired')),
      subject: yup
        .string()
        .trim()
        .min(4, t('complaint.subjectMin'))
        .max(140, t('complaint.subjectTooLong'))
        .required(t('complaint.subjectRequired')),
      body: yup
        .string()
        .trim()
        .min(20, t('complaint.bodyMin'))
        .max(4000, t('complaint.bodyTooLong'))
        .required(t('complaint.bodyRequired')),
      related_order_id: yup.mixed<string | number>().nullable().notRequired(),
      related_event_id: yup.mixed<string | number>().nullable().notRequired(),
      attachments: yup
        .array(yup.string().trim().url(t('complaint.attachmentUrlInvalid')).required())
        .default([]),
    })
    .strict();
}

export type CreateComplaintSchema = yup.InferType<ReturnType<typeof createComplaintSchema>>;
