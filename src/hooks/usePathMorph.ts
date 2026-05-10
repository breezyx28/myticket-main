import { useEffect, useRef, useState } from 'react';
import { interpolate } from 'flubber';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Smoothly morphs an SVG path `d` string from paths[prev] → paths[shapeIndex]
 * using flubber. Settles exactly on the target path at t=1.
 */
export function usePathMorph(
  paths: string[] | null,
  shapeIndex: number,
  durationMs = 600
) {
  const [d, setD] = useState('');
  const prevRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!paths?.length) return;

    if (prevRef.current === null) {
      setD(paths[shapeIndex % paths.length]);
      prevRef.current = shapeIndex;
      return;
    }

    if (prevRef.current === shapeIndex) return;

    const from = paths[prevRef.current % paths.length];
    const to = paths[shapeIndex % paths.length];

    cancelAnimationFrame(rafRef.current);

    let interpolator: (t: number) => string;
    try {
      interpolator = interpolate(from, to);
    } catch {
      setD(to);
      prevRef.current = shapeIndex;
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const raw = Math.min((now - start) / durationMs, 1);
      const eased = easeInOutCubic(raw);
      try {
        setD(interpolator(eased));
      } catch {
        setD(to);
      }
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setD(to);
        prevRef.current = shapeIndex;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [paths, shapeIndex, durationMs]);

  return d;
}
