import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

/** Respects OS reduced-motion without triggering framer-motion dev warnings. */
export function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(readPrefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduceMotion(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduceMotion;
}
