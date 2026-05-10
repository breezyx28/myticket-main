import { cn } from '@/lib/utils';
import { isSeatSelectable, seatsByRows } from '@/lib/seating';
import type { SeatRecord } from '@/types/seating';

interface SeatGridRawProps {
  seats: SeatRecord[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatRecord) => void;
}

export function SeatGridRaw({ seats, selectedSeatIds, onToggleSeat }: SeatGridRawProps) {
  const rows = seatsByRows(seats);

  return (
    <div className="rounded-2xl border border-ink-10 bg-white p-4">
      <div className="mb-4 rounded-xl bg-ink px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.13em] text-white">
        Stage
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.row} className="flex items-center gap-2">
            <span className="w-12 text-[11px] font-semibold text-ink-40">Row {row.row}</span>
            <div className="flex flex-wrap gap-2">
              {row.seats.map((seat) => {
                const selectable = isSeatSelectable(seat);
                const selected = selectedSeatIds.includes(seat.id);
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={!selectable}
                    onClick={() => onToggleSeat(seat)}
                    className={cn(
                      'h-8 min-w-10 rounded-lg border px-2 text-[11px] font-bold transition-colors',
                      selected && 'border-ink bg-ink text-white',
                      !selected && selectable && 'border-mint bg-mint/40 text-ink hover:bg-mint/70',
                      !selected && seat.status === 'held' && 'cursor-not-allowed border-lemon bg-lemon/30 text-ink-60',
                      !selected && seat.status === 'booked' && 'cursor-not-allowed border-ink-10 bg-ink-5 text-ink-40'
                    )}
                  >
                    {seat.number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
