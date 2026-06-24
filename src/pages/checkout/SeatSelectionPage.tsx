import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCreateSeatLockMutation,
  useExtendSeatLockMutation,
  useGetCurrentSeatLockQuery,
  useGetEventBySlugQuery,
  useGetEventSeatsQuery,
  useGetEventTicketTypesQuery,
} from '@/api/endpoints';
import type { Id } from '@/api/types/common';
import type { SeatLock } from '@/api/types/seat';
import { Button } from '@/components/ui/Button';
import { CheckoutAlertBanner } from '@/components/checkout/CheckoutAlertBanner';
import { CheckoutMainPanel, CheckoutShell } from '@/components/checkout/CheckoutShell';
import { CheckoutPageHeader } from '@/components/checkout/CheckoutPageHeader';
import { CheckoutSkeleton } from '@/components/checkout/CheckoutSkeleton';
import { SeatGridRaw } from '@/components/seats/SeatGridRaw';
import { SeatLegend } from '@/components/seats/SeatLegend';
import { mergeEventTicketTypes } from '@/lib/eventMappers';
import { apiSeatsToSeatRecords, ticketTypeRowHints, uiSeatIdToApi } from '@/lib/seatMappers';
import {
  filterSeatsForMapDisplay,
  getSeatInventoryStats,
  isSeatSelectable,
  seatRecordsFromIds,
  toSelectedSeat,
} from '@/lib/seating';
import { formatTicketRemainingLabel } from '@/lib/ticketTypeFromApi';
import { SEAT_LOCK_TTL_SECONDS, type CheckoutNavState } from '@/lib/checkoutNav';
import { useAuth } from '@/contexts/AuthContext';
import type { SeatRecord } from '@/types/seating';

const DEFAULT_LOCK_TTL_SECONDS = SEAT_LOCK_TTL_SECONDS;
const LOW_TIME_WARNING_SECONDS = 30;

type CheckoutSeatNavigationState = CheckoutNavState;

function formatCountdown(secondsLeft: number): string {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function applyLockToState(lock: SeatLock, setters: {
  setActiveLockId: (id: Id) => void;
  setLockExpiresAt: (at: string) => void;
  setSelectedTicketTypeId: (id: string) => void;
  setSelectedSeatIds: (ids: string[]) => void;
}) {
  setters.setActiveLockId(lock.id);
  setters.setLockExpiresAt(lock.expires_at);
  setters.setSelectedTicketTypeId(String(lock.ticket_type_id));
  setters.setSelectedSeatIds((lock.seat_ids ?? []).map(String));
}

export function SeatSelectionPage() {
  const { t } = useTranslation(['checkout', 'common']);
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

  const { data: ticketTypesList } = useGetEventTicketTypesQuery({ slug }, { skip: !slug });

  const event = useMemo(
    () => (detail ? mergeEventTicketTypes(detail, ticketTypesList) : null),
    [detail, ticketTypesList],
  );

  const isSeated = event?.layoutType === 'seated';
  const { data: seatMap, isFetching: seatsFetching, isError: seatsError } = useGetEventSeatsQuery(
    { slug },
    { skip: !slug || !isSeated },
  );
  const inventory = useMemo(() => apiSeatsToSeatRecords(seatMap?.seats), [seatMap]);

  const {
    data: currentLock,
    isFetching: currentLockFetching,
    isLoading: currentLockLoading,
  } = useGetCurrentSeatLockQuery({ slug }, { skip: !slug || !user || !isSeated });

  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeLockId, setActiveLockId] = useState<Id | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [createLock, { isLoading: creatingLock }] = useCreateSeatLockMutation();
  const [extendLock, { isLoading: extendingLock }] = useExtendSeatLockMutation();

  const lockData = currentLock && 'data' in currentLock ? currentLock.data : null;
  const waitingForLock = Boolean(user && isSeated && (currentLockLoading || currentLockFetching) && !hydrated);

  const ticketTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (!event) return map;
    for (const tt of event.ticketTypes) {
      map.set(String(tt.id), tt.name);
    }
    return map;
  }, [event]);

  const displaySeats = useMemo(
    () => filterSeatsForMapDisplay(inventory, selectedSeatIds),
    [inventory, selectedSeatIds],
  );

  const rowHints = useMemo(
    () => ticketTypeRowHints(inventory, ticketTypeNameById),
    [inventory, ticketTypeNameById],
  );

  useEffect(() => {
    if (!event || hydrated) return;
    if (user && (currentLockLoading || currentLockFetching)) return;

    if (lockData) {
      applyLockToState(lockData, {
        setActiveLockId,
        setLockExpiresAt,
        setSelectedTicketTypeId,
        setSelectedSeatIds,
      });
      setHydrated(true);
      return;
    }

    setSelectedTicketTypeId(incomingState.selectedTicketTypeId ?? event.ticketTypes[0]?.id ?? '');
    setSelectedSeatIds(incomingState.selectedSeats?.map((seat) => seat.seatId) ?? []);
    if (incomingState.lockId != null && !incomingState.relockNeeded) {
      setActiveLockId(incomingState.lockId);
    }
    setHydrated(true);
  }, [
    event,
    hydrated,
    user,
    currentLockLoading,
    currentLockFetching,
    lockData,
    incomingState.selectedTicketTypeId,
    incomingState.selectedSeats,
    incomingState.lockId,
    incomingState.relockNeeded,
  ]);

  useEffect(() => {
    if (!lockData?.expires_at) return;
    setLockExpiresAt(lockData.expires_at);
  }, [lockData?.expires_at, lockData?.id]);

  useEffect(() => {
    if (!event || !hydrated) return;
    if (selectedTicketTypeId) return;
    const first = event.ticketTypes[0]?.id;
    if (first) setSelectedTicketTypeId(first);
  }, [event, hydrated, selectedTicketTypeId]);

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
    [event, selectedTicketTypeId],
  );

  const selectedSeats = useMemo(
    () => seatRecordsFromIds(inventory, selectedSeatIds),
    [inventory, selectedSeatIds],
  );

  const seatsByType = useMemo(() => {
    const groups = new Map<string, SeatRecord[]>();
    for (const seat of selectedSeats) {
      const list = groups.get(seat.ticketTypeId) ?? [];
      list.push(seat);
      groups.set(seat.ticketTypeId, list);
    }
    return groups;
  }, [selectedSeats]);

  const seatStats = useMemo(() => getSeatInventoryStats(displaySeats), [displaySeats]);

  function toggleSeat(seat: SeatRecord) {
    if (!isSeatSelectable(seat, selectedSeatIds)) return;
    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
      return;
    }
    setSelectedSeatIds((prev) => [...prev, seat.id]);
  }

  async function continueToCheckout() {
    if (!event || selectedSeats.length < 1) return;
    setLockError(null);
    try {
      const lock = await createLock({
        slug,
        body: {
          // ponytail: API field is singular; backend locks each seat_id (mixed tiers allowed).
          ticket_type_id: uiSeatIdToApi(selectedSeats[0]!.ticketTypeId),
          seat_ids: selectedSeatIds.map(uiSeatIdToApi),
          ttl_seconds: DEFAULT_LOCK_TTL_SECONDS,
        },
      }).unwrap();
      const state: CheckoutSeatNavigationState = {
        selectedSeats: selectedSeats.map(toSelectedSeat),
        lockId: lock.id,
        checkoutStep: 2,
      };
      setActiveLockId(lock.id);
      setLockExpiresAt(lock.expires_at);
      navigate(`/checkout/${eventId}`, { state, replace: true });
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        t('lockError');
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

  if (eventLoading || (!event && !eventError) || waitingForLock) {
    return <CheckoutSkeleton />;
  }
  if (eventError || !event) {
    return <Navigate to="/events" replace />;
  }
  if (event.ticketsLeft === 0) {
    return <Navigate to={`/events/${event.id}`} replace />;
  }

  if (!isSeated) {
    return (
      <Navigate
        to={`/checkout/${event.id}`}
        replace
        state={{
          selectedTicketTypeId: incomingState.selectedTicketTypeId ?? event.ticketTypes[0]?.id,
          generalAdmissionQuantity: incomingState.generalAdmissionQuantity ?? 1,
          lockId: incomingState.lockId,
        }}
      />
    );
  }

  const lowTime = secondsLeft != null && secondsLeft <= LOW_TIME_WARNING_SECONDS;
  const continueDisabled = selectedSeats.length < 1 || creatingLock || !user;

  const loginReturnPath = `/checkout/${eventId}/seats`;

  return (
    <CheckoutShell>
      <CheckoutPageHeader
        backTo={`/events/${event.id}`}
        title={t('selectSeats')}
        subtitle={`${event.title} · ${t('selectSeatsSubtitle')}`}
      />

      <details className="mt-4 overflow-hidden rounded-2xl border border-ink-10/80 bg-white shadow-[0_8px_24px_-12px_rgba(26,26,26,0.08)]">
        <summary className="cursor-pointer px-4 py-3.5 text-[13px] font-semibold text-ink sm:px-5">
          {t('seatHoldTitle')}
        </summary>
        <div className="border-t border-ink-10 px-4 py-3 text-[12px] leading-relaxed text-ink-60 sm:px-5">
          <p>
            {t('seatHoldBody')}{' '}
            <Link to="/terms" className="font-semibold text-coral hover:underline">
              {t('terms')}
            </Link>{' '}
            for details.
          </p>
        </div>
      </details>

      {!user && (
        <CheckoutAlertBanner title={t('signInHoldSeats')}>
          {t('signInHoldBody')}{' '}
          <Link
            to="/login"
            state={{ from: { pathname: loginReturnPath } }}
            className="font-semibold text-coral hover:underline"
          >
            {t('signInLink')}
          </Link>{' '}
          {t('signInContinue')}
        </CheckoutAlertBanner>
      )}

      {incomingState.relockNeeded && (
        <CheckoutAlertBanner title={t('holdExpired')} variant="coral">
          {t('holdExpiredBanner')}
        </CheckoutAlertBanner>
      )}

      {secondsLeft != null && (
        <CheckoutAlertBanner
          title={
            secondsLeft > 0
              ? t('seatsHeldCountdown', { time: formatCountdown(secondsLeft) })
              : t('holdExpired')
          }
          variant={lowTime ? 'coral' : 'neutral'}
          action={
            secondsLeft > 0 && activeLockId != null ? (
              <Button
                variant="outline"
                size="sm"
                loading={extendingLock}
                onClick={() => void onExtend()}
              >
                {t('extendHold')}
              </Button>
            ) : undefined
          }
        >
          <span className="tabular-nums">
            {secondsLeft > 0 ? t('holdReserved') : t('selectAgain')}
          </span>
        </CheckoutAlertBanner>
      )}

      {lockError && (
        <CheckoutAlertBanner title={t('couldNotLock')} variant="coral">
          {lockError}
        </CheckoutAlertBanner>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <CheckoutMainPanel className="mt-0">
          <label className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-ink-60">{t('highlightTicketType')}</span>
            <select
              value={selectedTicketTypeId}
              onChange={(e) => setSelectedTicketTypeId(e.target.value)}
              className="w-full rounded-xl border border-ink-10 bg-white px-4 py-2.5 text-[14px]"
            >
              {event.ticketTypes.map((ticketType) => (
                <option key={ticketType.id} value={ticketType.id}>
                  {ticketType.name} — {ticketType.price} SAR (
                  {formatTicketRemainingLabel(ticketType.remaining)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-40">{t('highlightTicketTypeHint')}</p>
          </label>
          {rowHints.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-ink-40">
              {rowHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          )}

          <SeatLegend className="mt-4" />

          <div className="mt-4">
            {seatsFetching && inventory.length === 0 ? (
              <div className="space-y-3 py-12" aria-hidden>
                <div className="mx-auto h-4 w-32 animate-pulse rounded-lg bg-ink-10/80" />
                <div className="mx-auto h-48 w-full max-w-md animate-pulse rounded-2xl bg-ink-10/60" />
              </div>
            ) : !seatsFetching && displaySeats.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-semibold text-ink">{t('noSeatsAvailable')}</p>
                <p className="mt-2 text-[12px] text-ink-40">
                  {seatsError ? t('seatMapError') : t('allSeatsTaken')}
                </p>
                <Link
                  to={`/events/${event.id}`}
                  className="mt-4 inline-flex min-h-10 items-center text-[13px] font-semibold text-coral hover:underline"
                >
                  {t('backToEvent')}
                </Link>
              </div>
            ) : (
              <SeatGridRaw
                seats={displaySeats}
                selectedSeatIds={selectedSeatIds}
                highlightTicketTypeId={selectedTicketTypeId}
                onToggleSeat={toggleSeat}
              />
            )}
          </div>
        </CheckoutMainPanel>

        <aside className="lg:sticky lg:top-24">
          <article className="overflow-hidden rounded-[2rem] border border-ink-10 bg-white shadow-[0_24px_48px_-20px_rgba(26,26,26,0.12)]">
            <div className="border-b border-ink-10 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-40">{t('selection')}</p>
              <h2 className="mt-1 text-[17px] font-extrabold tracking-tight text-ink">
                {t('seatsSelected', { count: selectedSeats.length })}
              </h2>
              <p className="mt-1 text-[12px] text-ink-40">
                {selectedSeats.length > 0
                  ? seatsByType.size > 1
                    ? t('mixedTypeSelection', { count: selectedSeats.length })
                    : t('highlighting', { name: ticketTypeNameById.get(selectedSeats[0]!.ticketTypeId) ?? '—' })
                  : t('highlighting', { name: currentTicketType?.name ?? '—' })}
              </p>
            </div>

            <div className="divide-y divide-ink-10 px-6 py-2 text-[12px] text-ink-60">
              <div className="flex items-center justify-between py-2.5">
                <span>{t('availableOnMap')}</span>
                <span className="font-semibold tabular-nums text-ink">{seatStats.available}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span>{t('heldOnMap')}</span>
                <span className="font-semibold tabular-nums text-ink">{seatStats.held}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span>{t('bookedOnMap')}</span>
                <span className="font-semibold tabular-nums text-ink">{seatStats.booked}</span>
              </div>
            </div>

            <div className="border-t border-ink-10 px-6 py-4">
              {selectedSeats.length > 0 ? (
                <ul className="max-h-[220px] divide-y divide-ink-10 overflow-auto text-[12px] text-ink-60">
                  {[...seatsByType.entries()].map(([typeId, seats]) => (
                    <li key={typeId} className="py-2.5">
                      <p className="font-semibold text-ink">
                        {ticketTypeNameById.get(typeId) ?? typeId}{' '}
                        <span className="font-normal text-ink-40">({seats.length})</span>
                      </p>
                      <p className="mt-1 leading-relaxed">
                        {seats.map((seat) => seat.label).join(', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-ink-40">{t('chooseSeatsHint')}</p>
              )}

              <button
                type="button"
                onClick={() => setSelectedSeatIds([])}
                className="mt-3 inline-flex min-h-10 items-center text-[12px] font-semibold text-coral transition-colors hover:text-coral/80"
              >
                {t('clearSelection')}
              </button>

              <Button
                variant="dark"
                size="md"
                className="mt-4 w-full"
                loading={creatingLock}
                disabled={continueDisabled}
                onClick={continueToCheckout}
              >
                {t('continueCheckout')}
              </Button>
            </div>
          </article>
        </aside>
      </div>
    </CheckoutShell>
  );
}
