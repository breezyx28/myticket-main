import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

function idSchema(t: ValidationTFunction) {
  return yup.mixed<string | number>().required(t('common.idRequired'));
}

export function createTicketTypeQuantitySchema(t: ValidationTFunction) {
  return yup
    .object({
      ticket_type_id: idSchema(t),
      quantity: yup
        .number()
        .typeError(t('order.quantityMustBeNumber'))
        .integer(t('order.quantityInteger'))
        .min(1, t('order.quantityMin'))
        .max(20, t('order.quantityMax'))
        .required(t('order.quantityRequired')),
    })
    .strict();
}

function ticketTypeQuantitiesMapSchema(t: ValidationTFunction) {
  return yup
    .object()
    .test('non-empty-quantities', t('order.addAtLeastOneTicket'), (value) =>
      !!value &&
      typeof value === 'object' &&
      Object.values(value as Record<string, unknown>).some((q) => typeof q === 'number' && q > 0),
    )
    .test('integer-values', t('order.quantityNonNegativeInteger'), (value) => {
      if (!value || typeof value !== 'object') return false;
      return Object.values(value as Record<string, unknown>).every(
        (q) => typeof q === 'number' && Number.isInteger(q) && q >= 0,
      );
    });
}

export function createOrderSchema(t: ValidationTFunction) {
  return yup
    .object({
      event_id: idSchema(t),
      lock_id: idSchema(t),
      ticket_type_quantities: ticketTypeQuantitiesMapSchema(t).required(t('order.ticketSelectionRequired')),
      payment_method: yup
        .string()
        .oneOf(['visa', 'mastercard', 'mada'], t('order.paymentMethodRequired'))
        .required(t('order.paymentMethodRequired')),
      saved_card_id: yup.mixed<string | number>().nullable().notRequired(),
    })
    .strict();
}

export type CreateOrderSchema = yup.InferType<ReturnType<typeof createOrderSchema>>;

export function createCancelOrderSchema(_t: ValidationTFunction) {
  return yup
    .object({
      reason: yup.string().trim().max(500).notRequired(),
    })
    .strict();
}
