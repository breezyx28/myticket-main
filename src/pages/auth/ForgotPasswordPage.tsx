import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { TextInput } from '@/components/ui/form/inputs';
import { createForgotPasswordSchema, type ForgotPasswordSchema } from '@/schemas/auth';

export function ForgotPasswordPage() {
  const { t } = useTranslation(['authPages', 'common']);
  const { t: tValidation, i18n } = useTranslation('validation');
  const forgotPasswordSchema = useMemo(
    () => createForgotPasswordSchema(tValidation),
    [tValidation, i18n.language],
  );
  const { requestPasswordReset } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordSchema>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (e) {
      setError(authErrorMessage(e, t('authPages:forgot.sendFailed')));
    }
  });

  return (
    <FormSectionCard
      eyebrow={t('authPages:forgot.eyebrow')}
      title={t('authPages:forgot.title')}
      description={t('authPages:forgot.description')}
    >
      {sentTo ? (
        <InlineNotice variant="success" title={t('authPages:forgot.successTitle')}>
          <p className="text-[13px] text-ink-60">{t('authPages:forgot.successBody', { email: sentTo })}</p>
          <div className="mt-3">
            <Link to="/login" className="font-semibold text-coral hover:underline">
              {t('authPages:forgot.backToSignIn')}
            </Link>
          </div>
        </InlineNotice>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
            >
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label={t('authPages:forgot.email')} htmlFor="forgot-email" errorText={errors.email?.message}>
              <TextInput
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder={t('authPages:login.emailPlaceholder')}
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </Field>
            <Button type="submit" variant="dark" size="md" className="w-full" loading={isSubmitting}>
              {t('authPages:forgot.submit')}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-[13px] text-ink-40">
        <Link to="/login" className="font-semibold text-coral hover:underline">
          {t('common:signIn')}
        </Link>
      </p>
    </FormSectionCard>
  );
}
