import { useCallback } from 'react';
import { ProfileImageAvatarInput } from '@/components/auth/ProfileImageAvatarInput';
import { useUploadProfileImageFile } from '@/hooks/useUploadProfileImageFile';

type DraftProfileImageAvatarInputProps = {
  value: string | undefined;
  onChange: (url: string) => void;
  displayName: string;
  disabled?: boolean;
};

/** Onboarding draft: uploads via `POST /me/profile-image`, stores the returned URL locally. */
export function DraftProfileImageAvatarInput({
  value,
  onChange,
  displayName,
  disabled,
}: DraftProfileImageAvatarInputProps) {
  const { upload } = useUploadProfileImageFile();

  const onFileSelected = useCallback(
    async (file: File) => {
      const url = await upload(file);
      onChange(url);
    },
    [onChange, upload],
  );

  return (
    <ProfileImageAvatarInput
      value={value}
      displayName={displayName}
      disabled={disabled}
      onFileSelected={onFileSelected}
    />
  );
}
