import type { AuctionListing } from '@/api/types/auction';
import type { Money } from '@/api/types/common';
import { apiLayoutTypeToMockLayout } from '@/lib/eventMappers';
import type { LayoutType, MockAuctionListing } from '@/types/domain';

function pickFirst(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function toLayoutType(raw: string | null | undefined): LayoutType {
  return apiLayoutTypeToMockLayout(raw ?? undefined);
}

function toMoney(raw: Money | string | null | undefined): number {
  if (raw == null) return 0;
  return typeof raw === 'number' ? raw : Number(raw);
}

/**
 * Project the API `AuctionListing` onto the legacy `MockAuctionListing` shape
 * so EventDetailPage / AuctionEventPage / AuctionPage keep rendering. Supports
 * main API `*_cache` columns and string money fields.
 */
export function apiAuctionToMockAuctionListing(a: AuctionListing): MockAuctionListing {
  const price = toMoney(a.price);
  const original = a.original_price != null ? toMoney(a.original_price) : price;
  const highestBid = a.highest_bid != null ? toMoney(a.highest_bid) : undefined;
  const commissionPctRaw = a.commission_pct != null ? toMoney(a.commission_pct) : undefined;
  const commissionPct = commissionPctRaw != null && commissionPctRaw > 0 ? commissionPctRaw : undefined;
  const currency = pickFirst(a.currency, 'SAR') || 'SAR';

  return {
    id: String(a.id),
    eventId: String(a.event_id),
    ticketId: a.ticket_id != null ? String(a.ticket_id) : undefined,
    price,
    originalPrice: original,
    endsAt: String(a.ends_at),
    startsAt: pickFirst(a.starts_at) || undefined,
    seatLabel: pickFirst(a.seat_label, a.seat_label_cache) || undefined,
    sellerLabel: pickFirst(a.seller_label) || 'Seller',
    eventTitle: pickFirst(a.event_title, a.event_title_cache) || 'Event',
    city: pickFirst(a.city, a.city_cache),
    venue: pickFirst(a.venue, a.venue_cache),
    layoutType: toLayoutType(pickFirst(a.layout_type, a.layout_type_cache) || undefined),
    highestBid,
    bidsCount: typeof a.bids_count === 'number' ? a.bids_count : undefined,
    listingCode: a.code != null && String(a.code).trim() ? String(a.code).trim() : undefined,
    currency,
    commissionPct,
    ticketTypeLabel: pickFirst(a.ticket_type_cache) || undefined,
    listingStatus: typeof a.status === 'string' && a.status.trim() ? a.status.trim() : 'active',
  };
}
