import type { FieldErrors } from 'react-hook-form';
import type { BaseRegistrationFields } from '@/types/domain';
import { Field } from '@/components/ui/form/Field';
import { SaudiPhoneInput } from '@/components/ui/form/SaudiPhoneInput';
import { TextInput } from '@/components/ui/form/inputs';

type BasicFieldErrors = FieldErrors<{
  fullName?: string;
  email?: string;
  contactPhone?: string;
  password?: string;
  agreeTerms?: boolean;
}>;

interface SharedBasicStepProps {
  value: BaseRegistrationFields;
  onChange: (patch: Partial<BaseRegistrationFields>) => void;
  hideTerms?: boolean;
  errors?: BasicFieldErrors;
}

export function SharedBasicStep({ value, onChange, hideTerms = false, errors }: SharedBasicStepProps) {
  const fullNameError = errors?.fullName?.message as string | undefined;
  const emailError = errors?.email?.message as string | undefined;
  const phoneError = errors?.contactPhone?.message as string | undefined;
  const passwordError = errors?.password?.message as string | undefined;
  const termsError = errors?.agreeTerms?.message as string | undefined;

  return (
    <div className="space-y-4">
      <Field label="Full name" htmlFor="register-full-name" errorText={fullNameError}>
        <TextInput
          id="register-full-name"
          type="text"
          autoComplete="name"
          value={value.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Your full name"
          aria-invalid={Boolean(fullNameError)}
        />
      </Field>
      <Field label="Email" htmlFor="register-email" errorText={emailError}>
        <TextInput
          id="register-email"
          type="email"
          autoComplete="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@example.com"
          aria-invalid={Boolean(emailError)}
        />
      </Field>
      <Field label="Contact phone" htmlFor="register-phone" errorText={phoneError}>
        <SaudiPhoneInput
          id="register-phone"
          value={value.contactPhone}
          onChange={(next) => onChange({ contactPhone: next })}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="register-password"
        helperText={passwordError ? undefined : 'At least 8 characters.'}
        errorText={passwordError}
      >
        <TextInput
          id="register-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={value.password}
          onChange={(e) => onChange({ password: e.target.value })}
          placeholder="At least 8 characters"
          aria-invalid={Boolean(passwordError)}
        />
      </Field>
      {!hideTerms && (
        <div className="space-y-1">
          <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
            <input
              type="checkbox"
              checked={value.agreeTerms}
              onChange={(e) => onChange({ agreeTerms: e.target.checked })}
            />
            I agree to Terms of Service.
          </label>
          {termsError && <p className="text-[12px] font-semibold text-coral">{termsError}</p>}
        </div>
      )}
    </div>
  );
}
