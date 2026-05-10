import { cn } from '@/lib/utils';

export function UploadTileInput({
  title,
  subtitle,
  accept,
  onPick,
  className,
}: {
  title: string;
  subtitle: string;
  accept: string;
  onPick: (file: File) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col rounded-xl border border-dashed border-ink-20 bg-ink-5/50 px-4 py-3 text-[12px] font-semibold text-ink-60 hover:bg-ink-5',
        className
      )}
    >
      <span>{title}</span>
      <span className="mt-0.5 text-[11px] font-normal text-ink-40">{subtitle}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

