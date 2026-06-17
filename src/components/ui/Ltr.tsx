import type { PropsWithChildren } from 'react';

type LtrProps = PropsWithChildren<{ className?: string }>;

export function Ltr({ children, className }: LtrProps) {
  return (
    <span dir="ltr" className={className}>
      {children}
    </span>
  );
}
