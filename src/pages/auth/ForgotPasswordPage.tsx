import { useState } from 'react';
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
import { forgotPasswordSchema, type ForgotPasswordSchema } from '@/schemas/auth';

export function ForgotPasswordPage() {
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
      setError(authErrorMessage(e, 'Could not send the reset email. Please try again.'));
    }
  });

  return (
    <FormSectionCard
      eyebrow="Account access"
      title="Reset password"
      description="Enter your email and we’ll send you a link to choose a new password."
    >
      {sentTo ? (
        <InlineNotice variant="success" title="Check your inbox">
          <p className="text-[13px] text-ink-60">
            If an account exists for <strong className="text-ink">{sentTo}</strong>, you’ll receive reset instructions in
            a moment.
          </p>
          <div className="mt-3">
            <Link to="/login" className="font-semibold text-coral hover:underline">
              Back to sign in
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
            <Field label="Email" htmlFor="forgot-email" errorText={errors.email?.message}>
              <TextInput
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </Field>
            <Button type="submit" variant="dark" size="md" className="w-full" loading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-[13px] text-ink-40">
        <Link to="/login" className="font-semibold text-coral hover:underline">
          Sign in
        </Link>
      </p>
    </FormSectionCard>
  );
}
