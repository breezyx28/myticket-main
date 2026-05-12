import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QR_OPTIONS = {
  errorCorrectionLevel: 'L' as const,
  margin: 2,
  width: 400,
  color: { dark: '#0a0a0a', light: '#ffffff' },
};

export async function generateTicketQrDataUrl(signedPayload: string): Promise<string> {
  return QRCode.toDataURL(signedPayload.trim(), QR_OPTIONS);
}

/**
 * Generates and caches a PNG data URL for `signed_qr_payload` (gate payload).
 */
export function useTicketQrDataUrl(signedPayload: string | undefined | null) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = signedPayload?.trim();
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
  }, [signedPayload]);

  return { dataUrl, loading, error };
}
