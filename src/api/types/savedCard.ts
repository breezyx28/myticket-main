import type { Id, Iso8601 } from '@/api/types/common';

export type CardBrand = 'visa' | 'mastercard' | 'mada' | string;

export interface SavedCard {
  id: Id;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  /** Raw API field aliases — normalized to exp_month/exp_year in mappers. */
  expiry_month?: number;
  expiry_year?: number;
  cardholder_name?: string | null;
  is_default?: boolean;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface UpdateSavedCardRequest {
  is_default: true;
}
