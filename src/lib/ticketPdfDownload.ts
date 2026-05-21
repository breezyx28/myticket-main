import { jsPDF } from 'jspdf';
import { generateTicketQrDataUrl } from '@/lib/ticketQr';

export type TicketPdfMeta = {
  eventTitle: string;
  ticketCode?: string;
  orderRef: string;
  typeName: string;
  seatLabel?: string;
  venue: string;
  city: string;
  dateRangeLabel: string;
  pricePaid: number;
};

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'ticket';
}

/**
 * One-page PDF: receipt lines + embedded QR (PNG from data URL).
 * QR encodes `ticket.code` (gate scan value). If `dataUrl` is omitted, generates from `scanValue`.
 */
export async function downloadTicketPdf(opts: {
  /** `ticket.code` — same string as the on-screen QR. */
  scanValue?: string | null;
  dataUrl?: string | null;
  meta: TicketPdfMeta;
}): Promise<void> {
  const { meta } = opts;
  let pngDataUrl = opts.dataUrl ?? null;
  const scan = opts.scanValue?.trim() ?? meta.ticketCode?.trim();
  if (!pngDataUrl && scan) {
    pngDataUrl = await generateTicketQrDataUrl(scan);
  }
  if (!pngDataUrl) {
    throw new Error('No ticket code available for QR on this ticket.');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MyTicket', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lines = [
    meta.eventTitle || 'Event',
    meta.ticketCode ? `Ticket: ${meta.ticketCode}` : null,
    `Order: ${meta.orderRef}`,
    [meta.venue, meta.city].filter(Boolean).join(', ') || null,
    meta.dateRangeLabel,
    `${meta.typeName || 'Ticket'}${meta.seatLabel ? ` · ${meta.seatLabel}` : ''}`,
    `Paid: ${meta.pricePaid} SAR`,
  ].filter(Boolean) as string[];

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 2;
  }

  y += 4;
  const imgProps = doc.getImageProperties(pngDataUrl);
  const qrMaxW = Math.min(72, pageW - margin * 2);
  const qrH = (imgProps.height * qrMaxW) / imgProps.width;
  doc.addImage(pngDataUrl, 'PNG', margin, y, qrMaxW, qrH);

  const name = safeFilenamePart(meta.ticketCode ?? meta.orderRef);
  doc.save(`ticket-${name}.pdf`);
}
