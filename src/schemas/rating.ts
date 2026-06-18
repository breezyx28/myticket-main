import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export function createSubmitRatingSchema(t: ValidationTFunction) {
  return yup
    .object({
      subject_type: yup
        .string()
        .oneOf(['event', 'talent', 'vendor', 'organizer'])
        .required(t('rating.subjectTypeRequired')),
      subject_id: yup.mixed<string | number>().required(t('rating.subjectIdRequired')),
      stars: yup
        .number()
        .typeError(t('rating.starsMustBeNumber'))
        .integer(t('rating.starsInteger'))
        .min(1, t('rating.ratingRange'))
        .max(5, t('rating.ratingRange'))
        .required(t('rating.ratingRequired')),
      comment: yup.string().trim().max(1000, t('rating.commentTooLong')).notRequired(),
    })
    .strict();
}

export type SubmitRatingSchema = yup.InferType<ReturnType<typeof createSubmitRatingSchema>>;

export function createUpdateMyRatingSchema(_t: ValidationTFunction) {
  return yup
    .object({
      stars: yup.number().integer().min(1).max(5).notRequired(),
      comment: yup.string().trim().max(1000).notRequired(),
    })
    .strict();
}
