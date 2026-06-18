import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { TextInput } from '@/components/ui/form/inputs';
import { createResetPasswordSchema, type ResetPasswordSchema } from '@/schemas/auth';

export function ResetPasswordPage() {
  const { t } = useTranslation(['authPages', 'common']);
  const { t: tValidation, i18n } = useTranslation('validation');
  const resetPasswordSchema = useMemo(
    () => createResetPasswordSchema(tValidation),
    [tValidation, i18n.language],
  );
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const { confirmPasswordReset } = useAuth();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordSchema>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      password_confirmation: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await confirmPasswordReset(values.token, values.password);
      setDone(true);
    } catch (e) {
      setError(authErrorMessage(e, t('authPages:reset.failed')));
    }
  });

  return (
    <FormSectionCard
      eyebrow={t('authPages:reset.eyebrow')}
      title={t('authPages:reset.title')}
      description={t('authPages:reset.description')}
    >
      {!tokenFromUrl && !done && (
        <InlineNotice variant="warning" title={t('authPages:reset.missingTokenTitle')}>
          <p className="text-[13px] text-ink-60">
            {t('authPages:reset.missingTokenBody')}{' '}
            <Link to="/forgot-password" className="font-semibold text-coral hover:underline">
              {t('authPages:reset.requestNew')}
            </Link>
            .
          </p>
        </InlineNotice>
      )}

      {done ? (
        <InlineNotice variant="success" title={t('authPages:reset.successTitle')}>
          <p className="text-[13px] text-ink-60">
            {t('authPages:reset.successBody')}{' '}
            <Link to="/login" className="font-semibold text-coral hover:underline">
              {t('common:signIn')}
            </Link>
          </p>
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
            <input type="hidden" {...register('token')} />
            <Field
              label={t('authPages:reset.password')}
              htmlFor="new-password"
              helperText={t('authPages:reset.passwordHelper')}
              errorText={errors.password?.message}
            >
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>
            <Field
              label={t('authPages:reset.passwordConfirm')}
              htmlFor="confirm-password"
              errorText={errors.password_confirmation?.message}
            >
              <TextInput
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password_confirmation)}
                {...register('password_confirmation')}
              />
            </Field>
            {errors.token?.message && (
              <p className="text-[12px] font-semibold text-coral">{errors.token.message}</p>
            )}
            <Button
              type="submit"
              variant="dark"
              size="md"
              className="w-full"
              loading={isSubmitting}
              disabled={!tokenFromUrl}
            >
              {t('authPages:reset.submit')}
            </Button>
          </form>
        </>
      )}
    </FormSectionCard>
  );
}
