import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { DownloadSimple, Gift, Gavel, Star, Wallet, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import {
  useCancelAuctionMutation,
  useCancelTicketMutation,
  useCreateMyAuctionMutation,
  useGetMyTicketQuery,
  useGiftTicketMutation,
} from '@/api/endpoints';
import type { CancelTicketResponse } from '@/api/types/ticket';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiTicketToMockTicket } from '@/lib/ticketMappers';
import { uiSeatIdToApi } from '@/lib/seatMappers';
import { listForAuctionSchema } from '@/schemas/auction';
import { cn } from '@/lib/utils';

type ApiError = { data?: { message?: string; errors?: Record<string, string[]> } };
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

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();

  const {
    data: apiTicket,
    isLoading,
    isError,
  } = useGetMyTicketQuery({ id: ticketId ?? '' }, { skip: !ticketId || !user });

  const ticket = useMemo(() => (apiTicket ? apiTicketToMockTicket(apiTicket) : null), [apiTicket]);

  const [giftTicket, { isLoading: gifting }] = useGiftTicketMutation();
  const [cancelTicket, { isLoading: cancelling }] = useCancelTicketMutation();
  const [createMyAuction, { isLoading: listingForAuction }] = useCreateMyAuctionMutation();
  const [cancelAuction, { isLoading: cancellingAuction }] = useCancelAuctionMutation();

  const [giftOpen, setGiftOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [refundRequested, setRefundRequested] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giftDone, setGiftDone] = useState(false);
  const [cancelSummary, setCancelSummary] = useState<CancelTicketResponse['refund'] | null>(null);
  const [walletHint, setWalletHint] = useState(false);

  useEffect(() => {
    setError(null);
  }, [giftOpen, cancelOpen, auctionOpen]);

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(`/my-tickets/${ticketId ?? ''}`)}`} replace />;
  }
  if (!ticketId) {
    return <Navigate to="/my-tickets" replace />;
  }
  if (isLoading) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }
  if (isError || !ticket) {
    return <Navigate to="/my-tickets" replace />;
  }

  const canGift = ticket.status === 'active' && !ticket.receivedAsGift && !ticket.fromAuction;
  const canCancel = ticket.status === 'active' && !ticket.fromAuction;
  const canAuction = ticket.status === 'active' && !ticket.receivedAsGift && !ticket.fromAuction;
  const canAct = ticket.status === 'active';

  async function onConfirmGift(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setError(null);
    const recipientTrim = recipient.trim();
    if (!recipientTrim) {
      setError('Enter an email or username.');
      return;
    }
    try {
      await giftTicket({
        id: ticket.id,
        body: { recipient: recipientTrim, message: giftMessage.trim() || undefined },
      }).unwrap();
      pushNotification({
        title: 'Gift sent',
        body: `Ticket for ${ticket.eventTitle} sent to ${recipientTrim}.`,
        kind: 'gift',
        href: '/my-tickets',
      });
      setGiftDone(true);
      setGiftOpen(false);
      setRecipient('');
      setGiftMessage('');
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not send gift. Please try again.');
    }
  }

  async function onConfirmCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setError(null);
    try {
      const res = await cancelTicket({
        id: ticket.id,
        body: {
          reason: cancelReason.trim() || undefined,
          refund_requested: refundRequested,
        },
      }).unwrap();
      setCancelSummary(res.refund ?? null);
      pushNotification({
        title: 'Ticket cancelled',
        body: `Cancellation requested for ${ticket.eventTitle}.`,
        kind: 'order',
        href: '/my-tickets',
      });
      setCancelOpen(false);
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not cancel this ticket. Please try again.');
    }
  }

  function downloadTicketMock() {
    if (!ticket) return;
    const lines = [
      'MyTicket — demo receipt',
      `Order: ${ticket.orderRef}`,
      `Event: ${ticket.eventTitle}`,
      `${ticket.venue}, ${ticket.city}`,
      `Starts: ${ticket.dateStart}`,
      `${ticket.typeName}${ticket.seatLabel ? ` · ${ticket.seatLabel}` : ''}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myticket-${ticket.orderRef.replace(/[^\w-]+/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onConfirmAuction(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setError(null);
    const priceNumber = Number(listPrice);
    const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    try {
      await listForAuctionSchema.validate(
        { ticket_id: ticket.id, price: priceNumber, ends_at: endsAt },
        { context: { originalPrice: ticket.pricePaid } }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid listing details.');
      return;
    }
    try {
      await createMyAuction({
        ticket_id: uiSeatIdToApi(ticket.id),
        price: priceNumber,
        ends_at: endsAt,
      }).unwrap();
      setAuctionOpen(false);
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not list this ticket for auction.');
    }
  }

  async function onCancelListing() {
    if (!ticket || !ticket.listedAuctionId) return;
    setError(null);
    try {
      await cancelAuction({ id: uiSeatIdToApi(ticket.listedAuctionId) }).unwrap();
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not cancel this listing.');
    }
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6">
        <Link to="/my-tickets" className="text-[13px] font-semibold text-coral hover:underline">
          ← My tickets
        </Link>

        <h1 className="mt-6 text-2xl font-extrabold text-ink">{ticket.eventTitle}</h1>
        <p className="mt-1 text-[14px] text-ink-60">
          {ticket.venue}, {ticket.city}
        </p>
        <p className="mt-1 text-[13px] text-ink-40">
          {new Date(ticket.dateStart).toLocaleString()} — {new Date(ticket.dateEnd).toLocaleString()}
        </p>

        {ticket.status === 'active' && (
          <div className="mt-6 rounded-xl border border-sky/40 bg-sky/10 px-4 py-3 text-[13px] text-ink-60">
            Reminders: typical sends at <strong className="text-ink">24h</strong> and{' '}
            <strong className="text-ink">1h</strong> before doors (channels configured by admin).
          </div>
        )}

        {walletHint && (
          <p className="mt-4 rounded-lg bg-sky/20 px-4 py-2 text-[13px] text-ink">
            Would open Apple Wallet / Google Wallet with a pass for this ticket (demo).
          </p>
        )}

        {giftDone && (
          <p className="mt-4 rounded-lg bg-mint/20 px-4 py-2 text-[13px] text-ink">
            Gift sent — recipient has been notified.
          </p>
        )}

        {cancelSummary && (
          <div className="mt-4 rounded-xl border border-amber/50 bg-amber/10 p-4 text-[13px] text-ink-60">
            <p className="font-semibold text-ink">Refund queued</p>
            <p className="mt-1">
              Amount: <span className="font-mono font-bold text-ink">{Number(cancelSummary.amount)} SAR</span> ·
              Status: <span className="font-bold text-ink">{cancelSummary.status}</span>
            </p>
          </div>
        )}
        {ticket.status === 'cancelled' && !cancelSummary && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-[13px] text-red-800">
            This ticket has been cancelled.
          </p>
        )}
        {ticket.status === 'refunded' && (
          <p className="mt-4 rounded-lg bg-purple-50 px-4 py-2 text-[13px] text-purple-800">
            This ticket has been refunded.
          </p>
        )}

        <div className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Order / receipt</p>
          <p className="mt-1 font-mono text-lg font-bold text-ink">{ticket.orderRef}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-40">Ticket</p>
          <p className="mt-1 font-semibold text-ink">
            {ticket.typeName}
            {ticket.seatLabel ? ` · ${ticket.seatLabel}` : ''}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-ink-10 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Payment summary</p>
          <div className="mt-2 flex justify-between text-[14px]">
            <span className="text-ink-60">Ticket</span>
            <span className="font-mono font-semibold text-ink">{ticket.pricePaid} SAR</span>
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-ink-40">
            <span>Fees (included in demo)</span>
            <span>—</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-ink-10 pt-3 text-[14px] font-bold">
            <span>Total paid</span>
            <span className="font-mono">{ticket.pricePaid} SAR</span>
          </div>
          <p className="mt-2 text-[12px] text-ink-40">Payment method: mock card (demo)</p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-ink-20 bg-white">
            <div className="text-center text-[11px] text-ink-40">
              QR preview
              <div
                className="mx-auto mt-2 h-24 w-24 bg-ink-5"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, transparent 2px, transparent 6px)',
                }}
              />
            </div>
          </div>
        </div>

        {ticket.status === 'used' && (
          <div className="mt-8 rounded-2xl border border-lemon bg-lemon/15 p-6">
            <p className="font-extrabold text-ink">How was the event?</p>
            <p className="mt-2 text-[13px] text-ink-60">Star ratings only — one rating per event.</p>
            <Link
              to={`/events/${ticket.eventId}#rate`}
              className={cn(
                'mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-80'
              )}
            >
              <Star size={18} weight="fill" className="text-lemon" />
              Rate this event
            </Link>
          </div>
        )}

        {ticket.status === 'auction' && ticket.listedAuctionId && (
          <div className="mt-8 rounded-xl border border-amber/50 bg-amber/10 p-4">
            <p className="text-[14px] font-semibold text-ink">Listed for resale</p>
            <p className="mt-1 text-[13px] text-ink-60">
              Your listing is visible in the auction area. You can cancel before it sells.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void onCancelListing()}
              loading={cancellingAuction}
              disabled={cancellingAuction}
            >
              Cancel listing
            </Button>
          </div>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            size="md"
            icon={DownloadSimple}
            disabled={!canAct}
            onClick={() => downloadTicketMock()}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Wallet}
            disabled={!canAct}
            onClick={() => setWalletHint(true)}
          >
            Add to Wallet
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={Gift}
            disabled={!canGift}
            onClick={() => setGiftOpen(true)}
          >
            Gift ticket
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={Gavel}
            disabled={!canAuction}
            onClick={() => {
              setListPrice(String(ticket.pricePaid));
              setAuctionOpen(true);
            }}
          >
            Drop to auction
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={XCircle}
            disabled={!canCancel}
            className="sm:col-span-2"
            onClick={() => {
              setCancelReason('');
              setRefundRequested(true);
              setCancelOpen(true);
            }}
          >
            Cancel ticket
          </Button>
        </div>
        {!canAct && ticket.status !== 'auction' && (
          <p className="mt-4 text-center text-[12px] text-ink-40">
            Primary actions apply to active tickets. Auction listings can be cancelled above.
          </p>
        )}
      </div>

      {giftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
            <h2 className="text-lg font-extrabold text-ink">Gift ticket</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-60">
              Enter recipient email or phone. Gifts are free; gifted tickets cannot be re-gifted; auction tickets
              cannot be gifted.
            </p>
            <form onSubmit={onConfirmGift} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Email or phone</span>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  placeholder="friend@example.com"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Message (optional)</span>
                <textarea
                  rows={3}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  maxLength={280}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  placeholder="Have a great time!"
                />
              </label>
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setGiftOpen(false)}
                  disabled={gifting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="dark" className="flex-1" loading={gifting} disabled={gifting}>
                  Send gift
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
            <h2 className="text-lg font-extrabold text-ink">Cancel ticket</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-60">
              Cancelling releases the ticket. If you opt for a refund, the request goes to the organizer per the
              refund policy.
            </p>
            <form onSubmit={onConfirmCancel} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Reason (optional)</span>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  maxLength={500}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input
                  type="checkbox"
                  checked={refundRequested}
                  onChange={(e) => setRefundRequested(e.target.checked)}
                />
                Request a refund
              </label>
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCancelOpen(false)}
                  disabled={cancelling}
                >
                  Keep ticket
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  loading={cancelling}
                  disabled={cancelling}
                >
                  Confirm cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {auctionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-card-lg">
            <h2 className="text-lg font-extrabold text-ink">List for auction</h2>
            <p className="mt-2 text-[13px] text-ink-60">
              Max price: {ticket.pricePaid} SAR (original or less). Listing ends in 48h (demo).
            </p>
            <form onSubmit={onConfirmAuction} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Your price (SAR)</span>
                <input
                  type="number"
                  required
                  min={1}
                  max={ticket.pricePaid}
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 font-mono text-[14px]"
                />
              </label>
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAuctionOpen(false)}
                  disabled={listingForAuction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="dark"
                  className="flex-1"
                  loading={listingForAuction}
                  disabled={listingForAuction}
                >
                  List ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
