import type { SavedCard } from '@/api/types/savedCard';
import type { Paginated } from '@/api/types/common';

type RawSavedCard = SavedCard & {
  expiry_month?: number;
  expiry_year?: number;
};

export function normalizeSavedCard(raw: unknown): SavedCard {
  const card = (raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data: unknown }).data
    : raw) as RawSavedCard;

  const expMonth = card.exp_month ?? card.expiry_month ?? 1;
  const expYear = card.exp_year ?? card.expiry_year ?? new Date().getFullYear();

  return {
    ...card,
    exp_month: Number(expMonth),
    exp_year: Number(expYear),
  };
}

export function normalizeSavedCardsResponse(
  raw: unknown,
): Paginated<SavedCard> | SavedCard[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeSavedCard(item));
  }
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const envelope = raw as Paginated<unknown>;
    if (Array.isArray(envelope.data)) {
      return {
        ...(raw as Paginated<SavedCard>),
        data: envelope.data.map((item) => normalizeSavedCard(item)),
      };
    }
  }
  return [];
}
/** Parse MM/YY from checkout form into API expiry fields. */
export function parseExpiryMmYy(expiry: string): { expiry_month: number; expiry_year: number } | null {
  const trimmed = expiry.trim();
  const match = /^(\d{2})\/(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const expiry_month = Number(match[1]);
  const yy = Number(match[2]);
  if (expiry_month < 1 || expiry_month > 12) return null;

  const expiry_year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return { expiry_month, expiry_year };
}

/** Max active saved cards per user (server-configurable; handoff default). */
export const SAVED_CARDS_MAX = 10;
