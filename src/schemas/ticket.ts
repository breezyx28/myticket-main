import * as yup from 'yup';

export const giftTicketSchema = yup
  .object({
    recipient: yup
      .string()
      .trim()
      .required('Recipient email or phone is required.')
      .test('email-or-phone', 'Enter a valid email or phone number.', (value) => {
        if (!value) return false;
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
        const phone = /^\+?[0-9 ()-]{6,20}$/i;
        return email.test(value) || phone.test(value);
      }),
    message: yup.string().trim().max(280, 'Message is too long.').notRequired(),
  })
  .strict();

export type GiftTicketSchema = yup.InferType<typeof giftTicketSchema>;

export const refundTicketSchema = yup
  .object({
    reason: yup.string().trim().max(500).notRequired(),
  })
  .strict();

export type RefundTicketSchema = yup.InferType<typeof refundTicketSchema>;

/**
 * `POST /me/tickets/check-overlap`. Mirrors `OverlapCheckRequest` and is
 * called from the seat picker / cart before purchase to surface a friendly
 * "you already own a ticket for this time" warning.
 */
export const overlapCheckSchema = yup
  .object({
    event_id: yup.mixed<number | string>().required('Event id is required.'),
    ticket_type_id: yup.mixed<number | string>().notRequired(),
    date_start: yup
      .string()
      .trim()
      .required('Start date is required.'),
    date_end: yup.string().trim().notRequired(),
  })
  .strict();

export type OverlapCheckSchema = yup.InferType<typeof overlapCheckSchema>;

/**
 * `POST /me/tickets/{id}/cancel`. Both fields are optional: the backend
 * handles the bare-body case as a "cancel without refund" request.
 */
export const cancelTicketSchema = yup
  .object({
    reason: yup.string().trim().max(500, 'Reason is too long.').notRequired(),
    refund_requested: yup.boolean().notRequired(),
  })
  .strict();

export type CancelTicketSchema = yup.InferType<typeof cancelTicketSchema>;
