import { cn } from '@/lib/utils';

interface StatBubbleProps {
  label: string;
  value: string;
  color?: string;
  className?: string;
}

export function StatBubble({ label, value, color = 'bg-ink text-white', className }: StatBubbleProps) {
  return (
    <div className={cn('rounded-[28px] px-6 py-5 flex flex-col gap-1 shadow-blob', color, className)}>
      <span className="text-[12px] font-medium opacity-60">{label}</span>
      <span className="font-black text-[36px] leading-none font-mono">{value}</span>
    </div>
  );
}
