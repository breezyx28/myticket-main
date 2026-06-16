import * as yup from 'yup';
import {
  detectCardMethod,
  isValidExpiry,
  luhnCheck,
  onlyDigits,
} from '@/lib/cardPaymentValidation';

/**
 * Mirrors `validatePaymentForm` in src/lib/cardPayment.ts so the UI and the
 * API client agree on the same client-side rules:
 *  - Cardholder ≥ 3 chars
 *  - Card number 16–19 digits, Luhn-passing, scheme matches selected method
 *  - Expiry MM/YY in the future
 *  - CVV exactly 3 digits
 */

export const cardPaymentSchema = yup
  .object({
    method: yup.string().oneOf(['visa', 'mastercard', 'mada']).required('Select a payment method.'),
    cardholder: yup
      .string()
      .trim()
      .min(3, 'Enter cardholder full name.')
      .required('Enter cardholder full name.'),
    card_number: yup
      .string()
      .required('Enter a valid card number.')
      .test('luhn', 'Enter a valid card number.', (value) => {
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
            message: `This card looks like ${detected.toUpperCase()}. Switch method or use matching card.`,
          });
        }
        return true;
      }),
    expiry: yup
      .string()
      .required('Enter a valid expiry date (MM/YY).')
      .test('expiry', 'Enter a valid expiry date (MM/YY).', (value) => isValidExpiry(value ?? '')),
    cvv: yup
      .string()
      .matches(/^\d{3}$/, 'CVV must be 3 digits.')
      .required('CVV is required.'),
    save_card: yup.boolean().default(false),
  })
  .strict();

export type CardPaymentSchema = yup.InferType<typeof cardPaymentSchema>;

export const confirmPaymentSchema = yup
  .object({
    payment_intent_id: yup.string().notRequired(),
    three_ds_token: yup.string().notRequired(),
    saved_card_id: yup.mixed<string | number>().notRequired(),
    save_card: yup.boolean().notRequired(),
    payment_token: yup.string().min(8).max(255).notRequired(),
    brand: yup.string().oneOf(['visa', 'mastercard', 'mada', 'amex', 'other']).notRequired(),
    last4: yup
      .string()
      .matches(/^\d{4}$/, 'last4 must be exactly 4 digits.')
      .notRequired(),
    expiry_month: yup.number().integer().min(1).max(12).notRequired(),
    expiry_year: yup.number().integer().min(2000).notRequired(),
    cardholder_name: yup.string().trim().max(120).notRequired(),
    card_number: yup.mixed().test('no-pan', 'Raw card data must not be sent.', (v) => v == null),
    pan: yup.mixed().test('no-pan', 'Raw card data must not be sent.', (v) => v == null),
    cvv: yup.mixed().test('no-cvv', 'CVV must not be sent.', (v) => v == null),
    cvc: yup.mixed().test('no-cvv', 'CVV must not be sent.', (v) => v == null),
  })
  .strict();
