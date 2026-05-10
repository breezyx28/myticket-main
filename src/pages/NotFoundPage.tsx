import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Page not found</h1>
      <p className="mt-3 text-[15px] text-ink-60">
        This page doesn&apos;t exist or has moved. Try the home page or browse events.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className={cn(
            'inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-colors hover:bg-ink-80'
          )}
        >
          Back home
        </Link>
        <Link
          to="/events"
          className={cn(
            'inline-flex h-11 items-center justify-center rounded-full border-2 border-ink bg-transparent px-6 text-[14px] font-semibold text-ink transition-colors hover:bg-ink-5'
          )}
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}
