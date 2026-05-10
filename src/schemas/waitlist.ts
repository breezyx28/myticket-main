import * as yup from 'yup';

/**
 * The waitlist endpoints take no request body — joining only needs the event
 * slug from the URL. This schema exists to give forms an "I agree to be
 * notified" checkbox an explicit gate without changing the request shape.
 */
export const joinWaitlistSchema = yup
  .object({
    confirm: yup.boolean().oneOf([true], 'Confirm you want to join the waitlist.').required(),
  })
  .strict();

export type JoinWaitlistSchema = yup.InferType<typeof joinWaitlistSchema>;
