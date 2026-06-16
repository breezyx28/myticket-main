import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '@/components/tickets/admit-one/admitOneTicket.module.css';

const DESIGN_WIDTH = 700;
const DESIGN_HEIGHT = 250;

type AdmitOneTicketFrameProps = {
  children: ReactNode;
};

/** Scales the fixed-width ticket to fit the container without horizontal scroll. */
export function AdmitOneTicketFrame({ children }: AdmitOneTicketFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth;
      setScale(Math.min(1, available / DESIGN_WIDTH));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={styles.frameHost}
      style={{ height: Math.ceil(DESIGN_HEIGHT * scale) + 8 }}
    >
      <div
        className={styles.frameScale}
        style={{
          width: DESIGN_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
