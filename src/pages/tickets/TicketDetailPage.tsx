import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Star } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { TicketDetailActions } from '@/components/tickets/TicketDetailActions';
import { TicketInvoiceDocument } from '@/components/tickets/TicketInvoiceDocument';
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

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">{title}</h2>
      {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{description}</p> : null}
    </div>
  );
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
  /** `mismatch` = HTTP OK but `valid: false`; `error` = request failed */
  const [qrValidateResult, setQrValidateResult] = useState<'valid' | 'mismatch' | 'error' | null>(null);

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-ink-5/30 px-6">
        <p className="text-[14px] font-medium text-ink-40">Loading your ticket…</p>
      </div>
    );
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
    <div className="min-h-screen bg-ink-5 pb-24 pt-8">
      <div className="mx-auto max-w-[900px] px-6 lg:px-8">
        <Link
          to="/my-tickets"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral transition-colors hover:text-coral/80"
        >
          <span aria-hidden>←</span> My tickets
        </Link>

        <div className="mt-8">
          <TicketInvoiceDocument
            ticket={ticket}
            apiTicket={apiTicket}
            qr={qr}
            scanValue={scanValue}
            attendee={{
              name: user.name,
              email: user.email,
              phone: user.phone,
            }}
          />
        </div>

        {(ticket.status === 'active' ||
          walletHint ||
          cancelSummary ||
          (ticket.status === 'cancelled' && !cancelSummary) ||
          ticket.status === 'refunded') && (
          <div className="mt-6 space-y-3">
            {ticket.status === 'active' && (
              <div className="rounded-xl border border-sky/30 bg-sky/10 px-4 py-3.5 text-[13px] leading-relaxed text-ink-60">
                Reminders are typically sent <strong className="text-ink">24h</strong> and{' '}
                <strong className="text-ink">1h</strong> before doors (channels configured by admin).
              </div>
            )}
            {walletHint && (
              <div className="rounded-xl border border-sky/30 bg-sky/10 px-4 py-3.5 text-[13px] text-ink">
                Would open Apple Wallet / Google Wallet with a pass for this ticket (demo).
              </div>
            )}
            {cancelSummary && (
              <div className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3.5 text-[13px] text-ink-60">
                <p className="font-semibold text-ink">Refund queued</p>
                <p className="mt-1">
                  Amount:{' '}
                  <span className="font-mono font-bold text-ink">{Number(cancelSummary.amount)} SAR</span> · Status:{' '}
                  <span className="font-bold text-ink">{cancelSummary.status}</span>
                </p>
              </div>
            )}
            {ticket.status === 'cancelled' && !cancelSummary && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[13px] text-red-800">
                This ticket has been cancelled.
              </div>
            )}
            {ticket.status === 'refunded' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3.5 text-[13px] text-purple-800">
                This ticket has been refunded.
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-6">
          {apiTicket?.signed_qr_payload && ticket.status === 'active' && (
            <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
              <SectionHeading
                title="Verify authenticity"
                description="Optional check for ticket holders. The gate scans the QR on your ticket document, not the encrypted payload."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={validatingQr}
                disabled={validatingQr}
                onClick={async () => {
                  setQrValidateResult(null);
                  try {
                    const { data: fresh } = await refetch();
                    const signedPayload = (fresh?.signed_qr_payload ?? apiTicket.signed_qr_payload)?.trim();
                    if (!signedPayload) {
                      setQrValidateResult('error');
                      return;
                    }
                    const res = await validateTicketQr({
                      id: uiSeatIdToApi(ticket.id),
                      body: { qr_payload: signedPayload },
                    }).unwrap();
                    setQrValidateResult(res.valid ? 'valid' : 'mismatch');
                  } catch {
                    setQrValidateResult('error');
                  }
                }}
              >
                Verify ticket authenticity
              </Button>
              {qrValidateResult === 'valid' && (
                <p className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-[13px] font-semibold text-mint-dark">
                  Valid — this ticket matches the server record.
                </p>
              )}
              {qrValidateResult === 'mismatch' && (
                <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-[13px] leading-relaxed font-semibold text-coral">
                  Authenticity check failed — the encrypted payload on this page does not match the server record.
                  Your entry QR code is unchanged. Refresh this page once (the server may repair legacy tickets on
                  load), then try again. If it still fails, contact support.
                </p>
              )}
              {qrValidateResult === 'error' && (
                <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-[13px] font-semibold text-coral">
                  Could not reach the verify service. Check your connection and try again.
                </p>
              )}
            </section>
          )}

          {ticket.status === 'used' && (
            <section className="rounded-2xl border border-lemon/60 bg-lemon/15 p-6 lg:p-8">
              <SectionHeading
                title="Rate your experience"
                description="Star ratings only — one rating per event."
              />
              <Link
                to={`/events/${ticket.eventId}#rate`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-80"
              >
                <Star size={18} weight="fill" className="text-lemon" />
                Rate this event
              </Link>
            </section>
          )}

          {ticket.status === 'auction' && ticket.listedAuctionId && (
            <section className="rounded-2xl border border-amber/40 bg-amber/10 p-6">
              <SectionHeading
                title="Listed for resale"
                description="Your listing is visible in the auction area. You can cancel before it sells."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onCancelListing()}
                loading={cancellingAuction}
                disabled={cancellingAuction}
              >
                Cancel listing
              </Button>
            </section>
          )}

          <TicketDetailActions
            canAct={canAct}
            canGift={canGift}
            canCancel={canCancel}
            canAuction={canAuction}
            pdfLoading={pdfLoading}
            scanValue={scanValue}
            ticketStatus={ticket.status}
            onDownloadPdf={() => void onDownloadPdf()}
            onWalletHint={() => setWalletHint(true)}
            onGiftOpen={() => setGiftOpen(true)}
            onAuctionOpen={() => {
              setListPrice(String(ticket.pricePaid));
              setAuctionOpen(true);
            }}
            onCancelOpen={() => {
              setCancelReason('');
              setRefundRequested(true);
              setCancelOpen(true);
            }}
          />
        </div>
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
