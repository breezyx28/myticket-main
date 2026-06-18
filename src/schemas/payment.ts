import * as yup from 'yup';
import {
  detectCardMethod,
  isValidExpiry,
  luhnCheck,
  onlyDigits,
} from '@/lib/cardPaymentValidation';
import type { ValidationTFunction } from '@/schemas/types';

/**
 * Mirrors `validatePaymentForm` in src/lib/cardPayment.ts so the UI and the
 * API client agree on the same client-side rules:
 *  - Cardholder ≥ 3 chars
 *  - Card number 16–19 digits, Luhn-passing, scheme matches selected method
 *  - Expiry MM/YY in the future
 *  - CVV exactly 3 digits
 */

export function createCardPaymentSchema(t: ValidationTFunction) {
  return yup
    .object({
      method: yup
        .string()
        .oneOf(['visa', 'mastercard', 'mada'])
        .required(t('payment.methodRequired')),
      cardholder: yup
        .string()
        .trim()
        .min(3, t('payment.cardholderRequired'))
        .required(t('payment.cardholderRequired')),
      card_number: yup
        .string()
        .required(t('payment.cardNumberInvalid'))
        .test('luhn', t('payment.cardNumberInvalid'), (value) => {
          const digits = onlyDigits(value ?? '');
          if (digits.length < 16 || digits.length > 19) return false;
          return luhnCheck(digits);
        })
        .test('scheme-match', (value, ctx) => {
          const digits = onlyDigits(value ?? '');
          const detected = detectCardMethod(digits);
          const method = (ctx.parent as { method?: string }).method ?? '';
          if (detected && detected !== method) {
            return ctx.createError({
              message: t('payment.cardSchemeMismatch', { scheme: detected.toUpperCase() }),
            });
          }
          return true;
        }),
      expiry: yup
        .string()
        .required(t('payment.expiryInvalid'))
        .test('expiry', t('payment.expiryInvalid'), (value) => isValidExpiry(value ?? '')),
      cvv: yup
        .string()
        .matches(/^\d{3}$/, t('payment.cvvThreeDigits'))
        .required(t('payment.cvvRequired')),
      save_card: yup.boolean().default(false),
    })
    .strict();
}

export type CardPaymentSchema = yup.InferType<ReturnType<typeof createCardPaymentSchema>>;

export function createConfirmPaymentSchema(t: ValidationTFunction) {
  return yup
    .object({
      payment_intent_id: yup.string().notRequired(),
      three_ds_token: yup.string().notRequired(),
      saved_card_id: yup.mixed<string | number>().notRequired(),
      save_card: yup.boolean().notRequired(),
      payment_token: yup.string().min(8).max(255).notRequired(),
      brand: yup.string().oneOf(['visa', 'mastercard', 'mada', 'amex', 'other']).notRequired(),
      last4: yup
        .string()
        .matches(/^\d{4}$/, t('payment.last4Invalid'))
        .notRequired(),
      expiry_month: yup.number().integer().min(1).max(12).notRequired(),
      expiry_year: yup.number().integer().min(2000).notRequired(),
      cardholder_name: yup.string().trim().max(120).notRequired(),
      card_number: yup
        .mixed()
        .test('no-pan', t('payment.rawCardDataForbidden'), (v) => v == null),
      pan: yup.mixed().test('no-pan', t('payment.rawCardDataForbidden'), (v) => v == null),
      cvv: yup.mixed().test('no-cvv', t('payment.cvvMustNotBeSent'), (v) => v == null),
      cvc: yup.mixed().test('no-cvv', t('payment.cvvMustNotBeSent'), (v) => v == null),
    })
    .strict();
}
