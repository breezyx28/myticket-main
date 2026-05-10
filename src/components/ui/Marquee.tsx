import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  speed?: number;
  gap?: number;
}

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
  speed = 40,
  gap = 48,
}: MarqueeProps) {
  return (
    <div
      className={cn('group flex overflow-hidden', className)}
      style={{
        '--marquee-duration': `${speed}s`,
        '--marquee-gap': `${gap}px`,
        maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
      } as React.CSSProperties}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cn(
            'flex shrink-0 items-center gap-[var(--marquee-gap)]',
            'animate-marquee',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
          style={{ paddingRight: `var(--marquee-gap)` }}
          aria-hidden={i === 1}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
