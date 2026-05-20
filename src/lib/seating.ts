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

/** Resolve lock `seat_ids` to UI records; synthesize placeholders when held seats are omitted from inventory. */
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
