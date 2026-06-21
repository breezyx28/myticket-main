import { useCallback } from 'react';
import { useUploadProfileImageMutation } from '@/api/endpoints';
import { toAuthApiError } from '@/lib/authErrors';
import {
  assertProfileImageFile,
  profileImageUrlFromUpload,
} from '@/lib/profileImageUpload';

export function useUploadProfileImageFile() {
  const [uploadProfileImage, { isLoading }] = useUploadProfileImageMutation();

  const upload = useCallback(
    async (file: File): Promise<string> => {
      assertProfileImageFile(file);
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
