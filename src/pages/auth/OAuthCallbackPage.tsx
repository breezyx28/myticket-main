import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import { getSafeRedirectPath } from '@/lib/navigation';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { InlineNotice } from '@/components/ui/form/InlineNotice';

const OAUTH_REDIRECT_KEY = 'myticket_oauth_redirect_after';

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error') ?? searchParams.get('error_description');
  const { completeOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  const [error, setError] = useState<string | null>(() => {
    if (providerError) return decodeURIComponent(providerError);
    if (!provider || !code) return 'Missing authorization code from the provider. Please try signing in again.';
    return null;
  });

  useEffect(() => {
    if (ranRef.current) return;
    if (error) {
      ranRef.current = true;
      return;
    }
    if (!provider || !code) return;
    ranRef.current = true;

    completeOAuthCallback(provider, code, state)
      .then(() => {
        const stored = sessionStorage.getItem(OAUTH_REDIRECT_KEY);
        sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
        const safe = getSafeRedirectPath(stored) ?? '/';
        navigate(safe, { replace: true });
      })
      .catch((e) => {
        setError(authErrorMessage(e, 'We could not finish signing you in.'));
      });
  }, [code, completeOAuthCallback, error, navigate, provider, state]);

  return (
    <FormSectionCard
      eyebrow="Signing you in"
      title={error ? 'Sign-in failed' : `Finishing ${provider ?? 'OAuth'} sign-in…`}
      description={error ? 'Please try again or use email and password.' : 'Verifying your authorization with the provider.'}
    >
      {error ? (
        <div className="space-y-4">
          <InlineNotice variant="warning" title="Authentication error">
            <p className="text-[13px] text-ink-60">{error}</p>
          </InlineNotice>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/login" className="flex-1">
              <Button type="button" variant="dark" size="md" className="w-full">
                Back to sign in
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button type="button" variant="outline" size="md" className="w-full">
                Go home
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-ink-10 border-t-coral"
            aria-label="Loading"
            role="status"
          />
        </div>
      )}
    </FormSectionCard>
  );
}
