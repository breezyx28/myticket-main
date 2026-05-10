import type { SeatRecord } from '@/types/seating';

type SectionSlot = 'left-wing' | 'left' | 'center' | 'right' | 'right-wing';
type SectionTier = 'front' | 'mid' | 'rear' | 'balcony';

export interface BlueprintSection {
  id: string;
  label: string;
  tier: SectionTier;
  slot: SectionSlot;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  seatIds: string[];
  availableSeatIds: string[];
}

export interface BlueprintSeatPlacement {
  seat: SeatRecord;
  sectionId: string;
  sectionLabel: string;
  column: number;
  x: number;
  y: number;
  z: number;
}

export interface BlueprintLayout {
  sections: BlueprintSection[];
  seats: BlueprintSeatPlacement[];
}

const SECTION_TEMPLATE: Record<string, Omit<BlueprintSection, 'seatIds' | 'availableSeatIds'>> = {
  'front-left-wing': { id: 'front-left-wing', label: 'Front Left Wing', tier: 'front', slot: 'left-wing', centerX: -11.2, centerZ: 6.2, width: 2.9, depth: 2.7 },
  'front-left': { id: 'front-left', label: 'Front Left', tier: 'front', slot: 'left', centerX: -6.7, centerZ: 6.1, width: 3.8, depth: 2.8 },
  'front-center': { id: 'front-center', label: 'Front Center', tier: 'front', slot: 'center', centerX: 0, centerZ: 6.05, width: 6.1, depth: 2.8 },
  'front-right': { id: 'front-right', label: 'Front Right', tier: 'front', slot: 'right', centerX: 6.7, centerZ: 6.1, width: 3.8, depth: 2.8 },
  'front-right-wing': { id: 'front-right-wing', label: 'Front Right Wing', tier: 'front', slot: 'right-wing', centerX: 11.2, centerZ: 6.2, width: 2.9, depth: 2.7 },
  'mid-left-wing': { id: 'mid-left-wing', label: 'Mid Left Wing', tier: 'mid', slot: 'left-wing', centerX: -11.2, centerZ: 2.8, width: 2.9, depth: 3.1 },
  'mid-left': { id: 'mid-left', label: 'Mid Left', tier: 'mid', slot: 'left', centerX: -6.7, centerZ: 2.7, width: 3.8, depth: 3.2 },
  'mid-center': { id: 'mid-center', label: 'Mid Center', tier: 'mid', slot: 'center', centerX: 0, centerZ: 2.6, width: 6.1, depth: 3.3 },
  'mid-right': { id: 'mid-right', label: 'Mid Right', tier: 'mid', slot: 'right', centerX: 6.7, centerZ: 2.7, width: 3.8, depth: 3.2 },
  'mid-right-wing': { id: 'mid-right-wing', label: 'Mid Right Wing', tier: 'mid', slot: 'right-wing', centerX: 11.2, centerZ: 2.8, width: 2.9, depth: 3.1 },
  'rear-left-wing': { id: 'rear-left-wing', label: 'Rear Left Wing', tier: 'rear', slot: 'left-wing', centerX: -11.2, centerZ: -2.3, width: 2.9, depth: 4.2 },
  'rear-left': { id: 'rear-left', label: 'Rear Left', tier: 'rear', slot: 'left', centerX: -6.7, centerZ: -2.5, width: 3.8, depth: 4.6 },
  'rear-center': { id: 'rear-center', label: 'Rear Center', tier: 'rear', slot: 'center', centerX: 0, centerZ: -2.6, width: 6.1, depth: 4.8 },
  'rear-right': { id: 'rear-right', label: 'Rear Right', tier: 'rear', slot: 'right', centerX: 6.7, centerZ: -2.5, width: 3.8, depth: 4.6 },
  'rear-right-wing': { id: 'rear-right-wing', label: 'Rear Right Wing', tier: 'rear', slot: 'right-wing', centerX: 11.2, centerZ: -2.3, width: 2.9, depth: 4.2 },
  'balcony-left-wing': { id: 'balcony-left-wing', label: 'Balcony Left Wing', tier: 'balcony', slot: 'left-wing', centerX: -11.2, centerZ: -10, width: 2.9, depth: 2.8 },
  'balcony-left': { id: 'balcony-left', label: 'Balcony Left', tier: 'balcony', slot: 'left', centerX: -6.7, centerZ: -10.1, width: 3.8, depth: 2.9 },
  'balcony-center': { id: 'balcony-center', label: 'Balcony Center', tier: 'balcony', slot: 'center', centerX: 0, centerZ: -10.2, width: 6.1, depth: 3.1 },
  'balcony-right': { id: 'balcony-right', label: 'Balcony Right', tier: 'balcony', slot: 'right', centerX: 6.7, centerZ: -10.1, width: 3.8, depth: 2.9 },
  'balcony-right-wing': { id: 'balcony-right-wing', label: 'Balcony Right Wing', tier: 'balcony', slot: 'right-wing', centerX: 11.2, centerZ: -10, width: 2.9, depth: 2.8 },
};

function getSlotForSeat(seat: SeatRecord, maxNumber: number): SectionSlot {
  const ratio = maxNumber <= 1 ? 0 : (seat.number - 1) / (maxNumber - 1);
  if (ratio < 0.12) return 'left-wing';
  if (ratio < 0.34) return 'left';
  if (ratio < 0.66) return 'center';
  if (ratio < 0.88) return 'right';
  return 'right-wing';
}

function getTierForSeat(
  seat: SeatRecord,
  frontRowsEnd: number,
  midRowsEnd: number,
  balconyStartRow: number
): SectionTier {
  if (seat.row >= balconyStartRow) return 'balcony';
  if (seat.row <= frontRowsEnd) return 'front';
  if (seat.row <= midRowsEnd) return 'mid';
  return 'rear';
}

function sectionKeyFor(
  seat: SeatRecord,
  maxNumber: number,
  frontRowsEnd: number,
  midRowsEnd: number,
  balconyStartRow: number
) {
  const tier = getTierForSeat(seat, frontRowsEnd, midRowsEnd, balconyStartRow);
  const slot = getSlotForSeat(seat, maxNumber);
  return `${tier}-${slot}`;
}

export function buildBlueprintLayout(seats: SeatRecord[]): BlueprintLayout {
  if (seats.length === 0) {
    return { sections: [], seats: [] };
  }

  const maxRow = Math.max(...seats.map((s) => s.row));
  const maxNumber = Math.max(...seats.map((s) => s.number));
  const balconyRows = Math.max(3, Math.round(maxRow * 0.2));
  const balconyStartRow = Math.max(1, maxRow - balconyRows + 1);
  const nonBalconyRows = Math.max(1, balconyStartRow - 1);
  const frontRowsEnd = Math.max(2, Math.round(nonBalconyRows * 0.3));
  const midRowsEnd = Math.max(frontRowsEnd + 1, Math.round(nonBalconyRows * 0.65));

  const grouped = new Map<string, SeatRecord[]>();
  for (const seat of seats) {
    const key = sectionKeyFor(seat, maxNumber, frontRowsEnd, midRowsEnd, balconyStartRow);
    const list = grouped.get(key) ?? [];
    list.push(seat);
    grouped.set(key, list);
  }

  const sections: BlueprintSection[] = [];
  const placements: BlueprintSeatPlacement[] = [];

  for (const [key, sectionSeats] of grouped) {
    const template = SECTION_TEMPLATE[key];
    if (!template) continue;
    const seatIds = sectionSeats.map((s) => s.id);
    const availableSeatIds = sectionSeats.filter((s) => s.status === 'available').map((s) => s.id);
    const byRow = Array.from(new Set(sectionSeats.map((s) => s.row))).sort((a, b) => a - b);
    const byNumber = Array.from(new Set(sectionSeats.map((s) => s.number))).sort((a, b) => a - b);

    sections.push({ ...template, seatIds, availableSeatIds });

    sectionSeats.forEach((seat) => {
      const rowIndex = byRow.indexOf(seat.row);
      const colIndex = byNumber.indexOf(seat.number);
      const rowSpan = Math.max(1, byRow.length - 1);
      const colSpan = Math.max(1, byNumber.length - 1);
      const normalizedRow = rowIndex / rowSpan;
      const normalizedCol = colIndex / colSpan;
      const seatSpreadX = template.width * 0.58;
      const seatSpreadZ = template.depth * 0.64;
      const x = template.centerX - seatSpreadX / 2 + normalizedCol * seatSpreadX;
      const z = template.centerZ - seatSpreadZ / 2 + normalizedRow * seatSpreadZ;

      placements.push({
        seat,
        sectionId: template.id,
        sectionLabel: template.label,
        column: colIndex + 1,
        x,
        y: template.tier === 'balcony' ? 0.88 : 0.32,
        z,
      });
    });
  }

  return { sections, seats: placements };
}
