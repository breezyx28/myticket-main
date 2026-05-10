import { useCallback, useRef, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { initialsFromName, isProfileImageUrl } from '@/lib/initials';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface ProfileImageAvatarInputProps {
  value: string | undefined;
  onChange: (next: string) => void;
  displayName: string;
  disabled?: boolean;
  className?: string;
}

export function ProfileImageAvatarInput({
  value,
  onChange,
  displayName,
  disabled = false,
  className,
}: ProfileImageAvatarInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const showImage = isProfileImageUrl(value);
  const initials = initialsFromName(displayName);

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > MAX_IMAGE_BYTES) {
        window.alert('Please choose an image under 2 MB.');
        return;
      }
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') onChange(result);
        setUploading(false);
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <span className="text-[12px] font-semibold text-ink-60">Profile photo (optional)</span>
      <div className="flex flex-wrap items-end gap-4">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink-10 bg-ink-5 text-center transition-shadow',
            !disabled && !uploading && 'cursor-pointer hover:border-coral hover:shadow-md focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2',
            (disabled || uploading) && 'cursor-not-allowed opacity-70'
          )}
          aria-label="Upload profile photo"
        >
          {showImage ? (
            <img src={value!.trim()} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[28px] font-extrabold tracking-tight text-ink-40">{initials}</span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[1px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          )}
          {!disabled && !uploading && (
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white shadow-sm ring-2 ring-white">
              <Camera size={16} weight="bold" />
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPickFile} disabled={disabled} />
        {!disabled && (
          <div className="flex min-w-0 flex-col gap-2 text-[12px] text-ink-60">
            <p className="max-w-[220px] leading-snug">Tap the circle to choose a photo from your device.</p>
            {showImage && (
              <button
                type="button"
                className="self-start font-bold text-coral hover:underline"
                onClick={() => onChange('')}
              >
                Remove photo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
