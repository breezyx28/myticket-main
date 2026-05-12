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

function pickFirstNonEmpty(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function truthyBit(v: boolean | number | string | undefined): boolean {
  if (v === true) return true;
  if (v === 1 || v === '1') return true;
  return false;
}

/**
 * Project an API `Ticket` onto the legacy `MockTicket` shape so the existing
 * MyTicketsPage / TicketDetailPage JSX keeps rendering. `id`, `eventId`, and
 * `listedAuctionId` are coerced to strings so cross-component navigation
 * (`/my-tickets/${ticket.id}`) continues to work.
 *
 * Supports production payloads that use `*_cache` fields and numeric `0`/`1`
 * flags instead of booleans.
 */
export function apiTicketToMockTicket(ticket: Ticket, fallback?: MockTicket | null): MockTicket {
  const status = toUiStatus(ticket.status);
  const eventTitle = pickFirstNonEmpty(
    ticket.event_title,
    ticket.event_title_cache,
    fallback?.eventTitle,
  );
  const venue = pickFirstNonEmpty(ticket.venue, ticket.venue_cache, fallback?.venue);
  const city = pickFirstNonEmpty(ticket.city, ticket.city_cache, fallback?.city);
  const dateStart = pickFirstNonEmpty(
    ticket.date_start,
    ticket.starts_at_cache,
    ticket.created_at,
    fallback?.dateStart,
  );
  const dateEnd = pickFirstNonEmpty(
    ticket.date_end,
    ticket.ends_at_cache,
    dateStart,
    fallback?.dateEnd,
  );
  const typeName = pickFirstNonEmpty(
    ticket.ticket_type_name,
    ticket.type_name_cache,
    fallback?.typeName,
  );
  const seatCombined = pickFirstNonEmpty(ticket.seat_label, ticket.seat_label_cache);
  const seatLabel = seatCombined || fallback?.seatLabel;
  const orderRef = pickFirstNonEmpty(
    ticket.order_reference,
    fallback?.orderRef,
  ) || `ORD-${String(ticket.id)}`;
  const countsForOverlap =
    ticket.counts_for_overlap !== undefined && ticket.counts_for_overlap !== null
      ? truthyBit(ticket.counts_for_overlap as boolean | number)
      : status === 'active';

  return {
    id: String(ticket.id),
    ticketCode: ticket.code != null && String(ticket.code).trim() ? String(ticket.code).trim() : undefined,
    eventId: String(ticket.event_id),
    eventTitle,
    venue,
    city,
    dateStart,
    dateEnd,
    status,
    typeName,
    seatLabel,
    orderRef,
    qrPayload: ticket.qr_payload ?? fallback?.qrPayload,
    signedQrPayload:
      ticket.signed_qr_payload != null && String(ticket.signed_qr_payload).trim()
        ? String(ticket.signed_qr_payload).trim()
        : fallback?.signedQrPayload,
    pricePaid: typeof ticket.price_paid === 'number' ? ticket.price_paid : Number(ticket.price_paid ?? 0),
    countsForOverlap,
    receivedAsGift:
      ticket.received_as_gift !== undefined && ticket.received_as_gift !== null
        ? truthyBit(ticket.received_as_gift)
        : fallback?.receivedAsGift,
    fromAuction:
      ticket.from_auction !== undefined && ticket.from_auction !== null
        ? truthyBit(ticket.from_auction)
        : fallback?.fromAuction,
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
