import * as yup from 'yup';

/**
 * `PUT /me/favorites/{eventId}` is path-only; this schema validates the
 * single argument the SPA hands to the toggle hook so callers cannot pass an
 * empty string or `null` accidentally.
 */
export const toggleFavoriteSchema = yup
  .object({
    eventId: yup.mixed<number | string>().required('Event id is required.'),
  })
  .strict();

export type ToggleFavoriteSchema = yup.InferType<typeof toggleFavoriteSchema>;
