import { brandToMethod } from '@/lib/cardPayment';
import { detectCardMethod } from '@/lib/cardPaymentValidation';
import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';

export function resolveCardNetwork(
  cardNumber: string,
  fallback?: CardPaymentMethod | null,
): CardPaymentMethod | null {
  const detected = detectCardMethod(cardNumber);
  if (detected) return detected;
  if (!cardNumber.trim()) return null;
  return fallback ?? null;
}

export function creditCardNetworkForBrand(brand: string | null | undefined): CardPaymentMethod {
  return brandToMethod(brand ?? '');
}

export function displayCardHolder(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.toUpperCase() : 'CARD HOLDER';
}

export function displayCardExpiration(expiry: string): string {
  const trimmed = expiry.trim();
  return trimmed || 'MM/YY';
}

export function displayCardNumber(value: string, placeholder: string): string {
  const trimmed = value.trim();
  return trimmed || placeholder;
}

export function maskSavedCardNumber(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

export function displayCardLabel(value: string, fallback = 'My card'): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 24) : fallback;
}

export function savedCardDisplayLabel(
  card: { brand: string; last4: string; label?: string | null; nickname?: string | null },
  formatBrand: (brand: string) => string,
): string {
  const custom = card.label?.trim() || card.nickname?.trim();
  if (custom) return custom.slice(0, 24);
  return `${formatBrand(card.brand)} · ${card.last4}`;
}

export function networkLabel(network: CardPaymentMethod | null): string | null {
  if (!network) return null;
  if (network === 'mada') return 'mada';
  return network.charAt(0).toUpperCase() + network.slice(1);
}
