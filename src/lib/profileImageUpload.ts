import type { UploadProfileImageResponse } from '@/api/types/user';

export const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const PROFILE_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function isAllowedProfileImageFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export function profileImageUrlFromUpload(response: UploadProfileImageResponse): string {
  return response.profile_image_url?.trim() || response.avatar_url?.trim() || '';
}
