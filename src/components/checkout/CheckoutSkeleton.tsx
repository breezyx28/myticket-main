import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { cn } from '@/lib/utils';

type CheckoutSkeletonProps = {
  withAside?: boolean;
  className?: string;
};

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ink-10/80', className)} />;
}

export function CheckoutSkeleton({ withAside = true, className }: CheckoutSkeletonProps) {
  return (
    <CheckoutShell className={className}>
      <Bone className="h-4 w-28" />
      <Bone className="mt-4 h-8 w-64 max-w-full" />
      <Bone className="mt-2 h-4 w-80 max-w-full" />
      <Bone className="mt-8 h-9 w-72 max-w-full rounded-full" />

      <div
        className={cn(
          'mt-8 grid gap-8',
          withAside && 'lg:grid-cols-[minmax(0,1fr)_380px]',
        )}
      >
        <Bone className="h-[420px] rounded-[2rem]" />
        {withAside ? <Bone className="h-[320px] rounded-[2rem]" /> : null}
      </div>
    </CheckoutShell>
  );
}
