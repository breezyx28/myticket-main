import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import * as yup from 'yup';
import { Clock, MapPin } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useBuyNowMutation,
  useListAuctionsQuery,
  useListSavedCardsQuery,
  usePlaceBidMutation,
} from '@/api/endpoints';
import type { Id } from '@/api/types/common';
import type { BuyNowRequest, PlaceBidRequest } from '@/api/types/auction';
import type { SavedCard } from '@/api/types/savedCard';
import { PaymentMethodCard } from '@/components/checkout/PaymentMethodCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
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
import { PLATFORM_AUCTION_COMMISSION_PCT } from '@/lib/constants';
import { apiAuctionToMockAuctionListing } from '@/lib/auctionMappers';
import { uiSeatIdToApi } from '@/lib/seatMappers';
import { cn } from '@/lib/utils';
import { placeBidSchema, validateBuyNowNewCardForm } from '@/schemas/auction';
import type { MockAuctionListing } from '@/types/domain';

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const PLACEHOLDER_PALETTE = [
  'bg-gradient-to-br from-coral/40 via-amber/30 to-lemon/40',
  'bg-gradient-to-br from-sky/40 via-mint/40 to-lemon/30',
  'bg-gradient-to-br from-amber/40 via-coral/30 to-blush/30',
  'bg-gradient-to-br from-mint/40 via-sky/30 to-lavender/40',
  'bg-gradient-to-br from-lavender/40 via-blush/30 to-coral/30',
  'bg-gradient-to-br from-lemon/40 via-mint/30 to-sky/40',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function placeholderClass(eventId: string): string {
  const palette = PLACEHOLDER_PALETTE[hashString(eventId) % PLACEHOLDER_PALETTE.length];
  return palette ?? PLACEHOLDER_PALETTE[0]!;
}

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

function minimumBidFor(listing: MockAuctionListing): number {
  return listing.highestBid ?? Math.max(0, listing.price - 1);
}

type DialogState =
  | { kind: 'bid'; listingId: string }
  | { kind: 'buy'; listingId: string }
  | null;

/** How the buy dialog picks a saved card (`auto` follows default / first once `savedCards` is known). */
type BuySavedCardPick =
  | { kind: 'auto' }
  | { kind: 'new' }
  | { kind: 'saved'; id: Id };

export function AuctionEventPage() {
  const { eventId } = useParams();
  const now = useNow();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();

  const {
    data: listingsPaged,
    isLoading,
    isError,
  } = useListAuctionsQuery({ event_id: eventId ?? '', per_page: 100 }, { skip: !eventId });

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

  const [placeBid, { isLoading: placingBid }] = usePlaceBidMutation();
  const [buyNow, { isLoading: buyingNow }] = useBuyNowMutation();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [buySavedCardPick, setBuySavedCardPick] = useState<BuySavedCardPick>({ kind: 'auto' });
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    method: 'visa',
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    saveCard: false,
  });
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [successCopy, setSuccessCopy] = useState<string | null>(null);

  const listings = useMemo(() => {
    return (listingsPaged?.data ?? []).map(apiAuctionToMockAuctionListing);
  }, [listingsPaged]);

  const commissionHint = useMemo(() => {
    const hit = listings.find((x) => x.commissionPct != null);
    return hit?.commissionPct != null ? `${hit.commissionPct}%` : `${PLATFORM_AUCTION_COMMISSION_PCT}%`;
  }, [listings]);

  const header = useMemo(() => {
    const first = listings[0];
    if (!first) return null;
    return { title: first.eventTitle, city: first.city, venue: first.venue };
  }, [listings]);

  const activeListing = useMemo(() => {
    if (!dialog) return null;
    return listings.find((l) => l.id === dialog.listingId) ?? null;
  }, [dialog, listings]);

  const effectiveBuySavedCardId = useMemo(() => {
    if (dialog?.kind !== 'buy') return null;
    if (buySavedCardPick.kind === 'new') return null;
    if (buySavedCardPick.kind === 'saved') return buySavedCardPick.id;
    if (savedCards.length === 0) return null;
    return (savedCards.find((c) => c.is_default) ?? savedCards[0]!).id;
  }, [dialog?.kind, buySavedCardPick, savedCards]);

  const selectedSavedCard = useMemo(
    () => savedCards.find((card) => String(card.id) === String(effectiveBuySavedCardId)) ?? null,
    [savedCards, effectiveBuySavedCardId],
  );

  const selectedMethodConfig = useMemo(
    () => CARD_PAYMENT_METHODS.find((m) => m.id === paymentForm.method) ?? CARD_PAYMENT_METHODS[0]!,
    [paymentForm.method],
  );

  const paymentValidation = useMemo(() => validatePaymentForm(paymentForm), [paymentForm]);
  const usingSavedCard = effectiveBuySavedCardId != null;
  const buyCardsSettled = !user || !savedCardsLoading;
  const canSubmitBuy =
    buyCardsSettled &&
    !!user &&
    !buyingNow &&
    (usingSavedCard ? selectedSavedCard != null : paymentValidation.isValid);

  if (!eventId) {
    return <Navigate to="/auction" replace />;
  }

  if (isLoading) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }

  if (isError) {
    return (
      <div className="bg-ink-5/40 pb-20 pt-10">
        <div className="mx-auto max-w-[960px] px-6 lg:px-8">
          <Link to="/auction" className="text-[13px] font-semibold text-coral hover:underline">
            ← Auction
          </Link>
          <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
            Could not load this auction. Please refresh and try again.
          </p>
        </div>
      </div>
    );
  }

  function closeDialog() {
    setDialog(null);
    setBidError(null);
    setBuyError(null);
    setPaymentTouched(false);
    setBuySavedCardPick({ kind: 'auto' });
    setPaymentForm({
      method: 'visa',
      cardholder: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      saveCard: false,
    });
  }

  function openBidDialog(listingId: string) {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return;
    setDialog({ kind: 'bid', listingId });
    setBidAmount(String(minimumBidFor(listing) + 1));
    setBidError(null);
  }

  function openBuyDialog(listingId: string) {
    setDialog({ kind: 'buy', listingId });
    setBuyError(null);
    setPaymentTouched(false);
    setBuySavedCardPick({ kind: 'auto' });
    setPaymentForm({
      method: 'visa',
      cardholder: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      saveCard: false,
    });
  }

  function onBuyPaymentFieldChange(
    field: keyof Pick<PaymentFormState, 'cardholder' | 'cardNumber' | 'expiry' | 'cvv'>,
    value: string,
  ) {
    setPaymentForm((prev) => {
      if (field === 'cardNumber') return { ...prev, cardNumber: formatCardNumber(value, prev.method) };
      if (field === 'expiry') return { ...prev, expiry: formatExpiry(value) };
      if (field === 'cvv') return { ...prev, cvv: formatCvv(value) };
      return { ...prev, cardholder: value };
    });
  }

  async function submitBid(listing: MockAuctionListing) {
    setBidError(null);
    const minimumBid = minimumBidFor(listing);
    const amount = Number(bidAmount);
    try {
      await placeBidSchema.validate({ amount }, { context: { minimumBid } });
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Enter a valid bid amount.');
      return;
    }
    const body: PlaceBidRequest = { amount };
    try {
      await placeBid({ id: uiSeatIdToApi(listing.id), body }).unwrap();
    } catch (err) {
      setBidError(readApiErrorMessage(err) ?? 'We could not place that bid. Try again.');
      return;
    }
    closeDialog();
    const cur = listing.currency ?? 'SAR';
    setSuccessCopy(`Bid placed: ${amount} ${cur} on ${listing.eventTitle || 'this listing'}.`);
    pushNotification({
      kind: 'general',
      title: 'Bid placed',
      body: `${amount} ${cur} on ${listing.eventTitle || 'auction listing'}`,
      href: `/auction/events/${listing.eventId}`,
    });
  }

  async function submitBuyNow(listing: MockAuctionListing) {
    setBuyError(null);
    if (usingSavedCard) {
      const card = savedCards.find((c) => String(c.id) === String(effectiveBuySavedCardId));
      if (!card) {
        setBuyError('That saved card is no longer available. Choose another card or use a new card.');
        return;
      }
      const body: BuyNowRequest = {
        payment_method: brandToMethod(card.brand),
        saved_card_id: card.id,
      };
      try {
        await buyNow({ id: uiSeatIdToApi(listing.id), body }).unwrap();
      } catch (err) {
        setBuyError(readApiErrorMessage(err) ?? 'Payment was declined or interrupted. Please try again.');
        return;
      }
    } else {
      setPaymentTouched(true);
      try {
        await validateBuyNowNewCardForm(paymentForm);
      } catch (err) {
        const msg =
          err instanceof yup.ValidationError
            ? err.errors[0] ?? 'Please fix the highlighted card fields.'
            : 'Please fix the highlighted card fields.';
        setBuyError(msg);
        return;
      }
      const digits = paymentForm.cardNumber.replace(/\D/g, '');
      const body: BuyNowRequest = {
        payment_method: paymentForm.method,
        saved_card_id: null,
        cardholder: paymentForm.cardholder.trim(),
        card_number: digits,
        expiry: paymentForm.expiry.trim(),
        cvv: paymentForm.cvv,
        save_card: paymentForm.saveCard,
      };
      try {
        await buyNow({ id: uiSeatIdToApi(listing.id), body }).unwrap();
      } catch (err) {
        setBuyError(readApiErrorMessage(err) ?? 'Payment was declined or interrupted. Please try again.');
        return;
      }
    }
    closeDialog();
    setSuccessCopy(
      `Auction won: ${listing.eventTitle || 'listing'} for ${listing.price} ${listing.currency ?? 'SAR'}.`,
    );
    pushNotification({
      kind: 'order',
      title: 'Auction won',
      body: `${listing.eventTitle || 'Auction listing'} · ${listing.price} ${listing.currency ?? 'SAR'}`,
      href: '/my-tickets',
    });
  }

  return (
    <div className="bg-ink-5/40 pb-20 pt-10">
      <div className="mx-auto max-w-[960px] px-6 lg:px-8">
        <Link to="/auction" className="text-[13px] font-semibold text-coral hover:underline">
          ← Auction
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={`aspect-video w-full max-w-md rounded-2xl sm:w-72 ${placeholderClass(eventId)}`}
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{header?.title ?? 'Event'}</h1>
            {(header?.venue || header?.city) && (
              <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-60">
                <MapPin size={18} className="text-coral" weight="bold" />
                {[header?.venue, header?.city].filter(Boolean).join(', ')}
              </p>
            )}
            <p className="mt-2 text-[13px] text-ink-40">
              {listings.length} resale listing{listings.length === 1 ? '' : 's'} · original price or less · listing
              commission when shown: <strong className="text-ink">{commissionHint}</strong>
            </p>
            <Link
              to={`/events/${eventId}`}
              className="mt-4 inline-block text-[13px] font-bold text-coral hover:underline"
            >
              View event details
            </Link>
          </div>
        </div>

        {successCopy && (
          <p className="mt-6 rounded-lg border border-mint/50 bg-mint/15 px-4 py-3 text-[13px] font-semibold text-mint-dark">
            {successCopy}
          </p>
        )}

        <ul className="mt-10 space-y-4">
          {listings.map((l) => {
            const ms = new Date(l.endsAt).getTime() - now;
            const ended = ms <= 0;
            const cur = l.currency ?? 'SAR';
            const listingActive = (l.listingStatus ?? 'active').toLowerCase() === 'active';
            const canInteract = !ended && listingActive;
            return (
              <li
                key={l.id}
                className="rounded-2xl border border-ink-10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {l.listingCode && (
                      <p className="font-mono text-[12px] font-semibold text-ink-50">{l.listingCode}</p>
                    )}
                    <p className="font-mono text-lg font-bold text-ink">
                      {l.price} {cur}
                    </p>
                    <p className="text-[12px] text-ink-40">Listed at up to {l.originalPrice} {cur}</p>
                    {(l.ticketTypeLabel || l.seatLabel) && (
                      <p className="mt-2 text-[13px] font-medium text-ink-60">
                        {[l.ticketTypeLabel, l.seatLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] text-ink-40">Seller: {l.sellerLabel}</p>
                    {!listingActive && (
                      <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-amber">
                        Listing {l.listingStatus ?? 'inactive'}
                      </p>
                    )}
                    {(l.highestBid != null || (l.bidsCount ?? 0) > 0) && (
                      <p className="mt-1 text-[12px] text-ink-60">
                        Highest bid: {l.highestBid != null ? `${l.highestBid} ${cur}` : '—'} ·{' '}
                        {l.bidsCount ?? 0} bid{(l.bidsCount ?? 0) === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Clock size={18} className="text-coral" />
                    {formatRemaining(ms)}
                  </div>
                </div>

                {canInteract && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {!user ? (
                      <Link
                        to={`/login?next=${encodeURIComponent(`/auction/events/${eventId}`)}`}
                        className="inline-flex items-center justify-center rounded-full border border-ink-10 px-4 py-2 text-[13px] font-semibold text-coral hover:underline"
                      >
                        Sign in to bid or buy
                      </Link>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="md"
                          className="sm:flex-1"
                          disabled={placingBid || buyingNow}
                          onClick={() => openBidDialog(l.id)}
                        >
                          Place bid
                        </Button>
                        <Button
                          variant="dark"
                          size="md"
                          className="sm:flex-1"
                          disabled={placingBid || buyingNow}
                          onClick={() => openBuyDialog(l.id)}
                        >
                          Buy now {l.price} {cur}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {ended && (
                  <p className="mt-4 text-[12px] text-ink-40">
                    This listing has ended.
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {listings.length === 0 && (
          <p className="mt-8 text-center text-[15px] text-ink-40">No listings for this event.</p>
        )}
      </div>

      <AnimatePresence>
        {dialog?.kind === 'bid' && activeListing && (
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
              <h2 className="text-lg font-extrabold text-ink">Place a bid</h2>
              <p className="mt-2 text-[13px] text-ink-60">
                Current ask:{' '}
                <strong className="font-mono text-ink">
                  {activeListing.price} {activeListing.currency ?? 'SAR'}
                </strong>{' '}
                · Highest bid:{' '}
                <strong className="font-mono text-ink">
                  {activeListing.highestBid != null
                    ? `${activeListing.highestBid} ${activeListing.currency ?? 'SAR'}`
                    : '—'}
                </strong>{' '}
                · {activeListing.bidsCount ?? 0} bid{(activeListing.bidsCount ?? 0) === 1 ? '' : 's'}
              </p>
              <label className="mt-4 block">
                <span className="text-[12px] font-semibold text-ink-60">
                  Your bid ({activeListing.currency ?? 'SAR'})
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={minimumBidFor(activeListing) + 1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] font-mono"
                />
              </label>
              {bidError && (
                <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
                  {bidError}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  loading={placingBid}
                  disabled={placingBid}
                  onClick={() => void submitBid(activeListing)}
                >
                  Place bid
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:flex-1"
                  disabled={placingBid}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialog?.kind === 'buy' && activeListing && (
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
              className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg"
            >
              <h2 className="text-lg font-extrabold text-ink">Buy now</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
                Buy this listing for{' '}
                <strong className="font-mono text-ink">
                  {activeListing.price} {activeListing.currency ?? 'SAR'}
                </strong>? Tickets transfer
                immediately on payment.
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-ink-60">Payment</p>
                <span className="rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-60">
                  Secure checkout
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-60">
                Use a saved card or enter a new card. Your card is charged when you confirm.
              </p>

              {user && savedCardsLoading && (
                <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-[58px] w-[180px] animate-pulse rounded-xl border border-ink-10 bg-ink-5/60"
                    />
                  ))}
                </div>
              )}

              {user && !savedCardsLoading && savedCardsError && (
                <p className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-[12px] text-ink">
                  Saved cards could not be loaded. You can still pay with a new card below.
                </p>
              )}

              {user && !savedCardsLoading && !savedCardsError && savedCards.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[12px] font-semibold text-ink-60">Use a saved card</p>
                  <div className="flex flex-wrap gap-2">
                    {savedCards.map((card) => {
                      const cardId = card.id;
                      const isSelected =
                        usingSavedCard && String(effectiveBuySavedCardId) === String(cardId);
                      return (
                        <button
                          key={String(cardId)}
                          type="button"
                          onClick={() => setBuySavedCardPick({ kind: 'saved', id: cardId })}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-ink bg-ink-5'
                              : 'border-ink-10 bg-white hover:border-ink-30',
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
                      onClick={() => setBuySavedCardPick({ kind: 'new' })}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left transition-colors',
                        !usingSavedCard ? 'border-ink bg-ink-5' : 'border-ink-10 bg-white hover:border-ink-30',
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
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {CARD_PAYMENT_METHODS.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      id={method.id}
                      label={method.label}
                      helper={method.helper}
                      selected={paymentForm.method === method.id}
                      onSelect={(selectedMethod) =>
                        setPaymentForm((prev) => ({ ...prev, method: selectedMethod }))
                      }
                    />
                  ))}
                </div>
              )}

              {!usingSavedCard && (
                <div className="mt-4 rounded-xl border border-ink-10 bg-ink-5/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-[12px] font-semibold text-ink-60">Cardholder name</span>
                      <input
                        value={paymentForm.cardholder}
                        onChange={(e) => onBuyPaymentFieldChange('cardholder', e.target.value)}
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
                        onChange={(e) => onBuyPaymentFieldChange('cardNumber', e.target.value)}
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
                        onChange={(e) => onBuyPaymentFieldChange('expiry', e.target.value)}
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
                        onChange={(e) => onBuyPaymentFieldChange('cvv', e.target.value)}
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
                      Your card is only stored if payment completes successfully. Checking this box does not call the
                      server by itself.
                    </p>
                  </div>
                </div>
              )}

              {usingSavedCard && selectedSavedCard && (
                <p className="mt-4 rounded-lg border border-ink-10 bg-ink-5/40 px-3 py-2 text-[12px] text-ink-60">
                  Paying with {formatCardBrand(selectedSavedCard.brand)} ending in •••• {selectedSavedCard.last4}. No
                  card details required.
                </p>
              )}

              {buyError && (
                <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
                  {buyError}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  loading={buyingNow}
                  disabled={!canSubmitBuy}
                  onClick={() => void submitBuyNow(activeListing)}
                >
                  Confirm purchase
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:flex-1"
                  disabled={buyingNow}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
