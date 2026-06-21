import type { FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { BaseRegistrationFields } from "@/types/domain";
import { Field } from "@/components/ui/form/Field";
import { PasswordInput } from "@/components/ui/form/PasswordInput";
import { SaudiPhoneInput } from "@/components/ui/form/SaudiPhoneInput";
import { TextInput } from "@/components/ui/form/inputs";

type BasicFieldErrors = FieldErrors<{
  fullName?: string;
  email?: string;
  contactPhone?: string;
  password?: string;
  passwordConfirmation?: string;
  agreeTerms?: boolean;
}>;

interface SharedBasicStepProps {
  value: BaseRegistrationFields;
  onChange: (patch: Partial<BaseRegistrationFields>) => void;
  hideTerms?: boolean;
  errors?: BasicFieldErrors;
}

export function SharedBasicStep({
  value,
  onChange,
  hideTerms = false,
  errors,
}: SharedBasicStepProps) {
  const { t } = useTranslation("authPages");
  const fullNameError = errors?.fullName?.message as string | undefined;
  const emailError = errors?.email?.message as string | undefined;
  const phoneError = errors?.contactPhone?.message as string | undefined;
  const passwordError = errors?.password?.message as string | undefined;
  const confirmError = errors?.passwordConfirmation?.message as
    | string
    | undefined;
  const termsError = errors?.agreeTerms?.message as string | undefined;

  return (
    <div className="space-y-4">
      <Field
        label={t("register.fields.fullName")}
        htmlFor="register-full-name"
        errorText={fullNameError}
      >
        <TextInput
          id="register-full-name"
          type="text"
          autoComplete="name"
          value={value.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder={t("register.fields.fullNamePlaceholder")}
          aria-invalid={Boolean(fullNameError)}
        />
      </Field>
      <Field label={t("register.fields.email")} htmlFor="register-email" errorText={emailError}>
        <TextInput
          id="register-email"
          type="email"
          autoComplete="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder={t("register.fields.emailPlaceholder")}
          aria-invalid={Boolean(emailError)}
        />
      </Field>
      <Field
        label={t("register.fields.contactPhone")}
        htmlFor="register-phone"
        errorText={phoneError}
      >
        <SaudiPhoneInput
          id="register-phone"
          value={value.contactPhone}
          onChange={(next) => onChange({ contactPhone: next })}
        />
      </Field>
      <Field
        label={t("register.fields.password")}
        htmlFor="register-password"
        helperText={passwordError ? undefined : t("register.fields.passwordHelper")}
        errorText={passwordError}
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          minLength={8}
          value={value.password}
          onChange={(e) => onChange({ password: e.target.value })}
          placeholder={t("register.fields.passwordPlaceholder")}
          aria-invalid={Boolean(passwordError)}
          showLabel={t("register.fields.showPassword")}
          hideLabel={t("register.fields.hidePassword")}
        />
      </Field>
      <Field
        label={t("register.fields.confirmPassword")}
        htmlFor="register-password-confirm"
        errorText={confirmError}
      >
        <PasswordInput
          id="register-password-confirm"
          autoComplete="new-password"
          minLength={8}
          value={value.passwordConfirmation ?? ""}
          onChange={(e) => onChange({ passwordConfirmation: e.target.value })}
          placeholder={t("register.fields.confirmPasswordPlaceholder")}
          aria-invalid={Boolean(confirmError)}
          showLabel={t("register.fields.showPassword")}
          hideLabel={t("register.fields.hidePassword")}
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
            {t("register.fields.agreeTerms")}
          </label>
          {termsError && (
            <p className="text-[12px] font-semibold text-coral">{termsError}</p>
          )}
        </div>
      )}
    </div>
  );
}
