export type CardPaymentMethod = 'visa' | 'mastercard' | 'mada';

const MADA_PREFIXES = [
  '440647', '440795', '445564', '446404', '457865', '457997', '474491', '588845',
  '968208', '968210', '968211', '968212',
];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function luhnCheck(cardNumber: string) {
  const digits = onlyDigits(cardNumber);
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(expiry: string) {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const month = Number(expiry.slice(0, 2));
  const year = Number(expiry.slice(3, 5));
  if (month < 1 || month > 12) return false;
  const fullYear = 2000 + year;
  const expiryDate = new Date(fullYear, month, 0, 23, 59, 59);
  return expiryDate.getTime() >= Date.now();
}

export function detectCardMethod(cardNumber: string): CardPaymentMethod | null {
  const digits = onlyDigits(cardNumber);
  if (digits.length < 1) return null;

  if (MADA_PREFIXES.some((prefix) => digits.startsWith(prefix))) {
    return 'mada';
  }
  if (digits.startsWith('4')) return 'visa';

  const two = Number(digits.slice(0, 2));
  const four = Number(digits.slice(0, 4));
  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) {
    return 'mastercard';
  }
  return null;
}
