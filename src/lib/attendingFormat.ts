/** Abbreviated attending label (not exact counts): +10K, 50+, 1M+, etc. */
export function formatAttendingLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 10 ? `${Math.floor(m)}` : `${m.toFixed(1).replace(/\.0$/, '')}`;
    return `+${s}M`;
  }
  if (n >= 1_000) {
    const k = n / 1000;
    const s = k >= 100 ? `${Math.floor(k)}` : `${k.toFixed(1).replace(/\.0$/, '')}`;
    return `+${s}K`;
  }
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 50) return '50+';
  if (n >= 10) return `${Math.floor(n / 10) * 10}+`;
  if (n > 0) return `${n}+`;
  return '0+';
}
