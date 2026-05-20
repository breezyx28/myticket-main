export type SeatStatus = 'available' | 'held' | 'booked';

export type SeatViewMode = 'blueprint' | 'raw';

export interface SeatPosition {
  x: number;
  y: number;
  z: number;
}

export interface SeatRecord {
  id: string;
  label: string;
  section: string;
  row: number;
  number: number;
  /** API `row_label` (e.g. A, B) for grid headers. */
  rowLabel?: string;
  ticketTypeId: string;
  status: SeatStatus;
  position: SeatPosition;
  /** Per-seat override from API `price_override`. */
  priceOverride?: number;
}

export interface SelectedSeat {
  seatId: string;
  label: string;
  section: string;
  ticketTypeId: string;
}

export interface SeatInventory {
  seats: SeatRecord[];
  total: number;
  available: number;
  held: number;
  booked: number;
}
