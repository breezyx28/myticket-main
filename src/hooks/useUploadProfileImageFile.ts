import { useCallback } from 'react';
import { useUploadProfileImageMutation } from '@/api/endpoints';
import { toAuthApiError } from '@/lib/authErrors';
import {
  isAllowedProfileImageFile,
  PROFILE_IMAGE_MAX_BYTES,
  profileImageUrlFromUpload,
} from '@/lib/profileImageUpload';

export function useUploadProfileImageFile() {
  const [uploadProfileImage, { isLoading }] = useUploadProfileImageMutation();

  const upload = useCallback(
    async (file: File): Promise<string> => {
      if (!isAllowedProfileImageFile(file)) {
        throw toAuthApiError(
          new Error('Choose a JPEG, PNG, GIF, or WebP image.'),
          'Could not upload photo.',
        );
      }
      if (file.size > PROFILE_IMAGE_MAX_BYTES) {
        throw toAuthApiError(
          new Error('Please choose an image under 4 MB.'),
          'Could not upload photo.',
        );
      }
      const response = await uploadProfileImage(file).unwrap();
      const url = profileImageUrlFromUpload(response);
      if (!url) {
        throw toAuthApiError(new Error('Upload succeeded but no image URL was returned.'), 'Could not upload photo.');
      }
      return url;
    },
    [uploadProfileImage],
  );

  return { upload, isUploading: isLoading };
}
