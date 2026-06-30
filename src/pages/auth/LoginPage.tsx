import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage, isEmailVerificationRequiredError, isNonGuestRoleError, isTwoFactorRequiredError } from '@/lib/authErrors';
import { getSafeRedirectPath } from '@/lib/navigation';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { Field } from '@/components/ui/form/Field';
import { PasswordInput } from '@/components/ui/form/PasswordInput';
import { TextInput } from '@/components/ui/form/inputs';
import { createLoginSchema } from '@/schemas/auth';

export function LoginPage() {
  const { t } = useTranslation('authPages');
  const { t: tValidation, i18n } = useTranslation('validation');
  const loginSchema = useMemo(() => createLoginSchema(tValidation), [tValidation, i18n.language]);
  const { signIn, signInWithOtp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRaw = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  const from = getSafeRedirectPath(fromRaw) ?? '/';
  const verificationNotice =
    (location.state as { verificationNotice?: string } | null)?.verificationNotice ?? null;
  const registerState = { from: { pathname: from } };

  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

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
      if (isNonGuestRoleError(e)) {
        setError(e.message);
        return;
      }
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

  const submitDisabled = isSubmitting;

  function resetTwoFactorStep() {
    setChallengeToken(null);
    setError(null);
    form.setValue('otp', '');
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

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

      {verificationNotice ? (
        <InlineNotice variant="info" title={t('register.verificationReminder')} className="mt-4">
          <p className="text-[13px] leading-relaxed text-ink-70">{verificationNotice}</p>
        </InlineNotice>
      ) : null}

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
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                showLabel={t('login.showPassword')}
                hideLabel={t('login.hidePassword')}
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
    </FormSectionCard>
  );
}
