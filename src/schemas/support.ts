import * as yup from 'yup';

export const SUPPORT_CATEGORIES = [
  'technical',
  'ticket',
  'dispute_organizer',
  'account',
  'other',
] as const;

export const createSupportCaseSchema = yup
  .object({
    category: yup
      .string()
      .oneOf(SUPPORT_CATEGORIES, 'Choose a category.')
      .required('Category is required.'),
    subject: yup
      .string()
      .trim()
      .min(4, 'Subject must be at least 4 characters.')
      .max(140, 'Subject is too long.')
      .required('Subject is required.'),
    order_reference: yup.string().trim().max(60).notRequired(),
    message: yup
      .string()
      .trim()
      .min(10, 'Describe your issue in at least 10 characters.')
      .max(4000, 'Message is too long.')
      .required('Message is required.'),
  })
  .strict();

export type CreateSupportCaseSchema = yup.InferType<typeof createSupportCaseSchema>;

export const supportMessageSchema = yup
  .object({
    body: yup.string().trim().min(1, 'Message cannot be empty.').max(4000).required('Message is required.'),
    attachment_url: yup.string().trim().url('Attachment must be a valid URL.').notRequired(),
  })
  .strict();

export type SupportMessageSchema = yup.InferType<typeof supportMessageSchema>;

export const startSupportChatSchema = yup
  .object({
    topic: yup.string().trim().max(140).notRequired(),
    initial_message: yup.string().trim().max(4000).notRequired(),
  })
  .strict();

export const promoteSupportChatSchema = yup
  .object({
    category: yup.string().oneOf(SUPPORT_CATEGORIES).notRequired(),
    subject: yup.string().trim().max(140).notRequired(),
  })
  .strict();
