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

const ticketTypeQuantitiesMapSchema = yup
  .object()
  .test(
    'non-empty-quantities',
    'Add at least one ticket with quantity ≥ 1.',
    (value) =>
      !!value &&
      typeof value === 'object' &&
      Object.values(value as Record<string, unknown>).some((q) => typeof q === 'number' && q > 0),
  )
  .test(
    'integer-values',
    'Each quantity must be a non-negative integer.',
    (value) => {
      if (!value || typeof value !== 'object') return false;
      return Object.values(value as Record<string, unknown>).every(
        (q) => typeof q === 'number' && Number.isInteger(q) && q >= 0,
      );
    },
  );

export const createOrderSchema = yup
  .object({
    event_id: idSchema,
    lock_id: idSchema,
    ticket_type_quantities: ticketTypeQuantitiesMapSchema.required('Ticket selection is required.'),
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
