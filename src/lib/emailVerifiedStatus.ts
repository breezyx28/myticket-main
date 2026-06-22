export type EmailVerifiedStatus = 'verified' | 'missing' | 'invalid';

/** Map `/auth/email-verified` query params to a display state. */
export function parseEmailVerifiedStatus(searchParams: URLSearchParams): EmailVerifiedStatus {
  if (searchParams.get('status') === 'verified') return 'verified';
  const reason = searchParams.get('reason');
  if (reason === 'missing') return 'missing';
  if (reason === 'invalid') return 'invalid';
  return 'invalid';
}
