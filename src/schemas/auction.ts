import * as yup from 'yup';
import type { PaymentFormState } from '@/lib/cardPayment';
import { onlyDigits } from '@/lib/cardPaymentValidation';
import { createCardPaymentSchema } from '@/schemas/payment';
import type { ValidationTFunction } from '@/schemas/types';

/**
 * `price <= original_purchase_price` is enforced because the existing mock at
 * src/services/ticketsService.ts (`listTicketForAuction`) refuses listings
 * priced higher than the user's pricePaid; supply that value via the
 * validation context so this rule survives the migration to the real API.
 */
export function createListForAuctionSchema(t: ValidationTFunction) {
  return yup
    .object({
      ticket_id: yup.mixed<string | number>().required(t('auction.ticketIdRequired')),
      price: yup
        .number()
        .typeError(t('auction.priceMustBeNumber'))
        .positive(t('auction.pricePositive'))
        .required(t('auction.priceRequired'))
        .test('not-above-original', t('auction.priceExceedsOriginal'), function (value) {
          const max = (this.options.context as { originalPrice?: number } | undefined)?.originalPrice;
          if (typeof max !== 'number') return true;
          return typeof value === 'number' && value <= max;
        }),
      ends_at: yup
        .string()
        .required(t('auction.endDateRequired'))
        .test('future', t('auction.endDateFuture'), (value) => {
          if (!value) return false;
          const ts = Date.parse(value);
          return Number.isFinite(ts) && ts > Date.now();
        }),
    })
    .strict();
}

export type ListForAuctionSchema = yup.InferType<ReturnType<typeof createListForAuctionSchema>>;

export function createPlaceBidSchema(t: ValidationTFunction) {
  return yup
    .object({
      amount: yup
        .number()
        .typeError(t('auction.bidMustBeNumber'))
        .positive(t('auction.bidPositive'))
        .required(t('auction.bidRequired'))
        .test('above-current', t('auction.bidTooLow'), function (value) {
          const min = (this.options.context as { minimumBid?: number } | undefined)?.minimumBid;
          if (typeof min !== 'number') return true;
          return typeof value === 'number' && value > min;
        }),
    })
    .strict();
}

export type PlaceBidSchema = yup.InferType<ReturnType<typeof createPlaceBidSchema>>;

export function createBuyNowSchema(_t: ValidationTFunction) {
  return yup
    .object({
      payment_method: yup.string().oneOf(['visa', 'mastercard', 'mada']).notRequired(),
      saved_card_id: yup.mixed<string | number>().nullable().notRequired(),
      cardholder: yup.string().notRequired(),
      card_number: yup.string().notRequired(),
      expiry: yup.string().notRequired(),
      cvv: yup.string().notRequired(),
      save_card: yup.boolean().notRequired(),
    })
    .strict();
}

/** Same rules as checkout `cardPaymentSchema` / `validatePaymentForm`, for buy-now without a saved card. */
export function validateBuyNowNewCardForm(form: PaymentFormState, t: ValidationTFunction) {
  return createCardPaymentSchema(t).validate({
    method: form.method,
    cardholder: form.cardholder.trim(),
    card_number: onlyDigits(form.cardNumber),
    expiry: form.expiry,
    cvv: form.cvv,
    save_card: form.saveCard,
  });
}
