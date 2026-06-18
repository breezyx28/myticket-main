import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { TicketDetailActions } from '@/components/tickets/TicketDetailActions';
import { AdmitOneTicket } from '@/components/tickets/admit-one/AdmitOneTicket';
import { AdmitOneTicketFrame } from '@/components/tickets/admit-one/AdmitOneTicketFrame';
import { mapAdmitOneTicketViewModel } from '@/components/tickets/admit-one/admitOneTicketModel';
import { pickCoverUrl, resolveEventSlug } from '@/components/tickets/admit-one/resolveEventCover';
import { TicketInvoiceDocument } from '@/components/tickets/TicketInvoiceDocument';
import {
  useCancelAuctionMutation,
  useCancelTicketMutation,
  useCreateMyAuctionMutation,
  useGetEventBySlugQuery,
  useGetMyTicketQuery,
  useGiftTicketMutation,
  useListEventsQuery,
  useValidateTicketQrMutation,
} from '@/api/endpoints';
import type { CancelTicketResponse } from '@/api/types/ticket';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiTicketToMockTicket } from '@/lib/ticketMappers';
import { downloadAdmitOneTicketPdf } from '@/lib/admitOneTicketPdf';
import { toSameOriginStorageUrl } from '@/lib/storageUrl';
import { uiSeatIdToApi } from '@/lib/seatMappers';
import type { AppLanguage } from '@/lib/language';
import { ticketQrScanValue, useTicketQrDataUrl } from '@/lib/ticketQr';
import { createListForAuctionSchema } from '@/schemas/auction';

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
  const { t: tValidation, i18n } = useTranslation('validation');
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation('common');
  const language = i18n.language as AppLanguage;
  const listForAuctionSchema = useMemo(
    () => createListForAuctionSchema(tValidation),
    [tValidation, i18n.language],
  );
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

  const eventSlug = useMemo(
    () => (ticket ? resolveEventSlug(ticket, apiTicket) : null),
    [ticket, apiTicket],
  );

  const ticketCoverFromApi = useMemo(() => pickCoverUrl(apiTicket), [apiTicket]);

  const { data: eventDetail } = useGetEventBySlugQuery(
    { slug: eventSlug! },
    { skip: !eventSlug || !!ticketCoverFromApi },
  );

  const { data: eventsPage } = useListEventsQuery(
    { per_page: 50 },
    { skip: !ticket || !!ticketCoverFromApi || !!eventSlug },
  );

  const eventCoverUrl = useMemo(() => {
    let raw: string | null = null;
    if (ticketCoverFromApi) raw = ticketCoverFromApi;
    else if (eventDetail?.cover_image_url) raw = eventDetail.cover_image_url;
    else if (ticket) {
      const eventId = apiTicket?.event_id ?? ticket.eventId;
      const match = eventsPage?.data?.find((row) => String(row.id) === String(eventId));
      raw = match?.cover_image_url ?? null;
    }
    return toSameOriginStorageUrl(raw);
  }, [ticketCoverFromApi, eventDetail, eventsPage, ticket, apiTicket]);

  const admitOneModel = useMemo(
    () =>
      ticket
        ? mapAdmitOneTicketViewModel(ticket, t, language, apiTicket, scanValue, eventCoverUrl)
        : null,
    [ticket, t, language, apiTicket, scanValue, eventCoverUrl],
  );

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
  const [pdfError, setPdfError] = useState<string | null>(null);
  const displayTicketRef = useRef<HTMLDivElement>(null);
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
        <p className="text-[14px] font-medium text-ink-40">{t('detail.loading')}</p>
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
      setError(t('detail.enterRecipient'));
      return;
    }
    try {
      await giftTicket({
        id: uiSeatIdToApi(ticket.id),
        body: { recipient: recipientTrim, message: giftMessage.trim() || undefined },
      }).unwrap();
      pushNotification({
        title: t('detail.giftSent'),
        body: t('detail.giftSentBody'),
        kind: 'gift',
        href: '/my-tickets',
      });
      setGiftOpen(false);
      setRecipient('');
      setGiftMessage('');
      navigate('/my-tickets');
    } catch (err) {
      setError(readApiErrorMessage(err) ?? t('detail.giftFailed'));
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
        title: t('detail.ticketCancelled'),
        body: t('detail.ticketCancelled'),
        kind: 'order',
        href: '/my-tickets',
      });
      setCancelOpen(false);
      void refetch();
    } catch (err) {
      setError(readApiErrorMessage(err) ?? t('detail.cancelFailed'));
    }
  }

  async function onDownloadPdf() {
    if (!ticket) return;
    if (!displayTicketRef.current) {
      setPdfError(t('detail.pdfNotReady'));
      return;
    }
    if (!qr.dataUrl) {
      setPdfError(t('detail.qrNotReady'));
      return;
    }
    setPdfError(null);
    setPdfLoading(true);
    try {
      await downloadAdmitOneTicketPdf(
        displayTicketRef.current,
        ticket.ticketCode ?? ticket.orderRef,
      );
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : t('detail.pdfFailed'));
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
      setError(err instanceof Error ? err.message : t('detail.invalidListing'));
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
      setError(readApiErrorMessage(err) ?? t('detail.auctionFailed'));
    }
  }

  async function onCancelListing() {
    if (!ticket || !ticket.listedAuctionId) return;
    setError(null);
    try {
      await cancelAuction({ id: uiSeatIdToApi(ticket.listedAuctionId) }).unwrap();
      void refetch();
    } catch (err) {
      setError(readApiErrorMessage(err) ?? t('detail.cancelListingFailed'));
    }
  }

  return (
    <div className="min-h-screen bg-ink-5 pb-24 pt-8">
      <div className="mx-auto max-w-[900px] px-6 lg:px-8">
        <Link
          to="/my-tickets"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral transition-colors hover:text-coral/80"
        >
          <span aria-hidden>←</span> {t('detail.backToTickets')}
        </Link>

        <div className="mt-8">
          {admitOneModel && (
            <section className="mb-8 rounded-3xl bg-coral/10 p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-ink-60">{t('detail.yourTicket')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={DownloadSimple}
                  loading={pdfLoading}
                  disabled={pdfLoading || !qr.dataUrl}
                  onClick={() => void onDownloadPdf()}
                >
                  {t('detail.downloadPdf')}
                </Button>
              </div>
              {pdfError ? <p className="mb-3 text-[13px] text-red-600">{pdfError}</p> : null}
              <AdmitOneTicketFrame>
                <AdmitOneTicket
                  ref={displayTicketRef}
                  variant="display"
                  model={admitOneModel}
                  qrDataUrl={qr.dataUrl}
                  qrLoading={qr.loading}
                />
              </AdmitOneTicketFrame>
            </section>
          )}

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
                <p className="font-semibold text-ink">{t('detail.refundQueued')}</p>
                <p className="mt-1">
                  {t('detail.amountLabel')}{' '}
                  <span className="font-mono font-bold text-ink">{Number(cancelSummary.amount)} SAR</span> ·{' '}
                  {t('detail.statusLabel')}{' '}
                  <span className="font-bold text-ink">{cancelSummary.status}</span>
                </p>
              </div>
            )}
            {ticket.status === 'cancelled' && !cancelSummary && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[13px] text-red-800">
                {t('detail.ticketCancelledBanner')}
              </div>
            )}
            {ticket.status === 'refunded' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3.5 text-[13px] text-purple-800">
                {t('detail.ticketRefundedBanner')}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-6">
          {apiTicket?.signed_qr_payload && ticket.status === 'active' && (
            <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
              <SectionHeading title={t('detail.verifyTitle')} description={t('detail.verifyDesc')} />
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
                {t('detail.verifyButton')}
              </Button>
              {qrValidateResult === 'valid' && (
                <p className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-[13px] font-semibold text-mint-dark">
                  {t('detail.verifyValid')}
                </p>
              )}
              {qrValidateResult === 'mismatch' && (
                <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-[13px] leading-relaxed font-semibold text-coral">
                  {t('detail.verifyMismatch')}
                </p>
              )}
              {qrValidateResult === 'error' && (
                <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-[13px] font-semibold text-coral">
                  {t('detail.verifyError')}
                </p>
              )}
            </section>
          )}

          {ticket.status === 'used' && (
            <section className="rounded-2xl border border-lemon/60 bg-lemon/15 p-6 lg:p-8">
              <SectionHeading title={t('detail.rateTitle')} description={t('detail.rateDesc')} />
              <Link
                to={`/events/${ticket.eventId}#rate`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-80"
              >
                <Star size={18} weight="fill" className="text-lemon" />
                {t('detail.rateEvent')}
              </Link>
            </section>
          )}

          {ticket.status === 'auction' && ticket.listedAuctionId && (
            <section className="rounded-2xl border border-amber/40 bg-amber/10 p-6">
              <SectionHeading title={t('detail.listedTitle')} description={t('detail.listedDesc')} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onCancelListing()}
                loading={cancellingAuction}
                disabled={cancellingAuction}
              >
                {t('detail.cancelListing')}
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
            qrReady={Boolean(qr.dataUrl)}
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
            <h2 className="text-lg font-extrabold text-ink">{t('detail.giftTicket')}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-60">{t('detail.giftModalDesc')}</p>
            <form onSubmit={onConfirmGift} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('detail.emailOrPhone')}</span>
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
                <span className="text-[12px] font-semibold text-ink-60">{t('detail.messageOptional')}</span>
                <textarea
                  rows={3}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  maxLength={280}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  placeholder={t('detail.giftPlaceholder')}
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
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" variant="dark" className="flex-1" loading={gifting} disabled={gifting}>
                  {t('detail.sendGift')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
            <h2 className="text-lg font-extrabold text-ink">{t('detail.cancelTicket')}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-60">{t('detail.cancelModalDesc')}</p>
            <form onSubmit={onConfirmCancel} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('detail.reasonOptional')}</span>
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
                {t('detail.requestRefund')}
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
                  {t('detail.keepTicket')}
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  loading={cancelling}
                  disabled={cancelling}
                >
                  {t('detail.confirmCancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {auctionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-card-lg">
            <h2 className="text-lg font-extrabold text-ink">{t('detail.listForAuction')}</h2>
            <p className="mt-2 text-[13px] text-ink-60">
              {t('detail.auctionModalDesc', { price: ticket.pricePaid })}
            </p>
            <form onSubmit={onConfirmAuction} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('detail.yourPrice')}</span>
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
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="dark"
                  className="flex-1"
                  loading={listingForAuction}
                  disabled={listingForAuction}
                >
                  {t('detail.listTicket')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
