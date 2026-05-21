import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCheckTicketOverlapMutation,
  useConfirmOrderPaymentMutation,
  useCreateOrderMutation,
  useCreateSeatLockMutation,
  useGetCurrentSeatLockQuery,
  useGetEventBySlugQuery,
  useGetEventSeatsQuery,
  useGetEventTicketTypesQuery,
  useListSavedCardsQuery,
} from '@/api/endpoints';
import type { Id } from '@/api/types/common';
import type {
  ConfirmOrderPaymentRequest,
  CreateOrderRequest,
  Order,
} from '@/api/types/order';
import type { ConfirmPaymentTicket } from '@/api/types/ticket';
import { CheckoutSuccessTickets } from '@/components/tickets/CheckoutSuccessTickets';
import type { SavedCard } from '@/api/types/savedCard';
import type { SeatLockRequest } from '@/api/types/seat';
import { Button } from '@/components/ui/Button';
import { PaymentMethodCard } from '@/components/checkout/PaymentMethodCard';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { mergeEventTicketTypes } from '@/lib/eventMappers';
import { apiSeatsToSeatRecords, uiSeatIdToApi } from '@/lib/seatMappers';
import { isSeatSelectable, seatRecordsFromLockIds, toSelectedSeat } from '@/lib/seating';
import {
  brandToMethod,
  CARD_PAYMENT_METHODS,
  formatCardBrand,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  formatSavedCardExpiry,
  type PaymentFormState,
  validatePaymentForm,
} from '@/lib/cardPayment';
import { cn } from '@/lib/utils';
import type { SelectedSeat } from '@/types/seating';

type Step = 1 | 2 | 3;
type CheckoutLocationState = {
  selectedSeats?: SelectedSeat[];
  selectedTicketTypeId?: string;
  lockId?: Id | null;
  /** GA / free-layout quantity (from event detail or checkout step 1). */
  generalAdmissionQuantity?: number;
};

type ApiError = { data?: { message?: string; errors?: Record<string, string[]> }; status?: number };

function readApiErrorMessage(err: unknown): string | null {
  const apiErr = err as ApiError | undefined;
  if (apiErr?.data?.message) return apiErr.data.message;
  const fieldErrors = apiErr?.data?.errors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).find((arr) => arr?.length)?.[0];
    if (first) return first;
  }
  return null;
}

const FREE_LOCK_TTL_SECONDS = 180;

export function CheckoutPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const locationState = (location.state as CheckoutLocationState | null) ?? {};
  const slug = eventId ?? '';

  const {
    data: detail,
    isLoading: eventLoading,
    isError: eventError,
  } = useGetEventBySlugQuery({ slug }, { skip: !slug });

  const { data: ticketTypesList } = useGetEventTicketTypesQuery({ slug }, { skip: !slug });

  const event = useMemo(
    () => (detail ? mergeEventTicketTypes(detail, ticketTypesList) : null),
    [detail, ticketTypesList]
  );

  const [step, setStep] = useState<Step>(1);
  const [ticketTypeId, setTicketTypeId] = useState<string>('');
  const [qtyInput, setQtyInput] = useState(1);
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [overlapDismissed, setOverlapDismissed] = useState(false);
  const [overlapConflictTitle, setOverlapConflictTitle] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderRef: string;
    tickets: ConfirmPaymentTicket[];
  } | null>(null);
  const [payFailOpen, setPayFailOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    method: 'visa',
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    saveCard: false,
  });
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<Id | null>(null);
  const [savedCardAutoSelected, setSavedCardAutoSelected] = useState(false);

  const stateLockId = locationState.lockId ?? null;

  const [createOrder, { isLoading: creatingOrder }] = useCreateOrderMutation();
  const [confirmOrderPayment, { isLoading: confirmingPayment }] = useConfirmOrderPaymentMutation();
  const [checkOverlap, { isLoading: checkingOverlap }] = useCheckTicketOverlapMutation();
  const payLoading = creatingOrder || confirmingPayment || checkingOverlap;

  const {
    data: savedCardsRaw,
    isLoading: savedCardsLoading,
    isError: savedCardsError,
  } = useListSavedCardsQuery(undefined, { skip: !user });

  const savedCards: SavedCard[] = useMemo(() => {
    if (!savedCardsRaw) return [];
    if (Array.isArray(savedCardsRaw)) return savedCardsRaw;
    return savedCardsRaw.data ?? [];
  }, [savedCardsRaw]);

  const selectedSavedCard = useMemo(
    () => savedCards.find((card) => String(card.id) === String(selectedSavedCardId)) ?? null,
    [savedCards, selectedSavedCardId]
  );

  useEffect(() => {
    if (savedCardAutoSelected || savedCards.length === 0) return;
    const fallback = savedCards.find((card) => card.is_default) ?? savedCards[0]!;
    setSelectedSavedCardId(fallback.id);
    setSavedCardAutoSelected(true);
  }, [savedCardAutoSelected, savedCards]);

  useEffect(() => {
    if (!selectedSavedCard) return;
    const brand = brandToMethod(selectedSavedCard.brand);
    setPaymentForm((prev) => (prev.method === brand ? prev : { ...prev, method: brand }));
  }, [selectedSavedCard]);

  useEffect(() => {
    if (event && event.ticketTypes[0]) {
      setTicketTypeId(locationState.selectedTicketTypeId ?? event.ticketTypes[0].id);
    }
  }, [event, locationState.selectedTicketTypeId]);

  useEffect(() => {
    const g = locationState.generalAdmissionQuantity;
    if (typeof g === 'number' && g > 0) setQtyInput(g);
  }, [locationState.generalAdmissionQuantity]);

  useEffect(() => {
    if (event?.layoutType === 'seated' && step === 1) {
      setStep(2);
    }
  }, [event, step]);

  const {
    data: currentLockEnvelope,
    isFetching: currentLockFetching,
    isLoading: currentLockLoading,
  } = useGetCurrentSeatLockQuery({ slug }, { skip: !slug || !user });

  const serverLock = useMemo(() => {
    if (currentLockEnvelope && 'data' in currentLockEnvelope) return currentLockEnvelope.data;
    return null;
  }, [currentLockEnvelope]);

  const serverLockId = serverLock?.id ?? null;

  const lockId = useMemo(() => stateLockId ?? serverLockId, [stateLockId, serverLockId]);

  const { data: seatedSeatMap } = useGetEventSeatsQuery(
    { slug },
    { skip: !slug || event?.layoutType !== 'seated' },
  );

  const seatedInventory = useMemo(() => apiSeatsToSeatRecords(seatedSeatMap?.seats), [seatedSeatMap]);

  const selectedSeats = useMemo(() => {
    const fromState = locationState.selectedSeats ?? [];
    if (fromState.length > 0) return fromState;
    if (!serverLock || event?.layoutType !== 'seated') return fromState;
    const typeId = String(serverLock.ticket_type_id);
    return seatRecordsFromLockIds(
      seatedInventory,
      (serverLock.seat_ids ?? []).map(String),
      typeId,
    ).map(toSelectedSeat);
  }, [locationState.selectedSeats, serverLock, event?.layoutType, seatedInventory]);

  const { data: freeSeatMap, isFetching: freeSeatsFetching } = useGetEventSeatsQuery(
    { slug },
    { skip: !slug || event?.layoutType !== 'free' || lockId != null },
  );

  const [createFreeSeatLock, { isLoading: acquiringFreeLock }] = useCreateSeatLockMutation();
  const [freeLockError, setFreeLockError] = useState<string | null>(null);
  const [freeLockRetry, setFreeLockRetry] = useState(0);
  const freeLockInFlightRef = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    if (lockId != null) freeLockInFlightRef.current = false;
  }, [lockId]);

  useLayoutEffect(() => {
    if (event?.layoutType !== 'free' || !user || !slug) return;
    if (lockId != null) return;
    if (freeLockError != null) return;
    if (currentLockFetching) return;
    if (freeSeatsFetching) return;
    if (!ticketTypeId) return;
    if (freeLockInFlightRef.current) return;

    const body: SeatLockRequest = {
      ticket_type_id: uiSeatIdToApi(ticketTypeId),
      ttl_seconds: FREE_LOCK_TTL_SECONDS,
    };
    const inv = apiSeatsToSeatRecords(freeSeatMap?.seats);
    const firstSeat = inv.find(
      (s) => String(s.ticketTypeId) === String(ticketTypeId) && isSeatSelectable(s),
    );
    if (firstSeat) body.seat_ids = [uiSeatIdToApi(firstSeat.id)];

    freeLockInFlightRef.current = true;
    void createFreeSeatLock({ slug, body })
      .unwrap()
      .then((lock) => {
        const prev = (locationRef.current.state as CheckoutLocationState | null) ?? {};
        navigate(`/checkout/${slug}`, {
          replace: true,
          state: {
            ...prev,
            lockId: lock.id,
            selectedTicketTypeId: ticketTypeId,
            generalAdmissionQuantity: Math.min(20, Math.max(1, Math.floor(qtyInput))),
          },
        });
      })
      .catch((err) => {
        setFreeLockError(readApiErrorMessage(err) ?? 'Could not start your ticket hold.');
        freeLockInFlightRef.current = false;
      });
  }, [
    event?.layoutType,
    user,
    slug,
    lockId,
    freeLockError,
    currentLockFetching,
    freeSeatsFetching,
    ticketTypeId,
    freeSeatMap?.seats,
    createFreeSeatLock,
    navigate,
    qtyInput,
    freeLockRetry,
  ]);

  const seatedTicketTypeId = selectedSeats[0]?.ticketTypeId;
  const effectiveTicketTypeId =
    event?.layoutType === 'seated' ? seatedTicketTypeId ?? ticketTypeId : ticketTypeId;
  const qty = event?.layoutType === 'seated' ? selectedSeats.length : qtyInput;

  const selectedType = event?.ticketTypes.find((t) => t.id === effectiveTicketTypeId);
  const unitPrice = selectedType?.price ?? 0;
  const subtotal = unitPrice * qty;
  const fees = Math.round(subtotal * 0.05);
  const total = subtotal + fees;
  const selectedMethodConfig = useMemo(
    () => CARD_PAYMENT_METHODS.find((method) => method.id === paymentForm.method) ?? CARD_PAYMENT_METHODS[0]!,
    [paymentForm.method]
  );
  const paymentValidation = useMemo(() => validatePaymentForm(paymentForm), [paymentForm]);
  const usingSavedCard = selectedSavedCardId !== null;
  const canSubmitPayment = (usingSavedCard || paymentValidation.isValid) && !payLoading && !!user;

  async function handlePay() {
    if (!event || !selectedType || !detail) return;
    setPaymentTouched(true);
    setPaymentErrorMessage(null);
    if (!usingSavedCard && !paymentValidation.isValid) return;
    if (!user) {
      setPaymentErrorMessage('Please sign in to complete your purchase.');
      return;
    }
    if (lockId == null) {
      if (event.layoutType === 'seated') {
        setPaymentErrorMessage('Your seat hold is missing or expired. Return to seat selection to continue.');
        navigate(`/checkout/${event.id}/seats`, { state: locationState });
      } else {
        setPaymentErrorMessage('Your ticket hold is not ready yet. Wait a moment and try again.');
      }
      return;
    }
    if (!overlapDismissed) {
      try {
        const overlap = await checkOverlap({
          event_id: detail.id,
          ticket_type_id: uiSeatIdToApi(selectedType.id),
          event_start: event.dateStart,
          event_end: event.dateEnd,
        }).unwrap();
        if (overlap.has_overlap) {
          setOverlapConflictTitle(overlap.conflicts[0]?.event_title ?? null);
          setOverlapOpen(true);
          return;
        }
      } catch {
        /* If the overlap check fails, allow checkout to proceed; the order create call is the source of truth. */
      }
    }
    await completePurchase();
  }

  async function completePurchase() {
    if (!event || !selectedType || !detail) return;
    if (lockId == null) {
      if (event.layoutType === 'seated') {
        setPaymentErrorMessage('Your seat hold is missing or expired. Return to seat selection to continue.');
        navigate(`/checkout/${event.id}/seats`, { replace: false, state: locationState });
      } else {
        setPaymentErrorMessage('Your ticket hold is not ready yet. Wait a moment and try again.');
      }
      return;
    }
    setOverlapOpen(false);
    setOverlapDismissed(true);
    setPaymentErrorMessage(null);

    const typeIdKey = String(uiSeatIdToApi(selectedType.id));
    const ticket_type_quantities: CreateOrderRequest['ticket_type_quantities'] = {
      [typeIdKey]: qty,
    };
    const orderBody: CreateOrderRequest = {
      event_id: detail.id,
      lock_id: lockId,
      ticket_type_quantities,
      payment_method: paymentForm.method,
    };
    if (selectedSavedCardId !== null) {
      orderBody.saved_card_id = selectedSavedCardId;
    }

    let order: Order;
    try {
      order = await createOrder(orderBody).unwrap();
    } catch (err) {
      const message = readApiErrorMessage(err) ?? 'We could not create your order. Please try again.';
      setPaymentErrorMessage(message);
      setPayFailOpen(true);
      return;
    }

    const orderId = order.id ?? (order as { order_id?: Id }).order_id;
    if (orderId == null) {
      setPaymentErrorMessage(
        'The server returned an order without an id, so payment could not continue. Please try again or contact support.',
      );
      setPayFailOpen(true);
      return;
    }

    try {
      const confirmBody: ConfirmOrderPaymentRequest = {};
      if (order.payment_intent_id) {
        confirmBody.payment_intent_id = order.payment_intent_id;
      }
      if (selectedSavedCardId !== null) {
        confirmBody.saved_card_id = selectedSavedCardId;
      }
      if (paymentForm.saveCard && !usingSavedCard) {
        confirmBody.save_card = true;
      }
      const confirmed = await confirmOrderPayment({ id: orderId, body: confirmBody }).unwrap();
      const orderRef =
        confirmed.reference ?? order.reference ?? `ORD-${String(orderId)}`;
      setSuccess({
        orderRef,
        tickets: confirmed.tickets ?? [],
      });
      pushNotification({
        kind: 'order',
        title: 'Order confirmed',
        body: `${event.title} · ${orderRef} · ${qty} ticket${qty === 1 ? '' : 's'}`,
        href: `/my-tickets`,
      });
      return;
    } catch (err) {
      const message =
        readApiErrorMessage(err) ?? 'Payment was declined or interrupted. Seat holds will release shortly.';
      setPaymentErrorMessage(message);
      setPayFailOpen(true);
      return;
    }

  }

  function onPaymentFieldChange(
    field: keyof Pick<PaymentFormState, 'cardholder' | 'cardNumber' | 'expiry' | 'cvv'>,
    value: string
  ) {
    setPaymentForm((prev) => {
      if (field === 'cardNumber') return { ...prev, cardNumber: formatCardNumber(value, prev.method) };
      if (field === 'expiry') return { ...prev, expiry: formatExpiry(value) };
      if (field === 'cvv') return { ...prev, cvv: formatCvv(value) };
      return { ...prev, cardholder: value };
    });
  }

  if (eventLoading || (!event && !eventError)) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }
  if (eventError || !event || event.ticketsLeft === 0) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  const needsFreeTicketLock = event.layoutType === 'free' && !!user && lockId == null;
  if (needsFreeTicketLock) {
    if (freeLockError != null && !acquiringFreeLock) {
      return (
        <div className="bg-ink-5/40 pb-20 pt-10">
          <div className="mx-auto max-w-lg px-6">
            <Link to={`/events/${event.id}`} className="text-[13px] font-semibold text-coral hover:underline">
              ← Back to event
            </Link>
            <h1 className="mt-4 text-2xl font-extrabold text-ink">Could not start hold</h1>
            <p className="mt-2 text-[14px] text-coral">{freeLockError}</p>
            <Button
              variant="dark"
              size="md"
              className="mt-6"
              onClick={() => {
                setFreeLockError(null);
                setFreeLockRetry((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="px-6 py-24 text-center text-[14px] text-ink-60">
        Preparing your ticket hold…
      </div>
    );
  }

  const waitingForSeatedLock =
    event.layoutType === 'seated' &&
    !!user &&
    stateLockId == null &&
    (currentLockLoading || currentLockFetching);

  if (waitingForSeatedLock) {
    return (
      <div className="px-6 py-24 text-center text-[14px] text-ink-60">
        Restoring your seat hold…
      </div>
    );
  }

  if (event.layoutType === 'seated' && lockId == null) {
    return <Navigate to={`/checkout/${event.id}/seats`} replace />;
  }
  if (event.layoutType === 'seated' && selectedSeats.length < 1) {
    return <Navigate to={`/checkout/${event.id}/seats`} replace />;
  }

  return (
    <div className="bg-ink-5/40 pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6">
        <Link to={`/events/${event.id}`} className="text-[13px] font-semibold text-coral hover:underline">
          ← Back to event
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Checkout</h1>
        <p className="mt-1 text-[14px] text-ink-60">{event.title}</p>

        {!user && (
          <div className="mt-4 rounded-xl border border-amber/40 bg-amber/10 p-4 text-[13px] text-ink">
            <p className="font-semibold">Sign in to complete checkout</p>
            <p className="mt-1 text-ink-60">
              Orders are tied to your account.{' '}
              <Link
                to={`/login?next=${encodeURIComponent(`/checkout/${eventId}`)}`}
                className="font-semibold text-coral hover:underline"
              >
                Log in or create an account
              </Link>{' '}
              to continue.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3 rounded-2xl border border-ink-10 bg-white p-4 text-[13px] leading-relaxed text-ink-60 shadow-sm">
          <details className="group">
            <summary className="cursor-pointer font-bold text-ink">Refund policy (summary)</summary>
            <p className="mt-2">
              No change-of-mind refunds. Resale is via auction before event day. Refunds apply for cancellation,
              major organizer edits, or seat conflicts per{' '}
              <Link to="/terms" className="font-semibold text-coral underline">
                Terms
              </Link>
              .
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-bold text-ink">Seat lock while paying</summary>
            <p className="mt-2">
              Seats are held server-side while payment processes. If payment fails or times out, locks release for
              others automatically.
            </p>
          </details>
        </div>

        <ol className="mt-8 flex gap-2 text-[12px] font-bold">
          {([1, 2, 3] as const).map((s) => (
            <li
              key={s}
              className={cn(
                'rounded-full px-3 py-1',
                step >= s ? 'bg-ink text-white' : 'bg-ink-10 text-ink-40'
              )}
            >
              {s}. {s === 1 ? 'Tickets' : s === 2 ? 'Review' : 'Pay'}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-ink-10 bg-white p-6 shadow-sm">
          {step === 1 && event.layoutType !== 'seated' && (
            <div className="space-y-6">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Ticket type</span>
                <select
                  value={ticketTypeId}
                  onChange={(e) => setTicketTypeId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                >
                  {event.ticketTypes.map((tt) => (
                    <option
                      key={tt.id}
                      value={tt.id}
                      disabled={tt.remaining != null && tt.remaining < 1}
                    >
                      {tt.name} — {tt.price} SAR (
                      {tt.remaining != null ? `${tt.remaining} left` : 'available'})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={Math.min(selectedType?.remaining ?? 1, 10)}
                  value={qty}
                  onChange={(e) => setQtyInput(Math.max(1, Number(e.target.value)))}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
              </label>
              <Button variant="dark" size="md" className="w-full" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[14px] text-ink-60">
                {qty}× {selectedType?.name} @ {unitPrice} SAR
              </p>
              {event.layoutType === 'seated' && (
                <div className="rounded-xl border border-ink-10 bg-ink-5/50 p-3">
                  <p className="text-[12px] font-semibold text-ink">Selected seats</p>
                  <p className="mt-1 text-[12px] text-ink-60">
                    {selectedSeats.map((seat) => seat.label).join(', ')}
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-ink-5/80 p-4 text-[14px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{subtotal} SAR</span>
                </div>
                <div className="mt-2 flex justify-between text-ink-60">
                  <span>Fees (demo 5%)</span>
                  <span className="font-mono">{fees} SAR</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-ink-10 pt-3 font-bold">
                  <span>Total</span>
                  <span className="font-mono">{total} SAR</span>
                </div>
              </div>
              <p className="text-[12px] text-ink-40">
                Final totals (taxes, processing fees) are calculated server-side at order creation.
              </p>
              <div className="flex gap-3">
                {event.layoutType === 'seated' ? (
                  <Button
                    variant="outline"
                    size="md"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/checkout/${event.id}/seats`, {
                        state: {
                          selectedSeats,
                          selectedTicketTypeId: selectedSeats[0]?.ticketTypeId ?? ticketTypeId,
                          lockId,
                        } as CheckoutLocationState,
                      })
                    }
                  >
                    Back to seats
                  </Button>
                ) : (
                  <Button variant="outline" size="md" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                )}
                <Button variant="dark" size="md" className="flex-1" onClick={() => setStep(3)}>
                  Continue to pay
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-ink">Payment</p>
                <span className="rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-60">
                  Secure checkout
                </span>
              </div>
              <p className="text-[13px] text-ink-60">
                Choose a card network and enter your payment details. Your card is authorized via the gateway when
                you submit.
              </p>

              {user && savedCardsLoading && (
                <div className="flex flex-wrap gap-2" aria-hidden>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-[58px] w-[180px] animate-pulse rounded-xl border border-ink-10 bg-ink-5/60"
                    />
                  ))}
                </div>
              )}

              {user && !savedCardsLoading && !savedCardsError && savedCards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-ink-60">Use a saved card</p>
                  <div className="flex flex-wrap gap-2">
                    {savedCards.map((card) => {
                      const cardId = card.id;
                      const isSelected = String(selectedSavedCardId) === String(cardId);
                      return (
                        <button
                          key={String(cardId)}
                          type="button"
                          onClick={() => setSelectedSavedCardId(cardId)}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-ink bg-ink-5'
                              : 'border-ink-10 bg-white hover:border-ink-30'
                          )}
                          aria-pressed={isSelected}
                        >
                          <p className="text-[13px] font-bold text-ink">
                            {formatCardBrand(card.brand)} ·{' '}
                            <span className="font-mono">•••• {card.last4}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-60">
                            Expires {formatSavedCardExpiry(card.exp_month, card.exp_year)}
                            {card.is_default ? ' · Default' : ''}
                          </p>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedSavedCardId(null)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left transition-colors',
                        !usingSavedCard ? 'border-ink bg-ink-5' : 'border-ink-10 bg-white hover:border-ink-30'
                      )}
                      aria-pressed={!usingSavedCard}
                    >
                      <p className="text-[13px] font-bold text-ink">Use a new card</p>
                      <p className="mt-0.5 text-[11px] text-ink-60">Enter card details below</p>
                    </button>
                  </div>
                </div>
              )}

              {!usingSavedCard && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {CARD_PAYMENT_METHODS.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      id={method.id}
                      label={method.label}
                      helper={method.helper}
                      selected={paymentForm.method === method.id}
                      onSelect={(selectedMethod) => setPaymentForm((prev) => ({ ...prev, method: selectedMethod }))}
                    />
                  ))}
                </div>
              )}

              {!usingSavedCard && (
                <div className="rounded-xl border border-ink-10 bg-ink-5/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-[12px] font-semibold text-ink-60">Cardholder name</span>
                      <input
                        value={paymentForm.cardholder}
                        onChange={(e) => onPaymentFieldChange('cardholder', e.target.value)}
                        placeholder={selectedMethodConfig.cardholderPlaceholder}
                        className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                      />
                      {paymentTouched && paymentValidation.errors.cardholder && (
                        <p className="mt-1 text-[11px] text-coral">{paymentValidation.errors.cardholder}</p>
                      )}
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-[12px] font-semibold text-ink-60">Card number</span>
                      <input
                        value={paymentForm.cardNumber}
                        onChange={(e) => onPaymentFieldChange('cardNumber', e.target.value)}
                        placeholder={selectedMethodConfig.numberPlaceholder}
                        inputMode="numeric"
                        className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] font-mono"
                      />
                      {paymentValidation.detectedMethod && (
                        <p className="mt-1 text-[11px] text-ink-40">
                          Detected network: {paymentValidation.detectedMethod.toUpperCase()}
                        </p>
                      )}
                      {paymentTouched && paymentValidation.errors.cardNumber && (
                        <p className="mt-1 text-[11px] text-coral">{paymentValidation.errors.cardNumber}</p>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-semibold text-ink-60">Expiry</span>
                      <input
                        value={paymentForm.expiry}
                        onChange={(e) => onPaymentFieldChange('expiry', e.target.value)}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] font-mono"
                      />
                      {paymentTouched && paymentValidation.errors.expiry && (
                        <p className="mt-1 text-[11px] text-coral">{paymentValidation.errors.expiry}</p>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-semibold text-ink-60">{selectedMethodConfig.cvvLabel}</span>
                      <input
                        value={paymentForm.cvv}
                        onChange={(e) => onPaymentFieldChange('cvv', e.target.value)}
                        placeholder={selectedMethodConfig.cvvPlaceholder}
                        inputMode="numeric"
                        className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] font-mono"
                      />
                      {paymentTouched && paymentValidation.errors.cvv && (
                        <p className="mt-1 text-[11px] text-coral">{paymentValidation.errors.cvv}</p>
                      )}
                    </label>
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
                      <input
                        type="checkbox"
                        checked={paymentForm.saveCard}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, saveCard: e.target.checked }))}
                        className="h-4 w-4 rounded border-ink-20"
                      />
                      Save card for future purchases
                    </label>
                    <p className="text-[11px] leading-relaxed text-ink-40">
                      Your card is only stored if payment completes successfully, in the same request that confirms
                      your order. Checking this box does not call the server by itself.
                    </p>
                  </div>
                </div>
              )}

              {usingSavedCard && selectedSavedCard && (
                <p className="rounded-lg border border-ink-10 bg-ink-5/40 px-3 py-2 text-[12px] text-ink-60">
                  Paying with {formatCardBrand(selectedSavedCard.brand)} ending in •••• {selectedSavedCard.last4}.
                  No card details required.
                </p>
              )}

              {payLoading && (
                <p className="rounded-lg bg-ink-5 px-3 py-2 text-[12px] font-semibold text-ink-60">
                  {creatingOrder ? 'Creating your order…' : 'Confirming payment with gateway…'}
                </p>
              )}

              {paymentErrorMessage && !payFailOpen && (
                <p className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
                  {paymentErrorMessage}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" size="md" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  variant="dark"
                  size="md"
                  className="flex-1"
                  loading={payLoading}
                  disabled={!canSubmitPayment}
                  onClick={handlePay}
                >
                  Pay {total} SAR
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {overlapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            role="dialog"
            aria-modal
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="max-w-md rounded-2xl bg-white p-6 shadow-card-lg"
            >
              <div className="flex items-start gap-3">
                <Warning size={28} weight="fill" className="shrink-0 text-amber" />
                <div>
                  <h2 className="text-lg font-extrabold text-ink">Scheduling overlap</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
                    {overlapConflictTitle ? (
                      <>
                        This event overlaps with{' '}
                        <strong className="text-ink">{overlapConflictTitle}</strong>, which you already hold a ticket
                        for.
                      </>
                    ) : (
                      'You already hold tickets for another event that overlaps this time.'
                    )}{' '}
                    MyTicket is not responsible for scheduling conflicts from purchasing overlapping tickets.
                    Overlapping-event purchases are non-refundable per our{' '}
                    <Link to="/terms" className="font-semibold text-coral underline">
                      Terms of Service
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  loading={payLoading}
                  disabled={payLoading}
                  onClick={() => void completePurchase()}
                >
                  Ignore &amp; continue
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:flex-1"
                  disabled={payLoading}
                  onClick={() => setOverlapOpen(false)}
                >
                  Go back
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="max-h-[90vh] max-w-md overflow-hidden overflow-y-auto rounded-2xl bg-white shadow-card-lg"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-lemon/90 via-mint/40 to-coral/30 px-6 py-10 text-center">
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute h-2 w-2 rounded-full bg-white/90 shadow-sm"
                    style={{ left: `${(i * 17) % 92}%`, top: `${(i * 23) % 85}%` }}
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0.6],
                      scale: [0, 1, 0.6],
                      y: [0, -28 - (i % 5) * 8],
                    }}
                    transition={{ duration: 1.1, delay: 0.05 * i, ease: 'easeOut' }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md"
                >
                  <CheckCircle size={40} weight="fill" className="text-mint-dark" />
                </motion.div>
                <h2 className="mt-4 text-2xl font-extrabold text-ink">You&apos;re in!</h2>
                <p className="mt-2 text-[14px] text-ink-60">
                  {event.title} · {qty} ticket{qty === 1 ? '' : 's'} · {total} SAR paid
                </p>
                <p className="mt-1 text-[13px] text-ink-40">Order {success.orderRef}</p>
              </div>
              {success.tickets.length > 0 && (
                <div className="border-t border-ink-10 px-6 py-4">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-40">
                    {success.tickets.length === 1 ? 'Your entry QR' : 'Your entry QRs'}
                  </p>
                  <CheckoutSuccessTickets tickets={success.tickets} className="mt-3" />
                </div>
              )}
              <div className="space-y-3 p-6">
                <Link
                  to="/my-tickets"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-ink-80"
                >
                  View my tickets
                </Link>
                <Link
                  to={`/events/${event.id}`}
                  className="block text-center text-[13px] font-semibold text-coral hover:underline"
                >
                  Back to event
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {payFailOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md rounded-2xl bg-white p-6 shadow-card-lg"
            >
              <h2 className="text-lg font-extrabold text-ink">Payment didn&apos;t go through</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
                {paymentErrorMessage ??
                  'Seat locks are released automatically. Return to payment and try again, or pick different seats.'}
              </p>
              <Button variant="dark" size="md" className="mt-6 w-full" onClick={() => setPayFailOpen(false)}>
                OK
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
