import { useEffect, useState } from 'react';

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function useCountUp(
  end: number,
  options: { duration?: number; decimals?: number; enabled?: boolean } = {}
) {
  const { duration = 1400, decimals = 0, enabled = true } = options;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const current = end * eased;
      if (decimals > 0) {
        setValue(Number(current.toFixed(decimals)));
      } else {
        setValue(Math.floor(current));
      }
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, decimals, enabled]);

  return value;
}
