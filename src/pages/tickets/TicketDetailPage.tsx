import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { DownloadSimple, Gift, Gavel, Star, Wallet, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { TicketSummaryCard } from '@/components/tickets/TicketSummaryCard';
import { TicketQrPanel } from '@/components/tickets/TicketQrPanel';
import {
  useCancelAuctionMutation,
  useCancelTicketMutation,
  useCreateMyAuctionMutation,
  useGetMyTicketQuery,
  useGiftTicketMutation,
  useValidateTicketQrMutation,
} from '@/api/endpoints';
import type { CancelTicketResponse } from '@/api/types/ticket';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiTicketToMockTicket } from '@/lib/ticketMappers';
import { downloadTicketPdf } from '@/lib/ticketPdfDownload';
import { uiSeatIdToApi } from '@/lib/seatMappers';
import { ticketQrScanValue, useTicketQrDataUrl } from '@/lib/ticketQr';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();

  const ticketQueryId = ticketId ? uiSeatIdToApi(ticketId) : '';

  const {
    data: apiTicket,
    isLoading,
    isError,
    refetch,
  } = useGetMyTicketQuery({ id: ticketQueryId }, { skip: !ticketId || !user });

  const ticket = useMemo(() => (apiTicket ? apiTicketToMockTicket(apiTicket) : null), [apiTicket]);

  const scanValue = ticketQrScanValue(apiTicket ?? ticket?.ticketCode);

  const qr = useTicketQrDataUrl(scanValue);

  const [giftTicket, { isLoading: gifting }] = useGiftTicketMutation();
  const [cancelTicket, { isLoading: cancelling }] = useCancelTicketMutation();
  const [validateTicketQr, { isLoading: validatingQr }] = useValidateTicketQrMutation();
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
  const [cancelSummary, setCancelSummary] = useState<CancelTicketResponse['refund'] | null>(null);
  const [walletHint, setWalletHint] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [qrValidateResult, setQrValidateResult] = useState<'valid' | 'invalid' | null>(null);

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
        id: uiSeatIdToApi(ticket.id),
        body: { recipient: recipientTrim, message: giftMessage.trim() || undefined },
      }).unwrap();
      pushNotification({
        title: 'Gift sent',
        body: `Ticket for ${ticket.eventTitle} sent to ${recipientTrim}.`,
        kind: 'gift',
        href: '/my-tickets',
      });
      setGiftOpen(false);
      setRecipient('');
      setGiftMessage('');
      navigate('/my-tickets');
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
        id: uiSeatIdToApi(ticket.id),
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
      void refetch();
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not cancel this ticket. Please try again.');
    }
  }

  async function onDownloadPdf() {
    if (!ticket) return;
    setError(null);
    setPdfLoading(true);
    try {
      const dateRangeLabel = ticket.dateStart
        ? `${new Date(ticket.dateStart).toLocaleString()} — ${new Date(ticket.dateEnd || ticket.dateStart).toLocaleString()}`
        : 'Event schedule TBC';
      await downloadTicketPdf({
        scanValue,
        dataUrl: qr.dataUrl,
        meta: {
          eventTitle: ticket.eventTitle || 'Event',
          ticketCode: ticket.ticketCode,
          orderRef: ticket.orderRef,
          typeName: ticket.typeName || 'Ticket',
          seatLabel: ticket.seatLabel,
          venue: ticket.venue,
          city: ticket.city,
          dateRangeLabel,
          pricePaid: ticket.pricePaid,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build PDF. Try again.');
    } finally {
      setPdfLoading(false);
    }
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
      void refetch();
    } catch (err) {
      setError(readApiErrorMessage(err) ?? 'Could not list this ticket for auction.');
    }
  }

  async function onCancelListing() {
    if (!ticket || !ticket.listedAuctionId) return;
    setError(null);
    try {
      await cancelAuction({ id: uiSeatIdToApi(ticket.listedAuctionId) }).unwrap();
      void refetch();
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

        <h1 className="mt-6 text-2xl font-extrabold text-ink">{ticket.eventTitle || 'Event'}</h1>
        {ticket.ticketCode && (
          <p className="mt-2 font-mono text-[14px] font-semibold text-ink-60">{ticket.ticketCode}</p>
        )}
        <p className="mt-1 text-[14px] text-ink-60">
          {[ticket.venue, ticket.city].filter(Boolean).join(', ') || 'Venue TBC'}
        </p>
        <p className="mt-1 text-[13px] text-ink-40">
          {ticket.dateStart
            ? `${new Date(ticket.dateStart).toLocaleString()} — ${new Date(ticket.dateEnd || ticket.dateStart).toLocaleString()}`
            : 'Event schedule TBC'}
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
            {ticket.typeName || 'General admission'}
            {ticket.seatLabel ? ` · ${ticket.seatLabel}` : ''}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-ink-10 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Payment summary</p>
          <div className="mt-2 flex justify-between text-[14px]">
            <span className="text-ink-60">Ticket price</span>
            <span className="font-mono font-semibold text-ink">{ticket.pricePaid} SAR</span>
          </div>
          {apiTicket?.order_id != null && (
            <div className="mt-2 flex justify-between text-[12px] text-ink-40">
              <span className="font-mono">order_id</span>
              <span className="font-mono text-ink">{String(apiTicket.order_id)}</span>
            </div>
          )}
          <div className="mt-3 flex justify-between border-t border-ink-10 pt-3 text-[14px] font-bold">
            <span>Total paid</span>
            <span className="font-mono">{ticket.pricePaid} SAR</span>
          </div>
          <p className="mt-2 text-[12px] text-ink-40">
            Per-ticket amount from <span className="font-mono">price_paid</span>. Fees may be included in the order
            total on the server.
          </p>
        </div>

        <div className="mt-8">
          <TicketQrPanel
            dataUrl={qr.dataUrl}
            loading={qr.loading}
            error={qr.error}
            ticketCode={scanValue}
            status={ticket.status}
          />
          {apiTicket?.signed_qr_payload && ticket.status === 'active' && (
            <div className="mt-4 rounded-xl border border-ink-10 bg-ink-5/30 p-4">
              <p className="text-[12px] leading-relaxed text-ink-60">
                Optional authenticity check (holder only). The gate still scans the code above, not the encrypted
                payload.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                loading={validatingQr}
                disabled={validatingQr}
                onClick={async () => {
                  const signedPayload = apiTicket.signed_qr_payload?.trim();
                  if (!signedPayload) return;
                  setQrValidateResult(null);
                  try {
                    const res = await validateTicketQr({
                      id: uiSeatIdToApi(ticket.id),
                      body: { qr_payload: signedPayload },
                    }).unwrap();
                    setQrValidateResult(res.valid ? 'valid' : 'invalid');
                  } catch {
                    setQrValidateResult('invalid');
                  }
                }}
              >
                Verify ticket authenticity
              </Button>
              {qrValidateResult === 'valid' && (
                <p className="mt-2 text-[13px] font-semibold text-mint-dark">
                  Valid — this ticket matches the server record.
                </p>
              )}
              {qrValidateResult === 'invalid' && (
                <p className="mt-2 text-[13px] font-semibold text-coral">
                  Could not verify. Refresh the page or contact support if this persists.
                </p>
              )}
            </div>
          )}
        </div>

        {apiTicket && <TicketSummaryCard ticket={apiTicket} />}

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
            disabled={!canAct || pdfLoading || !scanValue}
            loading={pdfLoading}
            onClick={() => void onDownloadPdf()}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Wallet}
            disabled={!canAct}
            title="Wallet passes are not available in the app yet."
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
