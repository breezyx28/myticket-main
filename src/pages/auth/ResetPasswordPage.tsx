import { useState } from 'react';
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
import { resetPasswordSchema, type ResetPasswordSchema } from '@/schemas/auth';

export function ResetPasswordPage() {
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
      setError(authErrorMessage(e, 'Could not reset your password. Try requesting a new link.'));
    }
  });

  return (
    <FormSectionCard
      eyebrow="Account access"
      title="Set new password"
      description="Choose a strong new password for your account."
    >
      {!tokenFromUrl && !done && (
        <InlineNotice variant="warning" title="Reset link is missing">
          <p className="text-[13px] text-ink-60">
            Open the link from your inbox to reset your password.{' '}
            <Link to="/forgot-password" className="font-semibold text-coral hover:underline">
              Request a new link
            </Link>
            .
          </p>
        </InlineNotice>
      )}

      {done ? (
        <InlineNotice variant="success" title="Password updated">
          <p className="text-[13px] text-ink-60">
            Your password has been reset. You can now{' '}
            <Link to="/login" className="font-semibold text-coral hover:underline">
              sign in
            </Link>{' '}
            with your new credentials.
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
            <Field label="New password" htmlFor="new-password" helperText="At least 8 characters." errorText={errors.password?.message}>
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>
            <Field
              label="Confirm new password"
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
              Update password
            </Button>
          </form>
        </>
      )}
    </FormSectionCard>
  );
}
