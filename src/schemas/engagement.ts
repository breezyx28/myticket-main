import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export function createEngagementMessageSchema(t: ValidationTFunction) {
  return yup
    .object({
      body: yup
        .string()
        .trim()
        .min(1, t('engagement.messageEmpty'))
        .max(4000, t('engagement.messageTooLong'))
        .required(t('engagement.messageRequired')),
      attachment_url: yup
        .string()
        .trim()
        .url(t('engagement.attachmentUrlInvalid'))
        .notRequired(),
    })
    .strict();
}

export type EngagementMessageSchema = yup.InferType<ReturnType<typeof createEngagementMessageSchema>>;

/**
 * `POST /me/engagements`. Used by the "contact this talent / vendor" CTA on
 * a profile page. `target_type` discriminates the engagement counterparty.
 */
export function createEngagementSchema(t: ValidationTFunction) {
  return yup
    .object({
      target_type: yup
        .string()
        .oneOf(['talent', 'vendor'], t('engagement.targetTypeInvalid'))
        .required(t('engagement.targetTypeRequired')),
      target_id: yup.mixed<number | string>().required(t('engagement.targetRequired')),
      topic: yup
        .string()
        .trim()
        .min(2, t('engagement.topicTooShort'))
        .max(200, t('engagement.topicTooLong'))
        .required(t('engagement.topicRequired')),
      initial_message: yup.string().trim().max(4000, t('engagement.messageTooLong')).notRequired(),
    })
    .strict();
}

export type CreateEngagementSchema = yup.InferType<ReturnType<typeof createEngagementSchema>>;
