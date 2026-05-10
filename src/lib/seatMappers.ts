import type { Id } from '@/api/types/common';
import type { SeatMap as ApiSeatMap, SeatRecord as ApiSeatRecord } from '@/api/types/event';
import type { SeatPosition, SeatRecord, SeatStatus } from '@/types/seating';

const SEATS_PER_ROW = 8;

function toUiStatus(raw: string | undefined): SeatStatus {
  return raw === 'held' || raw === 'booked' ? raw : 'available';
}

/**
 * Convert a UI seat id (string) back to the API's `Id` shape so calls
 * to the seat-lock endpoints round-trip cleanly. Numeric strings round-
 * trip as numbers; anything else is sent verbatim.
 */
export function uiSeatIdToApi(id: string): Id {
  const trimmed = id.trim();
  const n = Number(trimmed);
  return Number.isFinite(n) && String(n) === trimmed ? n : id;
}

/**
 * Project the API `SeatMap.seats` onto the legacy UI `SeatRecord` shape
 * the seat picker components were built against. When the backend omits
 * `section`, `row`, `number`, or `position`, we synthesize a deterministic
 * grid grouped by `ticket_type_id` so [`SeatScene3D`](src/components/seats/SeatScene3D.tsx)
 * and [`SeatGridRaw`](src/components/seats/SeatGridRaw.tsx) keep rendering
 * something coherent in mock environments.
 */
export function apiSeatsToSeatRecords(seats: ApiSeatRecord[] | undefined): SeatRecord[] {
  if (!seats?.length) return [];

  const byType = new Map<string, ApiSeatRecord[]>();
  for (const seat of seats) {
    const key = String(seat.ticket_type_id);
    const arr = byType.get(key) ?? [];
    arr.push(seat);
    byType.set(key, arr);
  }

  const out: SeatRecord[] = [];
  let typeIdx = 0;
  for (const [, list] of byType) {
    const fallbackSection = String.fromCharCode(65 + typeIdx);
    list.forEach((seat, idx) => {
      const rowRaw = seat.row != null ? Number(seat.row) : Math.floor(idx / SEATS_PER_ROW) + 1;
      const numberRaw = seat.number != null ? Number(seat.number) : (idx % SEATS_PER_ROW) + 1;
      const row = Number.isFinite(rowRaw) ? rowRaw : Math.floor(idx / SEATS_PER_ROW) + 1;
      const number = Number.isFinite(numberRaw) ? numberRaw : (idx % SEATS_PER_ROW) + 1;
      const position: SeatPosition = seat.position ?? {
        x: (number - (SEATS_PER_ROW + 1) / 2) * 1.1 + typeIdx * 10,
        y: 0.3,
        z: row * -1.15,
      };
      out.push({
        id: String(seat.id),
        label: seat.label,
        section: String(seat.section ?? fallbackSection),
        row,
        number,
        ticketTypeId: String(seat.ticket_type_id),
        status: toUiStatus(seat.status),
        position,
      });
    });
    typeIdx += 1;
  }
  return out;
}

/** Convenience adapter that also forwards the aggregate counts on `SeatMap`. */
export function apiSeatMapToInventory(map: ApiSeatMap | undefined) {
  return {
    seats: apiSeatsToSeatRecords(map?.seats),
    total: map?.total ?? 0,
    available: map?.available ?? 0,
    held: map?.held ?? 0,
    booked: map?.booked ?? 0,
  };
}
