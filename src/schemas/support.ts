import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export const SUPPORT_CATEGORIES = [
  'technical',
  'ticket',
  'dispute_organizer',
  'account',
  'other',
] as const;

export function createSupportCaseSchema(t: ValidationTFunction) {
  return yup
    .object({
      category: yup
        .string()
        .oneOf(SUPPORT_CATEGORIES, t('support.chooseCategory'))
        .required(t('support.categoryRequired')),
      subject: yup
        .string()
        .trim()
        .min(4, t('support.subjectMin'))
        .max(140, t('support.subjectTooLong'))
        .required(t('support.subjectRequired')),
      order_reference: yup.string().trim().max(60).notRequired(),
      message: yup
        .string()
        .trim()
        .min(10, t('support.messageMin'))
        .max(4000, t('support.messageTooLong'))
        .required(t('support.messageRequired')),
    })
    .strict();
}

export type CreateSupportCaseSchema = yup.InferType<ReturnType<typeof createSupportCaseSchema>>;

export function createSupportMessageSchema(t: ValidationTFunction) {
  return yup
    .object({
      body: yup
        .string()
        .trim()
        .min(1, t('support.messageEmpty'))
        .max(4000)
        .required(t('support.messageRequired')),
      attachment_url: yup
        .string()
        .trim()
        .url(t('support.attachmentUrlInvalid'))
        .notRequired(),
    })
    .strict();
}

export type SupportMessageSchema = yup.InferType<ReturnType<typeof createSupportMessageSchema>>;

export function createStartSupportChatSchema(_t: ValidationTFunction) {
  return yup
    .object({
      topic: yup.string().trim().max(140).notRequired(),
      initial_message: yup.string().trim().max(4000).notRequired(),
    })
    .strict();
}

export function createPromoteSupportChatSchema(_t: ValidationTFunction) {
  return yup
    .object({
      category: yup.string().oneOf(SUPPORT_CATEGORIES).notRequired(),
      subject: yup.string().trim().max(140).notRequired(),
    })
    .strict();
}
