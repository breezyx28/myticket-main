import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { CheckCircle, ShieldCheck, Warning } from '@phosphor-icons/react';
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
import { SaudiRiyalIcon } from '@/components/icons/SaudiRiyalIcon';
import type { SavedCard } from '@/api/types/savedCard';
import type { SeatLockRequest } from '@/api/types/seat';
import { Button } from '@/components/ui/Button';
import { CheckoutAlertBanner } from '@/components/checkout/CheckoutAlertBanner';
import { CheckoutLayout, CheckoutMainPanel, CheckoutShell, CHECKOUT_MODAL_OVERLAY } from '@/components/checkout/CheckoutShell';
import { CheckoutPageHeader } from '@/components/checkout/CheckoutPageHeader';
import { CheckoutSkeleton } from '@/components/checkout/CheckoutSkeleton';
import { CheckoutStepContent } from '@/components/checkout/CheckoutStepContent';
import { CheckoutStepIndicator } from '@/components/checkout/CheckoutStepIndicator';
import { OrderSummaryPanel } from '@/components/checkout/OrderSummaryPanel';
import {
  CheckoutNewCardButton,
  CheckoutPaymentCardPreview,
  CheckoutSavedCardButton,
} from '@/components/checkout/CheckoutPaymentCards';
import { CreditCard } from '@/components/checkout/CreditCard';
import {
  creditCardNetworkForBrand,
  displayCardExpiration,
  displayCardHolder,
  maskSavedCardNumber,
  networkLabel,
  resolveCardNetwork,
  savedCardDisplayLabel,
} from '@/components/checkout/checkoutCreditCardUtils';
import { formatSaudiRiyalAmountLatin } from '@/lib/saudiCurrency';
import { tokenizeCardForPayment } from '@/lib/paymentTokenize';
import { SAVED_CARDS_MAX } from '@/lib/savedCardMappers';
import { cn } from '@/lib/utils';
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
import { detectCardMethod } from '@/lib/cardPaymentValidation';
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
  const { t } = useTranslation('checkout');
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
    cardLabel: '',
    saveCard: false,
  });
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [tokenizingPayment, setTokenizingPayment] = useState(false);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<Id | null>(null);
  const [savedCardAutoSelected, setSavedCardAutoSelected] = useState(false);

  const stateLockId = locationState.lockId ?? null;

  const [createOrder, { isLoading: creatingOrder }] = useCreateOrderMutation();
  const [confirmOrderPayment, { isLoading: confirmingPayment }] = useConfirmOrderPaymentMutation();
  const [checkOverlap, { isLoading: checkingOverlap }] = useCheckTicketOverlapMutation();
  const payLoading = creatingOrder || confirmingPayment || checkingOverlap || tokenizingPayment;

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
        setFreeLockError(readApiErrorMessage(err) ?? t('freeLockFailed'));
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
  const usingSavedCard = selectedSavedCard !== null;
  const atSavedCardLimit = savedCards.length >= SAVED_CARDS_MAX;
  const canSubmitPayment =
    (usingSavedCard || paymentValidation.isValid) &&
    !payLoading &&
    !!user &&
    !(paymentForm.saveCard && atSavedCardLimit && !usingSavedCard);

  async function handlePay() {
    if (!event || !selectedType || !detail) return;
    setPaymentTouched(true);
    setPaymentErrorMessage(null);
    if (!usingSavedCard && !paymentValidation.isValid) return;
    if (!user) {
      setPaymentErrorMessage(t('signInBody'));
      return;
    }
    if (selectedSavedCardId !== null && !selectedSavedCard) {
      setPaymentErrorMessage(t('savedCardGone'));
      return;
    }
    if (lockId == null) {
      if (event.layoutType === 'seated') {
        setPaymentErrorMessage(t('holdMissing'));
        navigate(`/checkout/${event.id}/seats`, { state: locationState });
      } else {
        setPaymentErrorMessage(t('holdNotReady'));
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
        setPaymentErrorMessage(t('holdMissing'));
        navigate(`/checkout/${event.id}/seats`, { replace: false, state: locationState });
      } else {
        setPaymentErrorMessage(t('holdNotReady'));
      }
      return;
    }
    setOverlapOpen(false);
    setOverlapDismissed(true);
    setPaymentErrorMessage(null);

    let tokenResult: Awaited<ReturnType<typeof tokenizeCardForPayment>> | null = null;
    if (!usingSavedCard) {
      try {
        setTokenizingPayment(true);
        tokenResult = await tokenizeCardForPayment(paymentForm);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('cardSecureFailed');
        setPaymentErrorMessage(message);
        setPayFailOpen(true);
        return;
      } finally {
        setTokenizingPayment(false);
      }
    }

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
    if (selectedSavedCard) {
      orderBody.saved_card_id = selectedSavedCard.id;
    }

    let order: Order;
    try {
      order = await createOrder(orderBody).unwrap();
    } catch (err) {
      const message = readApiErrorMessage(err) ?? t('orderCreateFailed');
      setPaymentErrorMessage(message);
      setPayFailOpen(true);
      return;
    }

    const orderId = order.id ?? (order as { order_id?: Id }).order_id;
    if (orderId == null) {
      setPaymentErrorMessage(t('orderNoId'));
      setPayFailOpen(true);
      return;
    }

    try {
      const confirmBody: ConfirmOrderPaymentRequest = {};
      if (order.payment_intent_id) {
        confirmBody.payment_intent_id = order.payment_intent_id;
      }
      if (selectedSavedCard) {
        confirmBody.saved_card_id = selectedSavedCard.id;
      } else if (tokenResult) {
        confirmBody.payment_token = tokenResult.payment_token;
        confirmBody.brand = tokenResult.brand;
        confirmBody.last4 = tokenResult.last4;
        confirmBody.expiry_month = tokenResult.expiry_month;
        confirmBody.expiry_year = tokenResult.expiry_year;
        if (tokenResult.cardholder_name) {
          confirmBody.cardholder_name = tokenResult.cardholder_name;
        }
        if (paymentForm.saveCard && user) {
          confirmBody.save_card = true;
        }
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
        title: t('orderConfirmed'),
        body: `${event.title} · ${orderRef} · ${t('ticketCount', { count: qty })}`,
        href: `/my-tickets`,
      });
      return;
    } catch (err) {
      const message =
        readApiErrorMessage(err) ?? t('paymentDeclined');
      setPaymentErrorMessage(message);
      setPayFailOpen(true);
      return;
    }

  }

  function onPaymentFieldChange(
    field: keyof Pick<PaymentFormState, 'cardholder' | 'cardNumber' | 'expiry' | 'cvv' | 'cardLabel'>,
    value: string
  ) {
    setPaymentForm((prev) => {
      if (field === 'cardNumber') {
        const detected = detectCardMethod(value);
        const method = detected ?? prev.method;
        return { ...prev, method, cardNumber: formatCardNumber(value, method) };
      }
      if (field === 'expiry') return { ...prev, expiry: formatExpiry(value) };
      if (field === 'cvv') return { ...prev, cvv: formatCvv(value) };
      if (field === 'cardLabel') return { ...prev, cardLabel: value.slice(0, 24) };
      return { ...prev, cardholder: value };
    });
  }

  const detectedNetwork = resolveCardNetwork(paymentForm.cardNumber, paymentForm.method);

  if (eventLoading || (!event && !eventError)) {
    return <CheckoutSkeleton />;
  }
  if (eventError || !event || event.ticketsLeft === 0) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  const needsFreeTicketLock = event.layoutType === 'free' && !!user && lockId == null;
  if (needsFreeTicketLock) {
    if (freeLockError != null && !acquiringFreeLock) {
      return (
        <CheckoutShell>
          <CheckoutPageHeader
            backTo={`/events/${event.id}`}
            title={t('couldNotStartHold')}
            subtitle={freeLockError}
          />
          <CheckoutMainPanel className="mt-8 max-w-lg">
            <Button
              variant="dark"
              size="md"
              onClick={() => {
                setFreeLockError(null);
                setFreeLockRetry((n) => n + 1);
              }}
            >
              {t('tryAgain')}
            </Button>
          </CheckoutMainPanel>
        </CheckoutShell>
      );
    }
    return <CheckoutSkeleton withAside={false} />;
  }

  const waitingForSeatedLock =
    event.layoutType === 'seated' &&
    !!user &&
    stateLockId == null &&
    (currentLockLoading || currentLockFetching);

  if (waitingForSeatedLock) {
    return <CheckoutSkeleton />;
  }

  if (event.layoutType === 'seated' && lockId == null) {
    return <Navigate to={`/checkout/${event.id}/seats`} replace />;
  }
  if (event.layoutType === 'seated' && selectedSeats.length < 1) {
    return <Navigate to={`/checkout/${event.id}/seats`} replace />;
  }

  const checkoutFlow = event.layoutType === 'seated' ? 'seated' : 'ga';
  const seatLabels =
    event.layoutType === 'seated' ? selectedSeats.map((seat) => seat.label) : undefined;
  const loginReturnPath = `/checkout/${eventId}`;

  const orderSummary = (
    <OrderSummaryPanel
      eventTitle={event.title}
      ticketTypeName={selectedType?.name}
      quantity={qty}
      unitPrice={unitPrice}
      subtotal={subtotal}
      fees={fees}
      total={total}
      seatLabels={seatLabels}
    />
  );

  return (
    <CheckoutShell>
      <CheckoutPageHeader
        backTo={`/events/${event.id}`}
        title={t('title')}
        subtitle={event.title}
      />

      {!user && (
        <CheckoutAlertBanner title={t('signInTitle')}>
          {t('signInBody')}{' '}
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

      <CheckoutStepIndicator flow={checkoutFlow} step={step} />

      <CheckoutLayout
        main={
          <CheckoutMainPanel>
            {step === 1 && event.layoutType !== 'seated' && (
              <CheckoutStepContent>
                <div className="space-y-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold text-ink-60">{t('ticketType')}</span>
                    <select
                      value={ticketTypeId}
                      onChange={(e) => setTicketTypeId(e.target.value)}
                      className="w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                    >
                      {event.ticketTypes.map((tt) => (
                        <option
                          key={tt.id}
                          value={tt.id}
                          disabled={tt.remaining != null && tt.remaining < 1}
                        >
                          {tt.name} — {tt.price} SAR (
                          {tt.remaining != null ? t('left', { count: tt.remaining }) : t('available')})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold text-ink-60">{t('quantity')}</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(selectedType?.remaining ?? 1, 10)}
                      value={qty}
                      onChange={(e) => setQtyInput(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] tabular-nums"
                    />
                  </label>
                  <Button variant="dark" size="md" className="w-full" onClick={() => setStep(2)}>
                    {t('continue')}
                  </Button>
                </div>
              </CheckoutStepContent>
            )}

            {step === 2 && (
              <CheckoutStepContent>
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">
                      {t('reviewOrder')}
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-ink">
                      {qty}× {selectedType?.name}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[14px] text-ink-60 tabular-nums">
                      <SaudiRiyalIcon className="h-[0.85em] w-[0.85em]" />
                      {formatSaudiRiyalAmountLatin(unitPrice)} {t('each')}
                    </p>
                  </div>

                  {event.layoutType === 'seated' && (
                    <div className="rounded-xl bg-ink-5/60 p-4">
                      <p className="text-[12px] font-semibold text-ink">{t('selectedSeats')}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">
                        {selectedSeats.map((seat) => seat.label).join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
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
                        {t('backToSeats')}
                      </Button>
                    ) : (
                      <Button variant="outline" size="md" className="flex-1" onClick={() => setStep(1)}>
                        {t('back')}
                      </Button>
                    )}
                    <Button variant="dark" size="md" className="flex-1" onClick={() => setStep(3)}>
                      {t('proceedToPayment')}
                    </Button>
                  </div>
                </div>
              </CheckoutStepContent>
            )}

            {step === 3 && (
              <CheckoutStepContent>
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-extrabold tracking-tight text-ink">{t('payment')}</p>
                    <span className="rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-60">
                      {t('secureCheckout')}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-60">{t('paymentIntro')}</p>

                  {user && savedCardsLoading && (
                    <div className="flex gap-4 overflow-hidden" aria-hidden>
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="h-[158px] w-[260px] shrink-0 animate-pulse rounded-2xl bg-ink-10/80"
                        />
                      ))}
                    </div>
                  )}

                  {user && !savedCardsLoading && !savedCardsError && savedCards.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[12px] font-semibold text-ink-60">{t('useSavedCard')}</p>
                      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
                        {savedCards.map((card) => {
                          const cardId = card.id;
                          const isSelected = String(selectedSavedCardId) === String(cardId);
                          return (
                            <CheckoutSavedCardButton
                              key={String(cardId)}
                              brand={card.brand}
                              last4={card.last4}
                              expMonth={card.exp_month}
                              expYear={card.exp_year}
                              holderName={card.cardholder_name ?? undefined}
                              cardLabel={savedCardDisplayLabel(card, formatCardBrand)}
                              selected={isSelected}
                              onSelect={() => setSelectedSavedCardId(cardId)}
                            />
                          );
                        })}
                        <CheckoutNewCardButton
                          selected={!usingSavedCard}
                          onSelect={() => setSelectedSavedCardId(null)}
                        />
                      </div>
                    </div>
                  )}

                  {!usingSavedCard && (
                    <CheckoutPaymentCardPreview
                      cardNumber={paymentForm.cardNumber}
                      cardholder={paymentForm.cardholder}
                      cardLabel={paymentForm.cardLabel}
                      expiry={paymentForm.expiry}
                      numberPlaceholder="•••• •••• •••• ••••"
                      fallbackNetwork={paymentForm.method}
                    />
                  )}

                  {!usingSavedCard && (
                    <div className="rounded-2xl bg-ink-5/50 p-4 sm:p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink-60">{t('cardNumber')}</span>
                          <input
                            value={paymentForm.cardNumber}
                            onChange={(e) => onPaymentFieldChange('cardNumber', e.target.value)}
                            placeholder="1234 1234 1234 1234"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            className="w-full rounded-xl border border-ink-10 bg-white px-4 py-3 font-mono text-[14px] tabular-nums"
                          />
                          {detectedNetwork ? (
                            <p className="text-[11px] font-medium text-ink-60">
                              {t('networkDetected', { network: networkLabel(detectedNetwork) })}
                            </p>
                          ) : paymentForm.cardNumber.trim() ? (
                            <p className="text-[11px] text-ink-40">
                              {t('keepTypingCard')}
                            </p>
                          ) : null}
                          {paymentTouched && paymentValidation.errors.cardNumber && (
                            <p className="text-[11px] text-coral">{paymentValidation.errors.cardNumber}</p>
                          )}
                        </label>
                        <label className="flex flex-col gap-2 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink-60">{t('cardNickname')}</span>
                          <input
                            value={paymentForm.cardLabel}
                            onChange={(e) => onPaymentFieldChange('cardLabel', e.target.value)}
                            placeholder={t('cardLabelPlaceholder')}
                            maxLength={24}
                            autoComplete="off"
                            className="w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                          />
                          <p className="text-[11px] text-ink-40">
                            {t('cardNicknameHint')}
                          </p>
                        </label>
                        <label className="flex flex-col gap-2 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink-60">{t('cardholderName')}</span>
                          <input
                            value={paymentForm.cardholder}
                            onChange={(e) => onPaymentFieldChange('cardholder', e.target.value)}
                            placeholder={selectedMethodConfig.cardholderPlaceholder}
                            autoComplete="cc-name"
                            className="w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                          />
                          {paymentTouched && paymentValidation.errors.cardholder && (
                            <p className="text-[11px] text-coral">{paymentValidation.errors.cardholder}</p>
                          )}
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-[12px] font-semibold text-ink-60">{t('expiry')}</span>
                          <input
                            value={paymentForm.expiry}
                            onChange={(e) => onPaymentFieldChange('expiry', e.target.value)}
                            placeholder={t('expiryPlaceholder')}
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            className="w-full rounded-xl border border-ink-10 bg-white px-4 py-3 font-mono text-[14px] tabular-nums"
                          />
                          {paymentTouched && paymentValidation.errors.expiry && (
                            <p className="text-[11px] text-coral">{paymentValidation.errors.expiry}</p>
                          )}
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-[12px] font-semibold text-ink-60">
                            {selectedMethodConfig.cvvLabel}
                          </span>
                          <input
                            value={paymentForm.cvv}
                            onChange={(e) => onPaymentFieldChange('cvv', e.target.value)}
                            placeholder={selectedMethodConfig.cvvPlaceholder}
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            className="w-full rounded-xl border border-ink-10 bg-white px-4 py-3 font-mono text-[14px] tabular-nums"
                          />
                          {paymentTouched && paymentValidation.errors.cvv && (
                            <p className="text-[11px] text-coral">{paymentValidation.errors.cvv}</p>
                          )}
                        </label>
                      </div>
                      {user && (
                        <div
                          className={cn(
                            'mt-4 rounded-xl border px-4 py-3 transition-colors',
                            paymentForm.saveCard && !atSavedCardLimit
                              ? 'border-mint/40 bg-mint/10'
                              : 'border-ink-10 bg-white',
                          )}
                        >
                          {atSavedCardLimit ? (
                            <p className="text-[12px] leading-relaxed text-ink-60">
                              {t('savedCardsMax', { max: SAVED_CARDS_MAX })}
                            </p>
                          ) : (
                            <>
                              <label className="inline-flex min-h-10 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={paymentForm.saveCard}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({ ...prev, saveCard: e.target.checked }))
                                  }
                                  className="mt-0.5 size-4 shrink-0 rounded border-ink-20"
                                />
                                <span className="flex flex-col gap-1">
                                  <span className="text-[13px] font-semibold text-ink">
                                    {t('saveCardCheckbox')}
                                  </span>
                                  <span className="text-[11px] leading-relaxed text-ink-60">
                                    {t('saveCardHint')}
                                  </span>
                                </span>
                              </label>
                              {paymentForm.saveCard ? (
                                <p className="mt-3 flex items-start gap-2 text-[11px] font-medium text-mint-dark">
                                  <ShieldCheck
                                    className="mt-0.5 size-4 shrink-0"
                                    weight="fill"
                                    aria-hidden
                                  />
                                  {t('secureTokenNote')}
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {usingSavedCard && selectedSavedCard && (
                    <>
                      <div className="flex justify-center rounded-2xl bg-ink-5/60 px-4 py-6">
                        <CreditCard
                          network={creditCardNetworkForBrand(selectedSavedCard.brand)}
                          label={savedCardDisplayLabel(selectedSavedCard, formatCardBrand)}
                          cardNumber={maskSavedCardNumber(selectedSavedCard.last4)}
                          cardHolder={displayCardHolder(selectedSavedCard.cardholder_name ?? '')}
                          cardExpiration={displayCardExpiration(
                            formatSavedCardExpiry(
                              selectedSavedCard.exp_month,
                              selectedSavedCard.exp_year,
                            ),
                          )}
                          width={316}
                        />
                      </div>
                      <p className="rounded-xl bg-ink-5/60 px-4 py-3 text-[12px] text-ink-60">
                        {t('payingWithSavedCard', {
                          brand: formatCardBrand(selectedSavedCard.brand),
                          last4: selectedSavedCard.last4,
                        })}
                      </p>
                    </>
                  )}

                  {payLoading && (
                    <p className="rounded-xl bg-ink-5 px-4 py-3 text-[12px] font-semibold text-ink-60">
                      {tokenizingPayment
                        ? t('securingCard')
                        : creatingOrder
                          ? t('creatingOrder')
                          : t('confirmingPayment')}
                    </p>
                  )}

                  {paymentErrorMessage && !payFailOpen && (
                    <CheckoutAlertBanner title={t('paymentIssue')} variant="coral">
                      {paymentErrorMessage}
                    </CheckoutAlertBanner>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" size="md" className="flex-1" onClick={() => setStep(2)}>
                      {t('back')}
                    </Button>
                    <Button
                      variant="dark"
                      size="md"
                      className="flex-1"
                      loading={payLoading}
                      disabled={!canSubmitPayment}
                      onClick={handlePay}
                    >
                      <span className="inline-flex items-center justify-center gap-1 tabular-nums">
                        {t('pay')}
                        <SaudiRiyalIcon className="h-[0.9em] w-[0.9em]" />
                        {formatSaudiRiyalAmountLatin(total)}
                      </span>
                    </Button>
                  </div>
                </div>
              </CheckoutStepContent>
            )}
          </CheckoutMainPanel>
        }
        aside={orderSummary}
      />

      <AnimatePresence initial={false}>
        {overlapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={CHECKOUT_MODAL_OVERLAY}
            role="dialog"
            aria-modal
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              className="max-w-md rounded-[2rem] bg-white p-6 shadow-[0_24px_48px_-20px_rgba(26,26,26,0.18)]"
            >
              <div className="flex items-start gap-3">
                <Warning size={28} weight="fill" className="shrink-0 text-amber" />
                <div>
                  <h2 className="text-lg font-extrabold text-ink">{t('overlapTitle')}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
                    {overlapConflictTitle ? (
                      <Trans
                        t={t}
                        i18nKey="overlapWithEvent"
                        values={{ title: overlapConflictTitle }}
                        components={{ 1: <strong className="text-ink" /> }}
                      />
                    ) : (
                      t('overlapWarning')
                    )}{' '}
                    {t('overlapDisclaimer')}{' '}
                    <Link to="/terms" className="font-semibold text-coral underline">
                      {t('termsOfService')}
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
                  {t('ignoreContinue')}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:flex-1"
                  disabled={payLoading}
                  onClick={() => setOverlapOpen(false)}
                >
                  {t('goBack')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={CHECKOUT_MODAL_OVERLAY}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="max-h-[90vh] max-w-md overflow-hidden overflow-y-auto rounded-[2rem] bg-white shadow-[0_24px_48px_-20px_rgba(26,26,26,0.18)]"
            >
              <div className="border-b border-ink-10 bg-ink-5/80 px-6 py-10 text-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.35, bounce: 0, delay: 0.05 }}
                  className="mx-auto flex size-16 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_-8px_rgba(26,26,26,0.15)]"
                >
                  <CheckCircle size={40} weight="fill" className="text-coral" />
                </motion.div>
                <h2 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-ink">
                  {t('successTitle')}
                </h2>
                <p className="mt-2 text-[14px] text-ink-60">
                  {event.title} · {t('ticketCount', { count: qty })}
                </p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 text-[13px] text-ink tabular-nums">
                  <SaudiRiyalIcon className="h-[0.85em] w-[0.85em]" />
                  {formatSaudiRiyalAmountLatin(total)} {t('paid')}
                </p>
                <p className="mt-1 text-[13px] text-ink-40">{t('orderLabel', { ref: success.orderRef })}</p>
              </div>
              {success.tickets.length > 0 && (
                <div className="border-t border-ink-10 px-6 py-4">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-40">
                    {success.tickets.length === 1 ? t('yourEntryQr') : t('yourEntryQrs')}
                  </p>
                  <CheckoutSuccessTickets tickets={success.tickets} className="mt-3" />
                </div>
              )}
              <div className="space-y-3 p-6">
                <Link
                  to="/my-tickets"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-ink-80"
                >
                  {t('viewMyTickets')}
                </Link>
                <Link
                  to={`/events/${event.id}`}
                  className="block text-center text-[13px] font-semibold text-coral hover:underline"
                >
                  {t('backToEvent')}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {payFailOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={CHECKOUT_MODAL_OVERLAY}
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              className="max-w-md rounded-[2rem] bg-white p-6 shadow-[0_24px_48px_-20px_rgba(26,26,26,0.18)]"
            >
              <h2 className="text-lg font-extrabold text-ink">{t('paymentFailedTitle')}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
                {paymentErrorMessage ?? t('seatLocksReleased')}
              </p>
              <Button variant="dark" size="md" className="mt-6 w-full" onClick={() => setPayFailOpen(false)}>
                {t('ok')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CheckoutShell>
  );
}
