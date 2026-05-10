import {
  detectCardMethod,
  isValidExpiry,
  luhnCheck,
  onlyDigits,
  type CardPaymentMethod,
} from '@/lib/cardPaymentValidation';

export type { CardPaymentMethod };

export interface PaymentFormState {
  method: CardPaymentMethod;
  cardholder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  saveCard: boolean;
}

export interface PaymentValidationResult {
  isValid: boolean;
  detectedMethod: CardPaymentMethod | null;
  errors: Partial<Record<'cardholder' | 'cardNumber' | 'expiry' | 'cvv', string>>;
}

export interface CardMethodUiConfig {
  id: CardPaymentMethod;
  label: string;
  helper: string;
  numberPlaceholder: string;
  cvvLabel: string;
  cvvPlaceholder: string;
  cardholderPlaceholder: string;
  cardNumberMaxLength: number;
}

export const CARD_PAYMENT_METHODS: CardMethodUiConfig[] = [
  {
    id: 'visa',
    label: 'Visa',
    helper: 'Global credit/debit network',
    numberPlaceholder: '4111 1111 1111 1111',
    cvvLabel: 'CVV',
    cvvPlaceholder: '123',
    cardholderPlaceholder: 'e.g. MOHAM ALQAHTANI',
    cardNumberMaxLength: 16,
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    helper: 'Worldwide card acceptance',
    numberPlaceholder: '5555 5555 5555 4444',
    cvvLabel: 'CVC',
    cvvPlaceholder: '123',
    cardholderPlaceholder: 'e.g. MOHAM ALQAHTANI',
    cardNumberMaxLength: 16,
  },
  {
    id: 'mada',
    label: 'Mada',
    helper: 'Saudi domestic card scheme',
    numberPlaceholder: '5888 4500 0000 0000',
    cvvLabel: 'CVV',
    cvvPlaceholder: '123',
    cardholderPlaceholder: 'Name as printed on card',
    cardNumberMaxLength: 19,
  },
];

export function formatCardNumber(value: string, method: CardPaymentMethod) {
  const config = CARD_PAYMENT_METHODS.find((m) => m.id === method);
  const maxDigits = config?.cardNumberMaxLength ?? 19;
  return onlyDigits(value)
    .slice(0, maxDigits)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatCvv(value: string) {
  return onlyDigits(value).slice(0, 3);
}

export function formatCardBrand(brand: string): string {
  if (!brand) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

export function formatSavedCardExpiry(month: number, year: number): string {
  const mm = String(Math.max(1, Math.min(12, Math.round(month)))).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

export function brandToMethod(brand: string): CardPaymentMethod {
  const normalized = brand?.toLowerCase();
  if (normalized === 'mastercard' || normalized === 'mada') return normalized;
  return 'visa';
}

export function validatePaymentForm(form: PaymentFormState): PaymentValidationResult {
  const errors: PaymentValidationResult['errors'] = {};
  const digits = onlyDigits(form.cardNumber);
  const detectedMethod = detectCardMethod(digits);

  if (form.cardholder.trim().length < 3) {
    errors.cardholder = 'Enter cardholder full name.';
  }
  if (digits.length < 16 || digits.length > 19 || !luhnCheck(digits)) {
    errors.cardNumber = 'Enter a valid card number.';
  } else if (detectedMethod && detectedMethod !== form.method) {
    errors.cardNumber = `This card looks like ${detectedMethod.toUpperCase()}. Switch method or use matching card.`;
  }
  if (!isValidExpiry(form.expiry)) {
    errors.expiry = 'Enter a valid expiry date (MM/YY).';
  }
  if (!/^\d{3}$/.test(form.cvv)) {
    errors.cvv = 'CVV must be 3 digits.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    detectedMethod,
    errors,
  };
}
