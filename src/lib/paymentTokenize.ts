import type { PaymentFormState } from '@/lib/cardPayment';
import { detectCardMethod, onlyDigits } from '@/lib/cardPaymentValidation';
import { parseExpiryMmYy } from '@/lib/savedCardMappers';

export interface PaymentTokenResult {
  payment_token: string;
  brand: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  cardholder_name: string;
}

export interface PaymentGateway {
  tokenize(form: PaymentFormState): Promise<PaymentTokenResult>;
}

function resolveBrand(form: PaymentFormState): string {
  const digits = onlyDigits(form.cardNumber);
  const detected = detectCardMethod(digits);
  return detected ?? form.method;
}

/** Local gateway: accepts any `tok_` prefix per handoff §9. Never sends PAN/CVV to our API. */
const localGateway: PaymentGateway = {
  async tokenize(form) {
    const digits = onlyDigits(form.cardNumber);
    const last4 = digits.slice(-4);
    if (last4.length !== 4) {
      throw new Error('Enter a valid card number.');
    }

    const expiry = parseExpiryMmYy(form.expiry);
    if (!expiry) {
      throw new Error('Enter a valid expiry date (MM/YY).');
    }

    const brand = resolveBrand(form);
    const payment_token = `tok_local_${crypto.randomUUID()}`;

    return {
      payment_token,
      brand,
      last4,
      expiry_month: expiry.expiry_month,
      expiry_year: expiry.expiry_year,
      cardholder_name: form.cardholder.trim(),
    };
  },
};

function selectGateway(): PaymentGateway {
  const gateway = import.meta.env.VITE_PAYMENT_GATEWAY;
  if (gateway && gateway !== 'local') {
    // Future: return moyasarGateway, hyperPayGateway, etc.
    console.warn(`[payment] Unknown VITE_PAYMENT_GATEWAY="${gateway}", falling back to local.`);
  }
  return localGateway;
}

const activeGateway = selectGateway();

export async function tokenizeCardForPayment(form: PaymentFormState): Promise<PaymentTokenResult> {
  return activeGateway.tokenize(form);
}
