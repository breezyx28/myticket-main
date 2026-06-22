import type { UploadProfileImageResponse } from '@/api/types/user';
import { API_BASE_URL } from '@/api/baseApi';
import { getApiLanguage } from '@/lib/language';

export const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const PROFILE_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function isAllowedProfileImageFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export function assertProfileImageFile(file: File): void {
  if (!isAllowedProfileImageFile(file)) {
    throw new Error('Choose a JPEG, PNG, GIF, or WebP image.');
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('Please choose an image under 4 MB.');
  }
}

export function profileImageUrlFromUpload(response: UploadProfileImageResponse): string {
  return response.profile_image_url?.trim() || response.avatar_url?.trim() || '';
}

function unwrapUploadResponse(response: unknown): UploadProfileImageResponse {
  const maybe = response as UploadProfileImageResponse | { data?: UploadProfileImageResponse };
  if (maybe && typeof maybe === 'object' && 'data' in maybe && maybe.data) {
    return maybe.data;
  }
  return maybe as UploadProfileImageResponse;
}

/** Upload profile image with an explicit bearer (register-flow onboarding). */
export async function uploadProfileImageWithToken(file: File, token: string): Promise<string> {
  assertProfileImageFile(file);
  const body = new FormData();
  body.append('image', file);
  const res = await fetch(`${API_BASE_URL}/me/profile-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Language': getApiLanguage(),
    },
    body,
  });
  if (!res.ok) {
    let message = res.statusText || 'Could not upload photo.';
    try {
      const data = (await res.json()) as { message?: unknown };
      if (typeof data?.message === 'string' && data.message.trim()) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const url = profileImageUrlFromUpload(unwrapUploadResponse(await res.json()));
  if (!url) throw new Error('Upload succeeded but no image URL was returned.');
  return url;
}
