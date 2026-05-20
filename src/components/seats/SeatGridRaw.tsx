import { cn } from '@/lib/utils';
import { isSeatSelectable, seatsByRows } from '@/lib/seating';
import type { SeatRecord } from '@/types/seating';

interface SeatGridRawProps {
  seats: SeatRecord[];
  selectedSeatIds: string[];
  highlightTicketTypeId: string;
  onToggleSeat: (seat: SeatRecord) => void;
}

export function SeatGridRaw({
  seats,
  selectedSeatIds,
  highlightTicketTypeId,
  onToggleSeat,
}: SeatGridRawProps) {
  const rows = seatsByRows(seats);

  return (
    <div className="rounded-2xl border border-ink-10 bg-white p-4">
      <div className="mb-4 rounded-xl bg-ink px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.13em] text-white">
        Stage
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const rowHeader = row.seats[0]?.rowLabel ?? `Row ${row.row}`;
          return (
            <div key={row.row} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-ink-40">{rowHeader}</span>
              <div className="flex flex-wrap gap-2">
                {row.seats.map((seat) => {
                  const selectable = isSeatSelectable(seat);
                  const selected = selectedSeatIds.includes(seat.id);
                  const highlighted = seat.ticketTypeId === highlightTicketTypeId;
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={!selectable}
                      title={seat.label}
                      onClick={() => onToggleSeat(seat)}
                      className={cn(
                        'h-8 min-w-10 rounded-lg border px-2 text-[11px] font-bold transition-colors',
                        selected && 'border-ink bg-ink text-white',
                        !selected &&
                          selectable &&
                          highlighted &&
                          'border-mint bg-mint/40 text-ink hover:bg-mint/70',
                        !selected &&
                          selectable &&
                          !highlighted &&
                          'border-ink-10 bg-ink-5/80 text-ink-40 hover:border-ink-20 hover:bg-ink-10 hover:text-ink-60',
                        !selected && seat.status === 'held' && 'cursor-not-allowed border-lemon bg-lemon/30 text-ink-60',
                        !selected &&
                          seat.status === 'booked' &&
                          'cursor-not-allowed border-ink-10 bg-ink-5 text-ink-40',
                      )}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
