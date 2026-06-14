/** Returns a trimmed image URL or `undefined` when empty — avoids React `src=""` warnings. */
export function usableImageSrc(src: string | null | undefined): string | undefined {
  if (typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  return trimmed !== '' ? trimmed : undefined;
}
