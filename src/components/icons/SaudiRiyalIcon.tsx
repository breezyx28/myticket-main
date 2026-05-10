import { cn } from '@/lib/utils';

/** Saudi Riyal currency symbol via custom webfont glyph class. */
export function SaudiRiyalIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'saudi-riyal-symbol icon-saudi_riyal_bold_new inline-block shrink-0 align-baseline text-current',
        className
      )}
      aria-hidden
    />
  );
}
