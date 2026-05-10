import * as yup from 'yup';

export const submitRatingSchema = yup
  .object({
    subject_type: yup
      .string()
      .oneOf(['event', 'talent', 'vendor', 'organizer'])
      .required('Subject type is required.'),
    subject_id: yup.mixed<string | number>().required('Subject id is required.'),
    stars: yup
      .number()
      .typeError('Stars must be a number.')
      .integer('Stars must be a whole number.')
      .min(1, 'Rating must be between 1 and 5.')
      .max(5, 'Rating must be between 1 and 5.')
      .required('Rating is required.'),
    comment: yup.string().trim().max(1000, 'Comment is too long.').notRequired(),
  })
  .strict();

export type SubmitRatingSchema = yup.InferType<typeof submitRatingSchema>;

export const updateMyRatingSchema = yup
  .object({
    stars: yup
      .number()
      .integer()
      .min(1)
      .max(5)
      .notRequired(),
    comment: yup.string().trim().max(1000).notRequired(),
  })
  .strict();
