import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export function createGiftTicketSchema(t: ValidationTFunction) {
  return yup
    .object({
      recipient: yup
        .string()
        .trim()
        .required(t('ticket.recipientRequired'))
        .test('email-or-phone', t('ticket.recipientEmailOrPhone'), (value) => {
          if (!value) return false;
          const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
          const phone = /^\+?[0-9 ()-]{6,20}$/i;
          return email.test(value) || phone.test(value);
        }),
      message: yup.string().trim().max(280, t('ticket.messageTooLong')).notRequired(),
    })
    .strict();
}

export type GiftTicketSchema = yup.InferType<ReturnType<typeof createGiftTicketSchema>>;

export function createRefundTicketSchema(_t: ValidationTFunction) {
  return yup
    .object({
      reason: yup.string().trim().max(500).notRequired(),
    })
    .strict();
}

export type RefundTicketSchema = yup.InferType<ReturnType<typeof createRefundTicketSchema>>;

/**
 * `POST /me/tickets/check-overlap`. Mirrors `OverlapCheckRequest` and is
 * called from the seat picker / cart before purchase to surface a friendly
 * "you already own a ticket for this time" warning.
 */
export function createOverlapCheckSchema(t: ValidationTFunction) {
  return yup
    .object({
      event_id: yup.mixed<number | string>().required(t('ticket.eventIdRequired')),
      ticket_type_id: yup.mixed<number | string>().notRequired(),
      event_start: yup.string().trim().required(t('ticket.eventStartRequired')),
      event_end: yup.string().trim().notRequired(),
    })
    .strict();
}

export type OverlapCheckSchema = yup.InferType<ReturnType<typeof createOverlapCheckSchema>>;

/**
 * `POST /me/tickets/{id}/cancel`. Both fields are optional: the backend
 * handles the bare-body case as a "cancel without refund" request.
 */
export function createCancelTicketSchema(t: ValidationTFunction) {
  return yup
    .object({
      reason: yup.string().trim().max(500, t('ticket.reasonTooLong')).notRequired(),
      refund_requested: yup.boolean().notRequired(),
    })
    .strict();
}

export type CancelTicketSchema = yup.InferType<ReturnType<typeof createCancelTicketSchema>>;
