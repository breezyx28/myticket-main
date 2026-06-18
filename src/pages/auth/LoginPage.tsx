import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getSafeRedirectPath } from '@/lib/navigation';
import {
  authErrorMessage,
  isEmailVerificationRequiredError,
  isTwoFactorRequiredError,
} from '@/lib/authErrors';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { Field } from '@/components/ui/form/Field';
import { TextInput } from '@/components/ui/form/inputs';
import { createLoginSchema } from '@/schemas/auth';

export function LoginPage() {
  const { t } = useTranslation('authPages');
  const { t: tValidation, i18n } = useTranslation('validation');
  const loginSchema = useMemo(() => createLoginSchema(tValidation), [tValidation, i18n.language]);
  const { signIn, signInWithOtp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRaw = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  const from = getSafeRedirectPath(fromRaw) ?? '/';
  const registerState = { from: { pathname: from } };

  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const form = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '', otp: '' },
    mode: 'onTouched',
  });
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (challengeToken) {
        const otp = (values.otp ?? '').trim();
        if (!/^\d{6}$/.test(otp)) {
          setFieldError('otp', { type: 'manual', message: t('login.otpInvalid') });
          return;
        }
        await signInWithOtp(otp, challengeToken);
      } else {
        await signIn((values.email ?? '').trim(), values.password);
      }
      navigate(from, { replace: true });
    } catch (e) {
      if (isEmailVerificationRequiredError(e)) {
        setError(e.message);
        return;
      }
      if (isTwoFactorRequiredError(e)) {
        setChallengeToken(e.challengeToken);
        return;
      }
      setError(authErrorMessage(e, t('login.signInFailed')));
    }
  });

  async function onGoogle() {
    setError(null);
    setOauthLoading(true);
    try {
      await signInWithOAuth('google');
      // Navigation happens via window.location, so we don't navigate here.
    } catch (e) {
      setError(authErrorMessage(e, t('login.googleFailed')));
    } finally {
      setOauthLoading(false);
    }
  }

  function resetTwoFactorStep() {
    setChallengeToken(null);
    setError(null);
    form.setValue('otp', '');
  }

  const submitDisabled = isSubmitting || oauthLoading;

  return (
    <FormSectionCard
      eyebrow={challengeToken ? t('login.eyebrow2fa') : t('login.eyebrowWelcome')}
      title={challengeToken ? t('login.titleVerify') : t('login.titleSignIn')}
      description={challengeToken ? t('login.desc2fa') : t('login.descDefault')}
    >
      {!challengeToken && (
        <p className="-mt-4 text-[14px] text-ink-60">
          {t('login.newUser')}{' '}
          <Link to="/register" state={registerState} className="font-semibold text-coral hover:underline">
            {t('login.createAccount')}
          </Link>
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {!challengeToken ? (
          <>
            <Field label={t('login.email')} htmlFor="login-email" errorText={errors.email?.message}>
              <TextInput
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder={t('login.emailPlaceholder')}
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </Field>
            <Field label={t('login.password')} htmlFor="login-password" errorText={errors.password?.message}>
              <TextInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-[13px] font-semibold text-coral hover:underline">
                {t('login.forgotPassword')}
              </Link>
            </div>
            <Button type="submit" variant="dark" size="md" className="w-full" loading={isSubmitting} disabled={submitDisabled}>
              {t('login.submit')}
            </Button>
          </>
        ) : (
          <>
            <Field
              label={t('login.otpLabel')}
              htmlFor="login-otp"
              helperText={t('login.otpHelper')}
              errorText={errors.otp?.message}
            >
              <TextInput
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('login.otpPlaceholder')}
                maxLength={6}
                aria-invalid={Boolean(errors.otp)}
                {...register('otp')}
              />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full sm:flex-1"
                onClick={resetTwoFactorStep}
                disabled={submitDisabled}
              >
                {t('login.back')}
              </Button>
              <Button
                type="submit"
                variant="dark"
                size="md"
                className="w-full sm:flex-1"
                loading={isSubmitting}
                disabled={submitDisabled}
              >
                {t('login.verifyAndSignIn')}
              </Button>
            </div>
          </>
        )}
      </form>

      {!challengeToken && (
        <>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] font-medium text-ink-40">{t('login.or')}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full border-ink-20"
            onClick={onGoogle}
            loading={oauthLoading}
            disabled={submitDisabled}
          >
            {t('login.continueGoogle')}
          </Button>
        </>
      )}
    </FormSectionCard>
  );
}
