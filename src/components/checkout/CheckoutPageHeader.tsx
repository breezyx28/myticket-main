import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type CheckoutPageHeaderProps = {
  backTo: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function CheckoutPageHeader({
  backTo,
  backLabel = 'Back to event',
  title,
  subtitle,
  className,
}: CheckoutPageHeaderProps) {
  return (
    <header className={cn('max-w-3xl', className)}>
      <Link
        to={backTo}
        className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-semibold text-coral transition-colors hover:text-coral/80"
      >
        <ArrowLeft size={16} weight="bold" className="shrink-0" aria-hidden />
        {backLabel}
      </Link>
      <h1 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-[65ch] text-pretty text-[14px] leading-relaxed text-ink-60">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
