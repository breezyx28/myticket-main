import { useCallback } from 'react';
import { ProfileImageAvatarInput } from '@/components/auth/ProfileImageAvatarInput';
import { useUploadProfileImageFile } from '@/hooks/useUploadProfileImageFile';
import { assertProfileImageFile } from '@/lib/profileImageUpload';

type DraftProfileImageAvatarInputProps = {
  value: string | undefined;
  onChange: (url: string) => void;
  displayName: string;
  disabled?: boolean;
  /** Hold file locally until auth exists (e.g. register page before sign-up). */
  deferUpload?: boolean;
  onFileChange?: (file: File | null) => void;
};

/** Onboarding draft: uploads via `POST /me/profile-image`, or defers until submit when unauthenticated. */
export function DraftProfileImageAvatarInput({
  value,
  onChange,
  displayName,
  disabled,
  deferUpload = false,
  onFileChange,
}: DraftProfileImageAvatarInputProps) {
  const { upload } = useUploadProfileImageFile();

  const onFileSelected = useCallback(
    async (file: File) => {
      assertProfileImageFile(file);
      if (deferUpload) {
        onFileChange?.(file);
        onChange(URL.createObjectURL(file));
        return;
      }
      const url = await upload(file);
      onChange(url);
    },
    [deferUpload, onChange, onFileChange, upload],
  );

  const onRemove = useCallback(async () => {
    onFileChange?.(null);
    onChange('');
  }, [onChange, onFileChange]);

  return (
    <ProfileImageAvatarInput
      value={value}
      displayName={displayName}
      disabled={disabled}
      retainPreviewAfterSelect={deferUpload}
      onFileSelected={onFileSelected}
      onRemove={deferUpload ? onRemove : undefined}
    />
  );
}
