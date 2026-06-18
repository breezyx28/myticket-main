import type { FieldErrors } from "react-hook-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { BaseRegistrationFields } from "@/types/domain";
import { Field } from "@/components/ui/form/Field";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        <div className="relative">
          <TextInput
            id="register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder={t("register.fields.passwordPlaceholder")}
            aria-invalid={Boolean(passwordError)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded"
            aria-label={showPassword ? t("register.fields.hidePassword") : t("register.fields.showPassword")}
          >
            {showPassword ? (
              <EyeSlash size={18} weight="bold" />
            ) : (
              <Eye size={18} weight="bold" />
            )}
          </button>
        </div>
      </Field>
      <Field
        label={t("register.fields.confirmPassword")}
        htmlFor="register-password-confirm"
        errorText={confirmError}
      >
        <div className="relative">
          <TextInput
            id="register-password-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            value={value.passwordConfirmation ?? ""}
            onChange={(e) => onChange({ passwordConfirmation: e.target.value })}
            placeholder={t("register.fields.confirmPasswordPlaceholder")}
            aria-invalid={Boolean(confirmError)}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded"
            aria-label={showConfirm ? t("register.fields.hidePassword") : t("register.fields.showPassword")}
          >
            {showConfirm ? (
              <EyeSlash size={18} weight="bold" />
            ) : (
              <Eye size={18} weight="bold" />
            )}
          </button>
        </div>
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
