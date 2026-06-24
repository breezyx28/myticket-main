import type { SeatInventory, SeatRecord, SeatStatus } from '@/types/seating';

export function getSeatStatusColor(status: SeatStatus, selected: boolean) {
  if (selected) return '#0D0D0D';
  if (status === 'available') return '#4DFFC3';
  if (status === 'held') return '#F5E642';
  return '#D2D6DB';
}

export function isSeatSelectable(seat: SeatRecord, selectedSeatIds?: string[]) {
  if (seat.status === 'available') return true;
  if (selectedSeatIds?.includes(seat.id)) return true;
  return false;
}

/** Map shows available seats plus the caller's current selection (e.g. active lock). */
export function filterSeatsForMapDisplay(seats: SeatRecord[], selectedSeatIds: string[]): SeatRecord[] {
  return seats.filter((s) => s.status === 'available' || selectedSeatIds.includes(s.id));
}

/** Resolve seat ids to inventory rows (mixed ticket types). */
export function seatRecordsFromIds(inventory: SeatRecord[], seatIds: string[]): SeatRecord[] {
  const byId = new Map(inventory.map((s) => [s.id, s]));
  return seatIds.map((id) => byId.get(id)).filter((s): s is SeatRecord => s != null);
}

/** @deprecated Prefer `seatRecordsFromIds` for mixed-type picks. */
export function seatRecordsFromLockIds(
  inventory: SeatRecord[],
  seatIds: string[],
  ticketTypeId: string,
): SeatRecord[] {
  const byId = new Map(inventory.map((s) => [s.id, s]));
  return seatIds.map((id) => {
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      id,
      label: `Seat ${id}`,
      section: 'Main',
      row: 0,
      number: 0,
      ticketTypeId,
      status: 'held',
      position: { x: 0, y: 0, z: 0 },
    };
  });
}

export function getSeatInventoryStats(seats: SeatRecord[]): Omit<SeatInventory, 'seats'> {
  const total = seats.length;
  const available = seats.filter((s) => s.status === 'available').length;
  const held = seats.filter((s) => s.status === 'held').length;
  const booked = total - available - held;
  return { total, available, held, booked };
}

export function toSelectedSeat(seat: SeatRecord) {
  return {
    seatId: seat.id,
    label: seat.label,
    section: seat.section,
    ticketTypeId: seat.ticketTypeId,
  };
}

/** Count seats per ticket type for `POST /orders`. */
export function ticketQuantitiesFromSeats(
  seats: { ticketTypeId: string }[],
  toApiId: (id: string) => string | number,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const seat of seats) {
    const key = String(toApiId(seat.ticketTypeId));
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

if (import.meta.env.DEV) {
  const q = ticketQuantitiesFromSeats(
    [{ ticketTypeId: '1' }, { ticketTypeId: '1' }, { ticketTypeId: '2' }],
    (id) => id,
  );
  if (q['1'] !== 2 || q['2'] !== 1) {
    console.warn('[seating] ticketQuantitiesFromSeats self-check failed:', q);
  }
}

export function seatsByRows(seats: SeatRecord[]) {
  const byRow = new Map<number, SeatRecord[]>();
  for (const seat of seats) {
    const rowSeats = byRow.get(seat.row) ?? [];
    rowSeats.push(seat);
    byRow.set(seat.row, rowSeats);
  }
  return Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([row, rowSeats]) => ({
      row,
      seats: rowSeats.sort((a, b) => a.number - b.number),
    }));
}
