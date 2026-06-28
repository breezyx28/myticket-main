import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/Button";
import { SharedBasicStep } from "@/components/auth/steps/SharedBasicStep";
import { FormSectionCard } from "@/components/ui/form/FormSectionCard";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import { useAuth } from "@/contexts/AuthContext";
import type { BaseRegistrationFields } from "@/types/domain";
import { authErrorMessage } from "@/lib/authErrors";
import {
  createBasicRegistrationSchema,
  type BasicRegistrationFormValues,
} from "@/schemas/auth";
import {
  clearRegisterDraft,
  readRegisterDraft,
  writeRegisterDraft,
} from "@/lib/formDraftStorage";

const EMPTY_BASIC: BaseRegistrationFields = {
  fullName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  contactPhone: "",
  agreeTerms: false,
};

export function RegisterPage() {
  const { t } = useTranslation("authPages");
  const { t: tValidation, i18n } = useTranslation("validation");
  const basicRegistrationSchema = useMemo(
    () => createBasicRegistrationSchema(tValidation),
    [tValidation, i18n.language],
  );
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const basicForm = useForm<BasicRegistrationFormValues>({
    resolver: yupResolver(
      basicRegistrationSchema,
    ) as Resolver<BasicRegistrationFormValues>,
    mode: "onTouched",
    defaultValues: EMPTY_BASIC,
  });
  const basicValues = basicForm.watch();
  const basic: BaseRegistrationFields = {
    fullName: basicValues.fullName ?? "",
    email: basicValues.email ?? "",
    password: basicValues.password ?? "",
    passwordConfirmation: basicValues.passwordConfirmation ?? "",
    contactPhone: basicValues.contactPhone ?? "",
    agreeTerms: Boolean(basicValues.agreeTerms),
  };

  const setBasicField = (patch: Partial<BaseRegistrationFields>) => {
    if ("fullName" in patch)
      basicForm.setValue("fullName", patch.fullName ?? "", {
        shouldValidate: true,
        shouldTouch: true,
      });
    if ("email" in patch)
      basicForm.setValue("email", patch.email ?? "", {
        shouldValidate: true,
        shouldTouch: true,
      });
    if ("password" in patch)
      basicForm.setValue("password", patch.password ?? "", {
        shouldValidate: true,
        shouldTouch: true,
      });
    if ("passwordConfirmation" in patch)
      basicForm.setValue(
        "passwordConfirmation",
        patch.passwordConfirmation ?? "",
        { shouldValidate: true, shouldTouch: true },
      );
    if ("contactPhone" in patch)
      basicForm.setValue("contactPhone", patch.contactPhone ?? "", {
        shouldValidate: true,
        shouldTouch: true,
      });
    if ("agreeTerms" in patch)
      basicForm.setValue("agreeTerms", Boolean(patch.agreeTerms), {
        shouldValidate: true,
        shouldTouch: true,
      });
  };

  function clearRegisterForm() {
    clearRegisterDraft();
    setError(null);
    basicForm.reset(EMPTY_BASIC);
  }

  useEffect(() => {
    const stored = readRegisterDraft();
    if (stored?.basic) {
      basicForm.reset({
        fullName: stored.basic.fullName,
        email: stored.basic.email,
        contactPhone: stored.basic.contactPhone,
        password: "",
        passwordConfirmation: "",
        agreeTerms: stored.basic.agreeTerms,
      });
    }
    setDraftHydrated(true);
  }, [basicForm]);

  useEffect(() => {
    if (!draftHydrated) return;
    writeRegisterDraft({ basic });
  }, [basic, draftHydrated]);

  const handleSubmit = basicForm.handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signUp(
        values.fullName,
        values.email,
        values.password,
        values.contactPhone,
        Boolean(values.agreeTerms),
      );

      if (result.status === "verification_required") {
        navigate("/login", {
          replace: true,
          state: {
            verificationNotice:
              result.message || t("register.verificationReminder"),
          },
        });
        return;
      }

      clearRegisterDraft();
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(authErrorMessage(e, t("register.errors.signUpFailed")));
    } finally {
      setLoading(false);
    }
  });

  const roleParam = searchParams.get("role");
  if (roleParam === "talent" || roleParam === "vendor" || roleParam === "organizer") {
    return <Navigate to={`/apply/${roleParam}`} replace />;
  }

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <FormSectionCard
      eyebrow={t("register.basic.eyebrow")}
      title={t("register.basic.title")}
      description={t("register.basic.description")}
    >
      <p className="-mt-4 text-[14px] text-ink-60">
        {t("register.basic.alreadyHaveAccount")}{" "}
        <Link
          to="/login"
          state={location.state}
          className="font-semibold text-coral hover:underline"
        >
          {t("register.basic.signIn")}
        </Link>
      </p>
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <SharedBasicStep
          value={basic}
          onChange={setBasicField}
          errors={basicForm.formState.errors}
        />
        <InlineNotice variant="info" title={t("register.basic.terms")}>
          <p className="text-[12px] text-ink-60">
            {t("register.basic.termsBody")}{" "}
            <Link to="/terms" className="font-semibold text-coral underline">
              {t("register.basic.termsLink")}
            </Link>
            .
          </p>
        </InlineNotice>
        <Button
          type="submit"
          variant="dark"
          size="md"
          className="w-full"
          loading={loading}
          disabled={loading || basicForm.formState.isSubmitting}
        >
          {t("register.basic.createAccount")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          onClick={clearRegisterForm}
        >
          {t("register.basic.clearForm")}
        </Button>
      </form>
    </FormSectionCard>
  );
}
