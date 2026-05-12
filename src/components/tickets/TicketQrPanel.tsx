type TicketQrPanelProps = {
  dataUrl: string | null;
  loading: boolean;
  error: string | null;
  hasPayload: boolean;
};

export function TicketQrPanel({ dataUrl, loading, error, hasPayload }: TicketQrPanelProps) {
  if (!hasPayload) {
    return (
      <div className="rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-8 text-center text-[13px] text-ink-60">
        QR code is not available for this ticket yet.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-ink-10 bg-white">
        <p className="text-[13px] text-ink-40">Generating QR…</p>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="rounded-2xl border border-coral/40 bg-coral/10 px-4 py-6 text-center text-[13px] text-coral">
        {error ?? 'Could not display QR code.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-ink-10 bg-white p-6 shadow-sm">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-ink-40">Entry QR</p>
      <img
        src={dataUrl}
        alt="Ticket QR code"
        width={220}
        height={220}
        className="h-[220px] w-[220px] max-w-full"
      />
      <p className="mt-4 max-w-sm text-center text-[11px] leading-relaxed text-ink-40">
        Show this code at the gate. Do not share screenshots publicly.
      </p>
    </div>
  );
}
