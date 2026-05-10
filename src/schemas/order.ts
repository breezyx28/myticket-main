import * as yup from 'yup';

const idSchema = yup.mixed<string | number>().required();

export const ticketTypeQuantitySchema = yup
  .object({
    ticket_type_id: idSchema,
    quantity: yup
      .number()
      .typeError('Quantity must be a number.')
      .integer('Quantity must be a whole number.')
      .min(1, 'Quantity must be at least 1.')
      .max(20, 'Maximum 20 tickets per order.')
      .required('Quantity is required.'),
  })
  .strict();

export const createOrderSchema = yup
  .object({
    event_id: idSchema,
    lock_id: yup.mixed<string | number>().nullable().notRequired(),
    ticket_type_quantities: yup
      .array(ticketTypeQuantitySchema)
      .min(1, 'Add at least one ticket selection.')
      .required('Ticket selection is required.'),
    payment_method: yup
      .string()
      .oneOf(['visa', 'mastercard', 'mada'], 'Select a payment method.')
      .required('Select a payment method.'),
    saved_card_id: yup.mixed<string | number>().nullable().notRequired(),
  })
  .strict();

export type CreateOrderSchema = yup.InferType<typeof createOrderSchema>;

export const cancelOrderSchema = yup
  .object({
    reason: yup.string().trim().max(500).notRequired(),
  })
  .strict();
