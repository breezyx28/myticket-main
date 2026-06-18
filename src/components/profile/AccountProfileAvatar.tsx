import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileImageAvatarInput } from '@/components/auth/ProfileImageAvatarInput';
import { useAuth } from '@/contexts/AuthContext';
import { useUploadProfileImageFile } from '@/hooks/useUploadProfileImageFile';

type AccountProfileAvatarProps = {
  displayName: string;
};

/**
 * Profile-page avatar: `POST /me/profile-image` on pick (multipart `image` field).
 * Persists immediately — no profile form save button required.
 */
export function AccountProfileAvatar({ displayName }: AccountProfileAvatarProps) {
  const { t } = useTranslation('profile');
  const { user, applyProfileImageUrl, updateAccountInfo } = useAuth();
  const { upload } = useUploadProfileImageFile();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const onFileSelected = useCallback(
    async (file: File) => {
      const url = await upload(file);
      applyProfileImageUrl(url);
      setStatusMessage(t('avatar.updated'));
      window.setTimeout(() => setStatusMessage(null), 2500);
    },
    [applyProfileImageUrl, t, upload],
  );

  const onRemove = useCallback(async () => {
    await updateAccountInfo({ profileImage: '' });
    setStatusMessage(t('avatar.removed'));
    window.setTimeout(() => setStatusMessage(null), 2500);
  }, [t, updateAccountInfo]);

  return (
    <div className="mb-2">
      <ProfileImageAvatarInput
        value={user?.profileImage}
        displayName={displayName}
        hintText={t('avatar.hint')}
        onFileSelected={onFileSelected}
        onRemove={onRemove}
      />
      {statusMessage && (
        <p className="mt-2 text-[12px] font-semibold text-mint-dark" role="status">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
