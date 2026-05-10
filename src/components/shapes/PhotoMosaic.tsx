import { cn } from '@/lib/utils';

const MOSAIC_COLORS = ['bg-coral', 'bg-indigo', 'bg-lime', 'bg-lemon', 'bg-lavender', 'bg-sky'];

export function PhotoMosaic({ photos, className }: { photos: string[]; className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-3 grid-rows-2 gap-2.5 rounded-2xl overflow-hidden', className)}
      style={{ aspectRatio: '3 / 2' }}
    >
      {photos.slice(0, 6).map((photo, i) => (
        <div key={i} className={cn('relative rounded-xl overflow-hidden', MOSAIC_COLORS[i])}>
          <img
            src={photo}
            alt=""
            className="w-full h-full object-cover mix-blend-multiply"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
