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
  onDownloadPdf,
  onWalletHint,
  onGiftOpen,
  onAuctionOpen,
  onCancelOpen,
  ticketStatus,
}: TicketDetailActionsProps) {
  return (
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
              onClick={onDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={Wallet}
              disabled={!canAct}
              title="Wallet passes are not available in the app yet."
              onClick={onWalletHint}
            >
              Add to Wallet
            </Button>
          </div>
        </div>
        <div className="border-t border-ink-10 pt-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-ink-40">Transfer &amp; resale</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" size="md" icon={Gift} disabled={!canGift} onClick={onGiftOpen}>
              Gift ticket
            </Button>
            <Button variant="secondary" size="md" icon={Gavel} disabled={!canAuction} onClick={onAuctionOpen}>
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
            onClick={onCancelOpen}
          >
            Cancel ticket
          </Button>
          {!canAct && ticketStatus !== 'auction' && (
            <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-40">
              Primary actions apply to active tickets. Auction listings can be cancelled above.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
