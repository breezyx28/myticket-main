import type { AuctionListing } from '@/api/types/auction';
import type { LayoutType, MockAuctionListing } from '@/types/domain';

function toLayoutType(raw: AuctionListing['layout_type']): LayoutType {
  return raw === 'seated' ? 'seated' : 'free';
}

function toMoney(raw: AuctionListing['price']): number {
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

/**
 * Project the API `AuctionListing` onto the legacy `MockAuctionListing` shape
 * so the existing JSX in EventDetailPage / AuctionEventPage / AuctionPage
 * keeps rendering. Snake-case API fields fall back to safe defaults so the
 * UI does not need to thread `?? ''` everywhere.
 */
export function apiAuctionToMockAuctionListing(a: AuctionListing): MockAuctionListing {
  const price = toMoney(a.price);
  const original = a.original_price != null ? toMoney(a.original_price) : price;
  const highestBid = a.highest_bid != null ? toMoney(a.highest_bid) : undefined;
  return {
    id: String(a.id),
    eventId: String(a.event_id),
    ticketId: a.ticket_id != null ? String(a.ticket_id) : undefined,
    price,
    originalPrice: original,
    endsAt: a.ends_at,
    seatLabel: a.seat_label?.trim() ? a.seat_label : undefined,
    sellerLabel: a.seller_label?.trim() ? a.seller_label : 'Seller',
    eventTitle: a.event_title ?? '',
    city: a.city ?? '',
    venue: a.venue ?? '',
    layoutType: toLayoutType(a.layout_type),
    highestBid,
    bidsCount: typeof a.bids_count === 'number' ? a.bids_count : undefined,
  };
}
