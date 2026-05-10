import * as yup from 'yup';

export const engagementMessageSchema = yup
  .object({
    body: yup
      .string()
      .trim()
      .min(1, 'Message cannot be empty.')
      .max(4000, 'Message is too long.')
      .required('Message is required.'),
    attachment_url: yup.string().trim().url('Attachment must be a valid URL.').notRequired(),
  })
  .strict();

export type EngagementMessageSchema = yup.InferType<typeof engagementMessageSchema>;

/**
 * `POST /me/engagements`. Used by the "contact this talent / vendor" CTA on
 * a profile page. `target_type` discriminates the engagement counterparty.
 */
export const createEngagementSchema = yup
  .object({
    target_type: yup
      .string()
      .oneOf(['talent', 'vendor'], 'Choose talent or vendor.')
      .required('Target type is required.'),
    target_id: yup.mixed<number | string>().required('Target is required.'),
    topic: yup
      .string()
      .trim()
      .min(2, 'Topic is too short.')
      .max(200, 'Topic is too long.')
      .required('Topic is required.'),
    initial_message: yup.string().trim().max(4000, 'Message is too long.').notRequired(),
  })
  .strict();

export type CreateEngagementSchema = yup.InferType<typeof createEngagementSchema>;
