import type { CardPaymentMethod } from '@/lib/cardPaymentValidation';

export type CardNetworkKey = CardPaymentMethod | 'default';

export type CardNetworkTheme = {
  root: string;
  strip?: string;
  text: string;
  paypass: string;
  logoSrc: string | null;
  logoClass: string;
  logoHeight: string;
};

/** Brand colors + logos under `public/assets/payment/`. */
export const CARD_NETWORK_THEMES: Record<CardNetworkKey, CardNetworkTheme> = {
  default: {
    root: 'bg-gradient-to-tr from-ink-90 to-ink-60',
    text: 'text-white',
    paypass: 'text-white/80',
    logoSrc: null,
    logoClass: '',
    logoHeight: 'h-0',
  },
  visa: {
    root: 'bg-gradient-to-br from-[#1434CB] to-[#0b248f]',
    text: 'text-white',
    paypass: 'text-white/80',
    logoSrc: '/assets/payment/visa.svg',
    logoClass: 'brightness-0 invert',
    logoHeight: 'h-5',
  },
  mastercard: {
    root: 'bg-gradient-to-br from-[#2d2d2d] to-[#141414]',
    text: 'text-white',
    paypass: 'text-white/80',
    logoSrc: '/assets/payment/mastercard.svg',
    logoClass: '',
    logoHeight: 'h-7',
  },
  mada: {
    root: 'bg-gradient-to-br from-[#259BD6] to-[#1a7eb8]',
    strip: 'bg-[#84B740]',
    text: 'text-white',
    paypass: 'text-white/80',
    logoSrc: '/assets/payment/mada.svg',
    logoClass: 'brightness-0 invert',
    logoHeight: 'h-6',
  },
};

export function themeForNetwork(network: CardPaymentMethod | null | undefined): CardNetworkTheme {
  if (!network) return CARD_NETWORK_THEMES.default;
  return CARD_NETWORK_THEMES[network];
}
