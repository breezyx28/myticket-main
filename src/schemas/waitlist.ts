import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

/**
 * The waitlist endpoints take no request body — joining only needs the event
 * slug from the URL. This schema exists to give forms an "I agree to be
 * notified" checkbox an explicit gate without changing the request shape.
 */
export function createJoinWaitlistSchema(t: ValidationTFunction) {
  return yup
    .object({
      confirm: yup
        .boolean()
        .oneOf([true], t('waitlist.confirmJoinRequired'))
        .required(),
    })
    .strict();
}

export type JoinWaitlistSchema = yup.InferType<ReturnType<typeof createJoinWaitlistSchema>>;
