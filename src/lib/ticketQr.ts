import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { TicketStatus } from '@/api/types/ticket';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  width: 400,
  color: { dark: '#0a0a0a', light: '#ffffff' },
};

export type TicketQrScanSource = {
  code?: string | null;
  qr_scan_value?: string | null;
};

/**
 * Value encoded in the buyer QR matrix. Must match scanner `ticket_code` (`POST /scanner/scans`).
 * Prefer `qr_scan_value` when the API provides it; never use `signed_qr_payload` for the matrix.
 */
export function ticketQrScanValue(
  source: TicketQrScanSource | string | null | undefined,
): string | null {
  if (source == null) return null;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const raw = source.qr_scan_value ?? source.code;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function generateTicketQrDataUrl(scanValue: string): Promise<string> {
  return QRCode.toDataURL(scanValue.trim(), QR_OPTIONS);
}

export function ticketQrStatusMessage(status: TicketStatus | string): string | null {
  switch (status) {
    case 'used':
      return 'This ticket has already been scanned at the gate.';
    case 'cancelled':
      return 'This ticket was cancelled and is not valid for entry.';
    case 'refunded':
      return 'This ticket was refunded and is not valid for entry.';
    case 'expired':
      return 'This ticket has expired.';
    case 'gifted':
      return 'This ticket was gifted. The recipient uses their own copy for entry.';
    case 'auction':
      return 'This ticket is listed for resale. Cancel the listing to use it for entry.';
    default:
      return null;
  }
}

/**
 * Generates a PNG data URL for the gate scan value (`ticket.code`).
 */
export function useTicketQrDataUrl(scanValue: string | undefined | null) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = scanValue?.trim();
    if (!raw) {
      setDataUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void generateTicketQrDataUrl(raw)
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
          setError('Could not generate QR code.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scanValue]);

  return { dataUrl, loading, error };
}
