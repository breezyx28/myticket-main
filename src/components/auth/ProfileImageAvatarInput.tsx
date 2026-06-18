import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from '@phosphor-icons/react';
import { toAuthApiError } from '@/lib/authErrors';
import { initialsFromName, isProfileImageUrl } from '@/lib/initials';
import { PROFILE_IMAGE_ACCEPT } from '@/lib/profileImageUpload';
import { cn } from '@/lib/utils';

interface ProfileImageAvatarInputProps {
  value: string | undefined;
  displayName: string;
  disabled?: boolean;
  className?: string;
  hintText?: string;
  /** Upload handler — e.g. `POST /me/profile-image` on /profile or onboarding. */
  onFileSelected: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function ProfileImageAvatarInput({
  value,
  displayName,
  disabled = false,
  className,
  hintText,
  onFileSelected,
  onRemove,
}: ProfileImageAvatarInputProps) {
  const { t } = useTranslation('authPages');
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const showImage = Boolean(previewSrc) || isProfileImageUrl(value);
  const displaySrc = previewSrc ?? (value?.trim() ? value.trim() : null);
  const initials = initialsFromName(displayName);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const clearPreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewSrc(null);
  }, []);

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      setUploadError(null);
      clearPreview();
      const objectUrl = URL.createObjectURL(file);
      previewObjectUrlRef.current = objectUrl;
      setPreviewSrc(objectUrl);
      setUploading(true);

      try {
        await onFileSelected(file);
        clearPreview();
      } catch (err) {
        clearPreview();
        setUploadError(toAuthApiError(err, t('onboarding.errors.uploadPhotoFailed')).message);
      } finally {
        setUploading(false);
      }
    },
    [clearPreview, onFileSelected, t],
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;
    setUploadError(null);
    clearPreview();
    setUploading(true);
    try {
      await onRemove();
    } catch (err) {
      setUploadError(toAuthApiError(err, t('onboarding.errors.removePhotoFailed')).message);
    } finally {
      setUploading(false);
    }
  }, [clearPreview, onRemove, t]);

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      <span className="text-[12px] font-semibold text-ink-60">{t('onboarding.profilePhoto.label')}</span>
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
          aria-label={t('onboarding.profilePhoto.uploadAria')}
        >
          {showImage && displaySrc ? (
            <img src={displaySrc} alt="" className="h-full w-full object-cover" />
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
        <input
          ref={fileRef}
          type="file"
          accept={PROFILE_IMAGE_ACCEPT}
          className="sr-only"
          onChange={onPickFile}
          disabled={disabled}
        />
        {!disabled && (
          <div className="flex min-w-0 flex-col gap-2 text-[12px] text-ink-60">
            <p className="max-w-[220px] leading-snug">
              {hintText ?? t('onboarding.profilePhoto.hint')}
            </p>
            {uploadError && (
              <p className="max-w-[220px] font-semibold text-coral" role="alert">
                {uploadError}
              </p>
            )}
            {showImage && onRemove && (
              <button
                type="button"
                className="self-start font-bold text-coral hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={uploading}
                onClick={() => void handleRemove()}
              >
                {t('onboarding.profilePhoto.remove')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
