/**
 * Shared parsing for main-website ticket type payloads (`GET …/ticket-types`
 * and optional `ticket_types` on event detail).
 */

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function priceFromTicketApi(v: unknown): number {
  return num(v, 0);
}

/** Prefers `quantity_remaining`, then `quantity_limit - quantity_sold`, then legacy keys. */
export function remainingFromTicketApiRow(r: Record<string, unknown>): number | null {
  const direct = num(
    r.quantity_remaining ??
      r.remaining ??
      r.tickets_remaining ??
      r.quantity_available ??
      r.available ??
      r.stock,
    NaN,
  );
  if (Number.isFinite(direct)) return direct;
  const limit = num(r.quantity_limit, NaN);
  const sold = num(r.quantity_sold, NaN);
  if (Number.isFinite(limit) && Number.isFinite(sold)) return Math.max(0, limit - sold);
  if (Number.isFinite(limit)) return Math.max(0, limit);
  return null;
}

export function formatTicketRemainingLabel(remaining: number | null | undefined): string {
  if (remaining == null) return 'Available';
  if (remaining <= 0) return 'Sold out';
  return `${remaining.toLocaleString()} left`;
}
