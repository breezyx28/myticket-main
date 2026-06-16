import type { Id, Iso8601 } from '@/api/types/common';

export type CardBrand = 'visa' | 'mastercard' | 'mada' | string;

export interface SavedCard {
  id: Id;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  cardholder_name?: string | null;
  /** Optional user label (e.g. "Personal", "Work"). */
  label?: string | null;
  nickname?: string | null;
  is_default?: boolean;
  created_at?: Iso8601;
  [key: string]: unknown;
}
