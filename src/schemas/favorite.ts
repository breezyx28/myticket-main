import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

/**
 * `PUT /me/favorites/{eventId}` is path-only; this schema validates the
 * single argument the SPA hands to the toggle hook so callers cannot pass an
 * empty string or `null` accidentally.
 */
export function createToggleFavoriteSchema(t: ValidationTFunction) {
  return yup
    .object({
      eventId: yup.mixed<number | string>().required(t('favorite.eventIdRequired')),
    })
    .strict();
}

export type ToggleFavoriteSchema = yup.InferType<ReturnType<typeof createToggleFavoriteSchema>>;
