import { useTranslation } from 'react-i18next';
import {
  DownloadSimple,
  Gift,
  Gavel,
  Wallet,
  XCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';

type TicketDetailActionsProps = {
  canAct: boolean;
  canGift: boolean;
  canCancel: boolean;
  canAuction: boolean;
  pdfLoading: boolean;
  scanValue: string | null;
  qrReady?: boolean;
  onDownloadPdf: () => void;
  onWalletHint: () => void;
  onGiftOpen: () => void;
  onAuctionOpen: () => void;
  onCancelOpen: () => void;
  ticketStatus: string;
};

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">{title}</h2>
      {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{description}</p> : null}
    </div>
  );
}

export function TicketDetailActions({
  canAct,
  canGift,
  canCancel,
  canAuction,
  pdfLoading,
  scanValue,
  qrReady = true,
  onDownloadPdf,
  onWalletHint,
  onGiftOpen,
  onAuctionOpen,
  onCancelOpen,
  ticketStatus,
}: TicketDetailActionsProps) {
  const { t } = useTranslation('tickets');

  return (
    <section className="rounded-2xl border border-ink-10 bg-white p-6 shadow-sm lg:p-8">
      <SectionHeading title={t('detail.manageTicket')} description={t('detail.manageDesc')} />
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-ink-40">
            {t('detail.saveAndWallet')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              size="md"
              icon={DownloadSimple}
              disabled={!canAct || pdfLoading || !scanValue || !qrReady}
              loading={pdfLoading}
              onClick={onDownloadPdf}
            >
              {t('detail.downloadPdf')}
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={Wallet}
              disabled={!canAct}
              title={t('detail.walletUnavailable')}
              onClick={onWalletHint}
            >
              {t('detail.addToWallet')}
            </Button>
          </div>
        </div>
        <div className="border-t border-ink-10 pt-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-ink-40">
            {t('detail.transferResale')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" size="md" icon={Gift} disabled={!canGift} onClick={onGiftOpen}>
              {t('detail.giftTicket')}
            </Button>
            <Button variant="secondary" size="md" icon={Gavel} disabled={!canAuction} onClick={onAuctionOpen}>
              {t('detail.dropToAuction')}
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
            onClick={onCancelOpen}
          >
            {t('detail.cancelTicket')}
          </Button>
          {!canAct && ticketStatus !== 'auction' && (
            <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-40">
              {t('detail.inactiveTicketHint')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
