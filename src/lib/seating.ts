import type { SeatInventory, SeatRecord, SeatStatus } from '@/types/seating';

export function getSeatStatusColor(status: SeatStatus, selected: boolean) {
  if (selected) return '#0D0D0D';
  if (status === 'available') return '#4DFFC3';
  if (status === 'held') return '#F5E642';
  return '#D2D6DB';
}

export function isSeatSelectable(seat: SeatRecord) {
  return seat.status === 'available';
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
