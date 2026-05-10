import type { GiftListItem } from '@/api/types/gift';
import type { Ticket, TicketStatus as ApiTicketStatus } from '@/api/types/ticket';
import type { MockTicket, TicketStatus } from '@/types/domain';

const KNOWN_STATUSES = new Set<TicketStatus>([
  'active',
  'auction',
  'gifted',
  'used',
  'expired',
  'cancelled',
  'refunded',
]);

function toUiStatus(raw: ApiTicketStatus | string | undefined): TicketStatus {
  return KNOWN_STATUSES.has(raw as TicketStatus) ? (raw as TicketStatus) : 'active';
}

/**
 * Project an API `Ticket` onto the legacy `MockTicket` shape so the existing
 * MyTicketsPage / TicketDetailPage JSX keeps rendering. `id`, `eventId`, and
 * `listedAuctionId` are coerced to strings so cross-component navigation
 * (`/my-tickets/${ticket.id}`) continues to work.
 */
export function apiTicketToMockTicket(ticket: Ticket, fallback?: MockTicket | null): MockTicket {
  const status = toUiStatus(ticket.status);
  const dateEnd = ticket.date_end ?? ticket.date_start;
  const seatLabel = ticket.seat_label?.trim() ? ticket.seat_label : fallback?.seatLabel;
  return {
    id: String(ticket.id),
    eventId: String(ticket.event_id),
    eventTitle: ticket.event_title ?? fallback?.eventTitle ?? '',
    venue: ticket.venue ?? fallback?.venue ?? '',
    city: ticket.city ?? fallback?.city ?? '',
    dateStart: ticket.date_start,
    dateEnd,
    status,
    typeName: ticket.ticket_type_name ?? fallback?.typeName ?? '',
    seatLabel,
    orderRef: ticket.order_reference ?? fallback?.orderRef ?? `ORD-${String(ticket.id)}`,
    qrPayload: ticket.qr_payload ?? fallback?.qrPayload,
    pricePaid: typeof ticket.price_paid === 'number' ? ticket.price_paid : Number(ticket.price_paid ?? 0),
    countsForOverlap: status === 'active',
    receivedAsGift: ticket.received_as_gift ?? fallback?.receivedAsGift,
    fromAuction: ticket.from_auction ?? fallback?.fromAuction,
    listedAuctionId:
      ticket.listed_auction_id != null ? String(ticket.listed_auction_id) : fallback?.listedAuctionId,
  };
}

/**
 * Lightweight projection for the gifts inbox tab in `MyTicketsPage`. Keeps
 * the row shape stable when the backend evolves the card payload.
 */
export interface InboxGiftRow {
  id: string;
  status: GiftListItem['status'];
  senderName: string;
  eventTitle: string;
  eventCoverUrl: string;
  message: string;
  expiresAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

export function apiGiftListItemToInboxRow(g: GiftListItem): InboxGiftRow {
  return {
    id: String(g.id),
    status: g.status,
    senderName: g.sender_name?.trim() ? g.sender_name : 'A friend',
    eventTitle: g.event_title?.trim() ? g.event_title : 'Event ticket',
    eventCoverUrl: g.event_cover_url ?? '',
    message: g.message?.trim() ? g.message : '',
    expiresAt: g.expires_at ?? null,
    claimedAt: g.claimed_at ?? null,
    createdAt: g.created_at,
  };
}
