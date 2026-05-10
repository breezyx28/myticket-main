import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { changeEmailSchema, type ChangeEmailSchema } from '@/schemas/auth';
import { AuthApiError } from '@/lib/authErrors';

type EmailChangeDialogProps = {
  open: boolean;
  onClose: () => void;
  requestEmailChange: (body: { new_email: string; current_password: string }) => Promise<string>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function EmailChangeDialog({
  open,
  onClose,
  requestEmailChange,
  onSuccess,
  onError,
}: EmailChangeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailSchema>({
    resolver: yupResolver(changeEmailSchema),
    defaultValues: { new_email: '', current_password: '' },
  });

  useEffect(() => {
    if (!open) reset({ new_email: '', current_password: '' });
  }, [open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card-lg">
        <h3 className="text-lg font-extrabold text-ink">Change email</h3>
        <p className="mt-2 text-[14px] text-ink-60">
          We&apos;ll send a verification link to your new address. Your sign-in email stays the same until you confirm.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              const message = await requestEmailChange({
                new_email: values.new_email.trim(),
                current_password: values.current_password,
              });
              onSuccess(message);
              onClose();
            } catch (e) {
              onError(e instanceof AuthApiError ? e.message : 'Could not start email change.');
            }
          })}
        >
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-60">New email</span>
            <input
              type="email"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
              {...register('new_email')}
            />
            {errors.new_email && (
              <p className="mt-1 text-[12px] font-semibold text-coral">{errors.new_email.message}</p>
            )}
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-60">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
              {...register('current_password')}
            />
            {errors.current_password && (
              <p className="mt-1 text-[12px] font-semibold text-coral">{errors.current_password.message}</p>
            )}
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="dark" size="md" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send verification'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
