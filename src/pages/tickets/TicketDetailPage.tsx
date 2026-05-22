import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarBlank,
  DownloadSimple,
  Gift,
  Gavel,
  MapPin,
  Star,
  Ticket,
  Wallet,
  XCircle,
} from '@phosphor-icons/react';
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

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-mint/15 text-mint-dark border-mint/30',
  auction: 'bg-amber/15 text-amber border-amber/40',
  gifted: 'bg-sky/15 text-sky border-sky/40',
  used: 'bg-ink-5 text-ink-60 border-ink-10',
  expired: 'bg-ink-5 text-ink-40 border-ink-10',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
  refunded: 'bg-purple-50 text-purple-800 border-purple-200',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  auction: 'In auction',
  gifted: 'Gifted',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">{title}</h2>
      {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{description}</p> : null}
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-ink-5/60 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-coral shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
        <p className={cn('mt-0.5 text-[14px] font-semibold leading-snug text-ink', mono && 'font-mono')}>
          {value}
        </p>
      </div>
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

  const statusKey = ticket.status in STATUS_STYLES ? ticket.status : 'active';
  const eventWhenLabel = ticket.dateStart
    ? `${new Date(ticket.dateStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} — ${new Date(ticket.dateEnd || ticket.dateStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
    : 'Event schedule TBC';
  const venueLabel = [ticket.venue, ticket.city].filter(Boolean).join(', ') || 'Venue TBC';

  return (
    <div className="min-h-screen bg-ink-5/30 pb-24 pt-8">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <Link
          to="/my-tickets"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral transition-colors hover:text-coral/80"
        >
          <span aria-hidden>←</span> My tickets
        </Link>

        <header className="mt-8 rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={cn(
                'inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                STATUS_STYLES[statusKey],
              )}
            >
              {STATUS_LABEL[statusKey] ?? ticket.status}
            </span>
            {ticket.ticketCode ? (
              <span className="font-mono text-[12px] font-semibold text-ink-40">{ticket.ticketCode}</span>
            ) : null}
          </div>
          <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight text-ink lg:text-[32px]">
            {ticket.eventTitle || 'Event'}
          </h1>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetaItem
              icon={<MapPin size={20} weight="duotone" />}
              label="Venue"
              value={venueLabel}
            />
            <MetaItem
              icon={<CalendarBlank size={20} weight="duotone" />}
              label="Event time"
              value={eventWhenLabel}
            />
            <MetaItem
              icon={<Ticket size={20} weight="duotone" />}
              label="Admission"
              value={
                ticket.seatLabel
                  ? `${ticket.typeName || 'General admission'} · ${ticket.seatLabel}`
                  : ticket.typeName || 'General admission'
              }
            />
            <MetaItem icon={<Ticket size={20} weight="duotone" />} label="Order" value={ticket.orderRef} mono />
          </dl>
        </header>

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

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-10">
            <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
              <SectionHeading
                title="Entry at venue"
                description="Show this QR at the gate. Increase screen brightness for best results."
              />
              <TicketQrPanel
                dataUrl={qr.dataUrl}
                loading={qr.loading}
                error={qr.error}
                ticketCode={scanValue}
                status={ticket.status}
              />
              {apiTicket?.signed_qr_payload && ticket.status === 'active' && (
                <div className="mt-6 rounded-xl border border-dashed border-ink-10 bg-ink-5/50 p-4 lg:p-5">
                  <p className="text-[12px] leading-relaxed text-ink-60">
                    Optional authenticity check (holder only). The gate still scans the code above, not the encrypted
                    payload.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    loading={validatingQr}
                    disabled={validatingQr}
                    onClick={async () => {
                      setQrValidateResult(null);
                      try {
                        const { data: fresh } = await refetch();
                        const signedPayload = (
                          fresh?.signed_qr_payload ?? apiTicket.signed_qr_payload
                        )?.trim();
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
                      Your entry QR code above is unchanged. Refresh this page once (the server may repair legacy tickets
                      on load), then try again. If it still fails, contact support.
                    </p>
                  )}
                  {qrValidateResult === 'error' && (
                    <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-[13px] font-semibold text-coral">
                      Could not reach the verify service. Check your connection and try again.
                    </p>
                  )}
                </div>
              )}
            </section>

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

            <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
              <SectionHeading title="Manage ticket" description="Download, transfer, or cancel this ticket." />
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-ink-40">Save &amp; wallet</p>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </div>
                </div>
                <div className="border-t border-ink-10 pt-6">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-ink-40">Transfer &amp; resale</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="secondary" size="md" icon={Gift} disabled={!canGift} onClick={() => setGiftOpen(true)}>
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
                  </div>
                </div>
                <div className="border-t border-ink-10 pt-6">
                  <Button
                    variant="outline"
                    size="md"
                    icon={XCircle}
                    disabled={!canCancel}
                    className="w-full"
                    onClick={() => {
                      setCancelReason('');
                      setRefundRequested(true);
                      setCancelOpen(true);
                    }}
                  >
                    Cancel ticket
                  </Button>
                  {!canAct && ticket.status !== 'auction' && (
                    <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-40">
                      Primary actions apply to active tickets. Auction listings can be cancelled above.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm">
              <SectionHeading title="Receipt" />
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">Order reference</p>
                  <p className="mt-1 font-mono text-[18px] font-bold text-ink">{ticket.orderRef}</p>
                </div>
                <div className="border-t border-ink-10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">Ticket</p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">
                    {ticket.typeName || 'General admission'}
                    {ticket.seatLabel ? (
                      <span className="mt-0.5 block text-[13px] font-medium text-ink-60">Seat {ticket.seatLabel}</span>
                    ) : null}
                  </p>
                </div>
                <div className="border-t border-ink-10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">Payment</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-ink-60">Ticket price</span>
                      <span className="font-mono font-semibold text-ink">{ticket.pricePaid} SAR</span>
                    </div>
                    {apiTicket?.order_id != null && (
                      <div className="flex items-center justify-between text-[12px] text-ink-40">
                        <span>Order ID</span>
                        <span className="font-mono text-ink">{String(apiTicket.order_id)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-ink-10 pt-3 text-[15px] font-bold text-ink">
                      <span>Total paid</span>
                      <span className="font-mono">{ticket.pricePaid} SAR</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-40">
                    Per-ticket amount from price_paid. Fees may be included in the order total on the server.
                  </p>
                </div>
              </div>
            </section>

            {apiTicket ? (
              <div className="[&>section]:mt-0 [&>section]:shadow-sm">
                <TicketSummaryCard ticket={apiTicket} />
              </div>
            ) : null}
          </aside>
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
