import { cn } from '@/lib/utils';

interface CrossOrnamentProps {
  size?: number;
  color?: string;
  rounded?: boolean;
  className?: string;
}

export function CrossOrnament({ size = 28, color = 'currentColor', rounded = true, className = '' }: CrossOrnamentProps) {
  const r = rounded ? size * 0.1 : 0;
  const arm = size * 0.28;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className={className}>
      <rect x={0} y={center - arm / 2} width={size} height={arm} rx={r} fill={color} />
      <rect x={center - arm / 2} y={0} width={arm} height={size} rx={r} fill={color} />
    </svg>
  );
}

export function CrossPattern({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <CrossOrnament size={32} color="#FF6B4A" />
      <CrossOrnament size={32} color="#3355FF" />
      <CrossOrnament size={32} color="#F5E642" />
    </div>
  );
}
