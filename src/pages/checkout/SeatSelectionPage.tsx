import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateSeatLockMutation,
  useExtendSeatLockMutation,
  useGetCurrentSeatLockQuery,
  useGetEventBySlugQuery,
  useGetEventSeatsQuery,
} from '@/api/endpoints';
import type { Id } from '@/api/types/common';
import { Button } from '@/components/ui/Button';
import { SeatGridRaw } from '@/components/seats/SeatGridRaw';
import { SeatLegend } from '@/components/seats/SeatLegend';
import { SeatScene3D } from '@/components/seats/SeatScene3D';
import { useAuth } from '@/contexts/AuthContext';
import { eventDetailToMockEvent } from '@/lib/eventMappers';
import { apiSeatsToSeatRecords, uiSeatIdToApi } from '@/lib/seatMappers';
import { getSeatInventoryStats, isSeatSelectable, toSelectedSeat } from '@/lib/seating';
import type { SeatRecord, SeatViewMode } from '@/types/seating';

const DEFAULT_LOCK_TTL_SECONDS = 180;
const LOW_TIME_WARNING_SECONDS = 30;

type CheckoutSeatNavigationState = {
  selectedSeats?: {
    seatId: string;
    label: string;
    section: string;
    ticketTypeId: string;
  }[];
  selectedTicketTypeId?: string;
  lockId?: Id | null;
};

function formatCountdown(secondsLeft: number): string {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SeatSelectionPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const incomingState = (location.state as CheckoutSeatNavigationState | null) ?? {};

  const slug = eventId ?? '';
  const {
    data: detail,
    isLoading: eventLoading,
    isError: eventError,
  } = useGetEventBySlugQuery({ slug }, { skip: !slug });

  const event = useMemo(
    () => (detail ? eventDetailToMockEvent(detail) : null),
    [detail]
  );

  const isSeated = event?.layoutType === 'seated';
  const { data: seatMap, isFetching: seatsFetching } = useGetEventSeatsQuery(
    { slug },
    { skip: !slug || !isSeated }
  );
  const inventory = useMemo(() => apiSeatsToSeatRecords(seatMap?.seats), [seatMap]);

  const { data: currentLock } = useGetCurrentSeatLockQuery(
    { slug },
    { skip: !slug || !user || !isSeated }
  );

  const [viewMode, setViewMode] = useState<SeatViewMode>('blueprint');
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdInfoOpen, setHoldInfoOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeLockId, setActiveLockId] = useState<Id | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [createLock, { isLoading: creatingLock }] = useCreateSeatLockMutation();
  const [extendLock, { isLoading: extendingLock }] = useExtendSeatLockMutation();

  useEffect(() => {
    if (!event || hydrated) return;
    const lockData = currentLock && 'data' in currentLock ? currentLock.data : null;
    if (lockData) {
      setActiveLockId(lockData.id);
      setLockExpiresAt(lockData.expires_at);
      setSelectedTicketTypeId(String(lockData.ticket_type_id));
      setSelectedSeatIds(lockData.seat_ids.map(String));
      setHydrated(true);
      return;
    }
    setSelectedTicketTypeId(incomingState.selectedTicketTypeId ?? event.ticketTypes[0]?.id ?? '');
    setSelectedSeatIds(incomingState.selectedSeats?.map((seat) => seat.seatId) ?? []);
    if (incomingState.lockId != null) setActiveLockId(incomingState.lockId);
    setHydrated(true);
  }, [
    event,
    currentLock,
    hydrated,
    incomingState.selectedTicketTypeId,
    incomingState.selectedSeats,
    incomingState.lockId,
  ]);

  useEffect(() => {
    if (!lockExpiresAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockExpiresAt]);

  const secondsLeft = useMemo(() => {
    if (!lockExpiresAt) return null;
    return Math.max(0, Math.floor((new Date(lockExpiresAt).getTime() - now) / 1000));
  }, [lockExpiresAt, now]);

  const currentTicketType = useMemo(
    () => event?.ticketTypes.find((tt) => tt.id === selectedTicketTypeId) ?? null,
    [event, selectedTicketTypeId]
  );

  const seatsForType = useMemo(
    () => inventory.filter((seat) => seat.ticketTypeId === selectedTicketTypeId),
    [inventory, selectedTicketTypeId]
  );

  const selectedSeats = useMemo(
    () => seatsForType.filter((seat) => selectedSeatIds.includes(seat.id)),
    [seatsForType, selectedSeatIds]
  );

  const seatStats = useMemo(() => getSeatInventoryStats(seatsForType), [seatsForType]);

  function toggleSeat(seat: SeatRecord) {
    if (!isSeatSelectable(seat)) return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]
    );
  }

  function selectSectionSeats(seatIds: string[]) {
    if (seatIds.length < 1) return;
    setSelectedSeatIds((prev) => {
      const merged = new Set(prev);
      for (const seatId of seatIds) merged.add(seatId);
      return Array.from(merged);
    });
  }

  async function continueToCheckout() {
    if (!event || !selectedTicketTypeId || selectedSeats.length < 1) return;
    setLockError(null);
    try {
      const lock = await createLock({
        slug,
        body: {
          ticket_type_id: uiSeatIdToApi(selectedTicketTypeId),
          seat_ids: selectedSeatIds.map(uiSeatIdToApi),
          ttl_seconds: DEFAULT_LOCK_TTL_SECONDS,
        },
      }).unwrap();
      const state: CheckoutSeatNavigationState = {
        selectedTicketTypeId,
        selectedSeats: selectedSeats.map(toSelectedSeat),
        lockId: lock.id,
      };
      setActiveLockId(lock.id);
      setLockExpiresAt(lock.expires_at);
      navigate(`/checkout/${eventId}`, { state });
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'Could not lock these seats. Someone may have just booked them — try refreshing.';
      setLockError(message);
    }
  }

  async function onExtend() {
    if (activeLockId == null) return;
    try {
      const lock = await extendLock({
        slug,
        lockId: activeLockId,
        body: { ttl_seconds: DEFAULT_LOCK_TTL_SECONDS },
      }).unwrap();
      setLockExpiresAt(lock.expires_at);
    } catch {
      // surface via the existing error block on next user action; no destructive state change.
    }
  }

  if (eventLoading || (!event && !eventError)) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }
  if (eventError || !event) {
    return <Navigate to="/events" replace />;
  }
  if (event.layoutType !== 'seated') {
    return <Navigate to={`/checkout/${event.id}`} replace />;
  }
  if (event.ticketsLeft <= 0) {
    return <Navigate to={`/events/${event.id}`} replace />;
  }

  const lowTime = secondsLeft != null && secondsLeft <= LOW_TIME_WARNING_SECONDS;
  const continueDisabled = selectedSeats.length < 1 || creatingLock || !user;

  return (
    <div className="bg-ink-5/40 pb-20 pt-10">
      <div className="mx-auto max-w-[1140px] px-6">
        <Link to={`/events/${event.id}`} className="text-[13px] font-semibold text-coral hover:underline">
          ← Back to event
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Select your seats</h1>
        <p className="mt-1 text-[14px] text-ink-60">
          {event.title} · Choose one or more seats, then continue to checkout.
        </p>

        <div className="mt-4 rounded-xl border border-ink-10 bg-white/90 px-4 py-3 text-[13px] text-ink-60 shadow-sm">
          <button
            type="button"
            onClick={() => setHoldInfoOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 text-left font-semibold text-ink"
          >
            <span>Seat hold &amp; checkout</span>
            <span className="text-ink-40">{holdInfoOpen ? '−' : '+'}</span>
          </button>
          {holdInfoOpen && (
            <div className="mt-2 space-y-2 border-t border-ink-10 pt-2 text-[12px] leading-relaxed text-ink-60">
              <p>
                Selected seats are held server-side while you complete payment. If you walk away, the hold expires
                and seats become available to others. See our{' '}
                <Link to="/terms" className="font-semibold text-coral hover:underline">
                  Terms
                </Link>{' '}
                for details.
              </p>
            </div>
          )}
        </div>

        {!user && (
          <div className="mt-4 rounded-xl border border-amber/40 bg-amber/10 p-4 text-[13px] text-ink">
            <p className="font-semibold">Sign in to hold seats</p>
            <p className="mt-1 text-ink-60">
              Seat holds are tied to your account.{' '}
              <Link
                to={`/login?next=${encodeURIComponent(`/checkout/${eventId}/seats`)}`}
                className="font-semibold text-coral hover:underline"
              >
                Log in or create an account
              </Link>{' '}
              to continue.
            </p>
          </div>
        )}

        {secondsLeft != null && (
          <div
            className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] ${
              lowTime
                ? 'border-coral/40 bg-coral/10 text-coral'
                : 'border-ink-10 bg-white text-ink-60'
            }`}
          >
            <span className="font-semibold">
              {secondsLeft > 0
                ? `Seats held · ${formatCountdown(secondsLeft)} remaining`
                : 'Hold expired — please re-select your seats.'}
            </span>
            {secondsLeft > 0 && activeLockId != null && (
              <button
                type="button"
                onClick={onExtend}
                disabled={extendingLock}
                className="rounded-full border border-current px-3 py-1 text-[12px] font-semibold disabled:opacity-50"
              >
                Extend hold
              </button>
            )}
          </div>
        )}

        {lockError && (
          <div className="mt-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] text-coral">
            {lockError}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-ink-10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="block min-w-[240px]">
                <span className="text-[12px] font-semibold text-ink-60">Ticket type / section</span>
                <select
                  value={selectedTicketTypeId}
                  onChange={(e) => {
                    setSelectedTicketTypeId(e.target.value);
                    setSelectedSeatIds([]);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-2.5 text-[14px]"
                >
                  {event.ticketTypes.map((ticketType) => (
                    <option key={ticketType.id} value={ticketType.id}>
                      {ticketType.name} — {ticketType.price} SAR ({ticketType.remaining} left)
                    </option>
                  ))}
                </select>
              </label>
              <div className="inline-flex rounded-full border border-ink-10 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('blueprint')}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold ${viewMode === 'blueprint' ? 'bg-ink text-white' : 'text-ink-60'}`}
                >
                  Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold ${viewMode === 'raw' ? 'bg-ink text-white' : 'text-ink-60'}`}
                >
                  Raw
                </button>
              </div>
            </div>

            <SeatLegend className="mt-4" />

            <div className="mt-4">
              {seatsFetching && inventory.length === 0 ? (
                <p className="py-12 text-center text-[12px] text-ink-40">Loading seat map…</p>
              ) : viewMode === 'blueprint' ? (
                <SeatScene3D
                  seats={seatsForType}
                  selectedSeatIds={selectedSeatIds}
                  onToggleSeat={toggleSeat}
                  onSelectSectionSeats={selectSectionSeats}
                />
              ) : (
                <SeatGridRaw seats={seatsForType} selectedSeatIds={selectedSeatIds} onToggleSeat={toggleSeat} />
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-ink-10 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-extrabold text-ink">Selection</h2>
            <p className="mt-1 text-[12px] text-ink-40">Section {currentTicketType?.name ?? '—'}</p>

            <div className="mt-4 space-y-2 rounded-xl bg-ink-5/70 p-3 text-[12px] text-ink-60">
              <div className="flex items-center justify-between">
                <span>Available</span>
                <span className="font-semibold text-ink">{seatStats.available}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Held</span>
                <span className="font-semibold text-ink">{seatStats.held}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Booked</span>
                <span className="font-semibold text-ink">{seatStats.booked}</span>
              </div>
            </div>

            <p className="mt-4 text-[12px] font-semibold text-ink">
              {selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'} selected
            </p>
            {selectedSeats.length > 0 ? (
              <ul className="mt-2 max-h-[220px] space-y-1 overflow-auto text-[12px] text-ink-60">
                {selectedSeats.map((seat) => (
                  <li key={seat.id} className="rounded-lg border border-ink-10 px-2 py-1.5">
                    {seat.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-ink-40">Choose seats from the map to continue.</p>
            )}

            <button
              type="button"
              onClick={() => setSelectedSeatIds([])}
              className="mt-3 text-[12px] font-semibold text-coral hover:underline"
            >
              Clear selection
            </button>

            <Button
              variant="dark"
              size="md"
              className="mt-4 w-full"
              loading={creatingLock}
              disabled={continueDisabled}
              onClick={continueToCheckout}
            >
              Continue to checkout
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
