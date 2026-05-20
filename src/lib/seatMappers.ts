import type { Id } from '@/api/types/common';
import type { SeatMap as ApiSeatMap, SeatRecord as ApiSeatRecord } from '@/api/types/event';
import { priceFromTicketApi } from '@/lib/ticketTypeFromApi';
import type { SeatPosition, SeatRecord, SeatStatus } from '@/types/seating';

function num(v: unknown, fallback = NaN): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toUiStatus(seat: ApiSeatRecord): SeatStatus {
  if (seat.is_locked === true) return 'held';
  const raw = String(seat.status ?? 'available').toLowerCase();
  if (raw === 'held' || raw === 'booked') return raw;
  return 'available';
}

function derivePosition(row: number, number: number, ticketTypeIdx: number): SeatPosition {
  return {
    x: (number - 5.5) * 1.1 + ticketTypeIdx * 0.01,
    y: 0.3,
    z: row * -1.15,
  };
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
 * Project API `SeatMap.seats` onto the UI `SeatRecord` shape used by
 * [`SeatGridRaw`](src/components/seats/SeatGridRaw.tsx). Uses `row_index`,
 * `col_index`, and `row_label` from the main API when present.
 */
export function apiSeatsToSeatRecords(seats: ApiSeatRecord[] | undefined): SeatRecord[] {
  if (!seats?.length) return [];

  const typeOrder = new Map<string, number>();
  let typeIdx = 0;
  for (const seat of seats) {
    const key = String(seat.ticket_type_id);
    if (!typeOrder.has(key)) {
      typeOrder.set(key, typeIdx);
      typeIdx += 1;
    }
  }

  return seats.map((seat) => {
    const r = seat as ApiSeatRecord & Record<string, unknown>;
    const rowRaw = num(r.row_index, NaN);
    const rowFallback = num(r.row, NaN);
    const numberRaw = num(r.col_index, NaN);
    const numberFallback = num(r.seat_number ?? r.number, NaN);
    const row = Number.isFinite(rowRaw) ? rowRaw : Number.isFinite(rowFallback) ? rowFallback : 1;
    const number = Number.isFinite(numberRaw) ? numberRaw : Number.isFinite(numberFallback) ? numberFallback : 1;
    const rowLabel =
      typeof r.row_label === 'string' && r.row_label.trim() !== '' ? r.row_label.trim() : undefined;
    const section = String(r.section ?? rowLabel ?? 'Main');
    const ticketTypeId = String(seat.ticket_type_id);
    const tIdx = typeOrder.get(ticketTypeId) ?? 0;

    let position: SeatPosition;
    const px = num(r.position_x ?? r.position?.x, NaN);
    const py = num(r.position_y ?? r.position?.y, NaN);
    const pz = num(r.position_z ?? r.position?.z, NaN);
    if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) {
      position = { x: px, y: py, z: pz };
    } else if (seat.position) {
      position = seat.position;
    } else {
      position = derivePosition(row, number, tIdx);
    }

    const priceOverride =
      r.price_override != null && String(r.price_override).trim() !== ''
        ? priceFromTicketApi(r.price_override)
        : undefined;

    return {
      id: String(seat.id),
      label: seat.label,
      section,
      row,
      number,
      ...(rowLabel ? { rowLabel } : {}),
      ticketTypeId,
      status: toUiStatus(seat),
      position,
      ...(priceOverride !== undefined && Number.isFinite(priceOverride)
        ? { priceOverride }
        : {}),
    };
  });
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

/** Row labels per ticket type for seat-picker hints (e.g. "VIP — rows A–B"). */
export function ticketTypeRowHints(
  seats: SeatRecord[],
  ticketTypeNameById: Map<string, string>,
): string[] {
  const byType = new Map<string, Set<string>>();
  for (const seat of seats) {
    const label = seat.rowLabel ?? String.fromCharCode(64 + seat.row);
    const set = byType.get(seat.ticketTypeId) ?? new Set<string>();
    set.add(label);
    byType.set(seat.ticketTypeId, set);
  }
  const lines: string[] = [];
  for (const [typeId, labels] of byType) {
    const name = ticketTypeNameById.get(typeId) ?? 'Tickets';
    const sorted = Array.from(labels).sort();
    const range =
      sorted.length > 1 ? `rows ${sorted[0]}–${sorted[sorted.length - 1]}` : `row ${sorted[0] ?? '—'}`;
    lines.push(`${name} — ${range}`);
  }
  return lines;
}
