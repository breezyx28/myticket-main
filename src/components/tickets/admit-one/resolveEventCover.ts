import type { Ticket } from '@/api/types/ticket';
import type { MockTicket } from '@/types/domain';
import { pickFirst } from '@/components/tickets/ticketDisplayUtils';

export function resolveEventSlug(ticket: MockTicket, apiTicket?: Ticket | null): string | null {
  const raw = apiTicket as Record<string, unknown> | undefined;
  return pickFirst(
    typeof raw?.event_slug === 'string' ? raw.event_slug : null,
    typeof raw?.public_slug === 'string' ? raw.public_slug : null,
    ticket.eventId && !/^\d+$/.test(ticket.eventId) ? ticket.eventId : null,
  );
}

export function pickCoverUrl(apiTicket?: Ticket | null): string | null {
  if (!apiTicket) return null;
  const raw = apiTicket as Record<string, unknown>;
  return pickFirst(
    typeof raw.event_cover_url === 'string' ? raw.event_cover_url : null,
    typeof raw.cover_image_url === 'string' ? raw.cover_image_url : null,
    typeof raw.event_image_url === 'string' ? raw.event_image_url : null,
    typeof raw.cover_url === 'string' ? raw.cover_url : null,
    typeof raw.cover_image === 'string' ? raw.cover_image : null,
  );
}
