import * as yup from 'yup';

/**
 * `price <= original_purchase_price` is enforced because the existing mock at
 * src/services/ticketsService.ts (`listTicketForAuction`) refuses listings
 * priced higher than the user's pricePaid; supply that value via the
 * validation context so this rule survives the migration to the real API.
 */
export const listForAuctionSchema = yup
  .object({
    ticket_id: yup.mixed<string | number>().required('Ticket id is required.'),
    price: yup
      .number()
      .typeError('Price must be a number.')
      .positive('Price must be greater than 0.')
      .required('Price is required.')
      .test('not-above-original', 'Price cannot exceed original purchase price.', function (value) {
        const max = (this.options.context as { originalPrice?: number } | undefined)?.originalPrice;
        if (typeof max !== 'number') return true;
        return typeof value === 'number' && value <= max;
      }),
    ends_at: yup
      .string()
      .required('End date is required.')
      .test('future', 'End date must be in the future.', (value) => {
        if (!value) return false;
        const ts = Date.parse(value);
        return Number.isFinite(ts) && ts > Date.now();
      }),
  })
  .strict();

export type ListForAuctionSchema = yup.InferType<typeof listForAuctionSchema>;

export const placeBidSchema = yup
  .object({
    amount: yup
      .number()
      .typeError('Bid amount must be a number.')
      .positive('Bid must be greater than 0.')
      .required('Bid amount is required.')
      .test('above-current', 'Bid must be greater than the current highest bid.', function (value) {
        const min = (this.options.context as { minimumBid?: number } | undefined)?.minimumBid;
        if (typeof min !== 'number') return true;
        return typeof value === 'number' && value > min;
      }),
  })
  .strict();

export type PlaceBidSchema = yup.InferType<typeof placeBidSchema>;

export const buyNowSchema = yup
  .object({
    payment_method: yup.string().oneOf(['visa', 'mastercard', 'mada']).notRequired(),
    saved_card_id: yup.mixed<string | number>().nullable().notRequired(),
  })
  .strict();
