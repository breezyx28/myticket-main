import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Buildings,
  MicrophoneStage,
  Storefront,
  User,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";
import { SharedBasicStep } from "@/components/auth/steps/SharedBasicStep";
import { TalentSteps } from "@/components/auth/steps/TalentSteps";
import { VendorSteps } from "@/components/auth/steps/VendorSteps";
import { OrganizerSteps } from "@/components/auth/steps/OrganizerSteps";
import { FormSectionCard } from "@/components/ui/form/FormSectionCard";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import { useGetSaudiRegionsQuery } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { useUploadProfileImageFile } from "@/hooks/useUploadProfileImageFile";
import type { BaseRegistrationFields, OnboardingRole } from "@/types/domain";
import { getSafeRedirectPath } from "@/lib/navigation";
import { authErrorMessage } from "@/lib/authErrors";
import { getRolePortalLoginUrlForRole } from "@/lib/rolePortalRedirect";
import {
  isOrganizerDraftReady,
  isTalentDraftReady,
  isVendorDraftReady,
  TALENT_BIO_MAX_CHARS,
  TALENT_BIO_MIN_CHARS,
  VENDOR_BIO_MIN_CHARS,
} from "@/lib/onboardingValidation";
import { isValidSaudiCityFlexible } from "@/lib/saudiLocations";
import {
  createBasicRegistrationSchema,
  type BasicRegistrationFormValues,
  type RegisterFormRole,
} from "@/schemas/auth";
import {
  portalSubmitErrorMessage,
  submitRegisterPortalProfile,
} from "@/services/portalProfileSubmit";
import { cn } from "@/lib/utils";
import {
  clearRegisterDraft,
  readRegisterDraft,
  writeRegisterDraft,
} from "@/lib/formDraftStorage";
import type {
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from "@/types/domain";

type RegisterStage = "basic" | "onboarding";

interface RoleCard {
  id: RegisterFormRole;
  icon: Icon;
  surface: string;
  iconTone: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: "guest",
    icon: User,
    surface: "bg-ink-5 border-ink-15",
    iconTone: "bg-ink-20 text-ink",
  },
  {
    id: "talent",
    icon: MicrophoneStage,
    surface: "bg-coral/10 border-coral/40",
    iconTone: "bg-coral text-white",
  },
  {
    id: "organizer",
    icon: Buildings,
    surface: "bg-sky/15 border-sky/40",
    iconTone: "bg-sky text-ink",
  },
  {
    id: "vendor",
    icon: Storefront,
    surface: "bg-mint/20 border-mint/50",
    iconTone: "bg-mint text-ink",
  },
];

const EMPTY_BASIC: BaseRegistrationFields = {
  fullName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  contactPhone: "",
  agreeTerms: false,
};

const EMPTY_TALENT_DRAFT: TalentOnboardingDraft = {
  fullName: "",
  contactEmail: "",
  contactPhone: "",
  profileImage: "",
  bio: "",
  saudiRegionId: "",
  city: "",
  travelReady: false,
  locationPublic: false,
  verificationMedia: [],
  certificateName: "",
  acceptedQualityDisclaimer: false,
};

const EMPTY_VENDOR_DRAFT: VendorOnboardingDraft = {
  profileName: "",
  contactEmail: "",
  contactPhone: "",
  profileImage: "",
  bio: "",
  serviceCategories: [],
  verificationDocuments: [],
  gallery: [],
  city: "",
  coverageArea: "",
};

const EMPTY_ORGANIZER_DRAFT: OrganizerOnboardingDraft = {
  displayName: "",
  profileImage: "",
  bio: "",
  email: "",
  contactPhone: "",
  location: "",
  socialLinks: [],
  optionalDocument: "",
  isCompany: false,
  companyName: "",
  companyInfo: "",
  ownerName: "",
  ownerInfo: "",
};

export function RegisterPage() {
  const { t } = useTranslation("authPages");
  const { t: tValidation, i18n } = useTranslation("validation");
  const basicRegistrationSchema = useMemo(
    () => createBasicRegistrationSchema(tValidation),
    [tValidation, i18n.language],
  );
  const { signUp, user } = useAuth();
  const { upload: uploadProfileImage } = useUploadProfileImageFile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const intendedRole = useMemo(() => {
    const r = searchParams.get("role");
    if (r === "talent" || r === "vendor" || r === "organizer") return r;
    return null;
  }, [searchParams]);
  const redirectAfterAuth =
    getSafeRedirectPath(
      (location.state as { from?: { pathname: string } } | null)?.from
        ?.pathname,
    ) ?? null;

  const [stage, setStage] = useState<RegisterStage>("basic");
  const [role, setRole] = useState<OnboardingRole>(intendedRole ?? "talent");
  const [wizardStep, setWizardStep] = useState(0);
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [verificationNotice, setVerificationNotice] = useState<string | null>(
    null,
  );
  const [refreshResumeNote, setRefreshResumeNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [talentDraft, setTalentDraft] =
    useState<TalentOnboardingDraft>(EMPTY_TALENT_DRAFT);
  const [vendorDraft, setVendorDraft] =
    useState<VendorOnboardingDraft>(EMPTY_VENDOR_DRAFT);
  const [organizerDraft, setOrganizerDraft] =
    useState<OrganizerOnboardingDraft>(EMPTY_ORGANIZER_DRAFT);
  const [talentMediaInput, setTalentMediaInput] = useState("");
  const [vendorTempInput, setVendorTempInput] = useState("");
  const [organizerSocialInput, setOrganizerSocialInput] = useState("");
  const [pendingProfileImageFile, setPendingProfileImageFile] =
    useState<File | null>(null);

  const { data: saudiRegionsRes } = useGetSaudiRegionsQuery();
  const apiSaudiRegions = saudiRegionsRes?.data;

  const basicForm = useForm<BasicRegistrationFormValues>({
    resolver: yupResolver(
      basicRegistrationSchema,
    ) as Resolver<BasicRegistrationFormValues>,
    mode: "onTouched",
    defaultValues: {
      ...EMPTY_BASIC,
      role: intendedRole ?? "",
    },
  });
  const basicValues = basicForm.watch();
  const selectedFormRole = basicValues.role ?? "";
  const roleFieldError = basicForm.formState.errors.role?.message as
    | string
    | undefined;
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

  const steps = useMemo(() => {
    return t(`register.steps.${role}`, { returnObjects: true }) as string[];
  }, [role, t]);

  const onboardingTitle = useMemo(() => {
    if (role === "talent") return t("register.titles.talent");
    if (role === "vendor") return t("register.titles.vendor");
    return t("register.titles.organizer");
  }, [role, t]);

  function prefillRoleDrafts(values: BaseRegistrationFields) {
    setTalentDraft((prev) => ({
      ...prev,
      fullName: values.fullName,
      contactEmail: values.email,
      contactPhone: values.contactPhone,
    }));
    setVendorDraft((prev) => ({
      ...prev,
      profileName: values.fullName,
      contactEmail: values.email,
      contactPhone: values.contactPhone,
    }));
    setOrganizerDraft((prev) => ({
      ...prev,
      displayName: values.fullName,
      email: values.email,
      contactPhone: values.contactPhone,
      ownerName: values.fullName,
    }));
  }

  function clearRegisterForm() {
    clearRegisterDraft();
    setStage("basic");
    setRole(intendedRole ?? "talent");
    setWizardStep(0);
    setRegistrationPassword("");
    setVerificationNotice(null);
    setRefreshResumeNote(false);
    setError(null);
    setTalentDraft(EMPTY_TALENT_DRAFT);
    setVendorDraft(EMPTY_VENDOR_DRAFT);
    setOrganizerDraft(EMPTY_ORGANIZER_DRAFT);
    setPendingProfileImageFile(null);
    basicForm.reset({ ...EMPTY_BASIC, role: intendedRole ?? "" });
  }

  useEffect(() => {
    const stored = readRegisterDraft();
    const storedRole =
      stored?.role === "talent" ||
      stored?.role === "vendor" ||
      stored?.role === "organizer"
        ? stored.role
        : null;

    if (stored?.basic) {
      basicForm.reset({
        fullName: stored.basic.fullName,
        email: stored.basic.email,
        contactPhone: stored.basic.contactPhone,
        password: "",
        passwordConfirmation: "",
        agreeTerms: stored.basic.agreeTerms,
        role: storedRole ?? intendedRole ?? "",
      });
    }

    if (stored) {
      if (storedRole) setRole(storedRole);
      setWizardStep(stored.wizardStep ?? 0);
      if (stored.talentDraft) setTalentDraft(stored.talentDraft);
      if (stored.vendorDraft) setVendorDraft(stored.vendorDraft);
      if (stored.organizerDraft) setOrganizerDraft(stored.organizerDraft);
      if (stored.stage === "onboarding") {
        setRefreshResumeNote(true);
      }
    }

    setDraftHydrated(true);
  }, [basicForm, intendedRole]);

  useEffect(() => {
    if (!draftHydrated) return;
    const pickedRole =
      selectedFormRole === "talent" ||
      selectedFormRole === "vendor" ||
      selectedFormRole === "organizer"
        ? selectedFormRole
        : role;
    writeRegisterDraft({
      stage,
      role: pickedRole,
      wizardStep,
      basic,
      talentDraft,
      vendorDraft,
      organizerDraft,
    });
  }, [
    basic,
    draftHydrated,
    organizerDraft,
    role,
    selectedFormRole,
    stage,
    talentDraft,
    vendorDraft,
    wizardStep,
  ]);

  useEffect(() => {
    if (!user) return;
    basicForm.reset({
      fullName: user.name,
      email: user.email,
      contactPhone: user.phone,
      password: "",
      passwordConfirmation: "",
      agreeTerms: true,
      role: intendedRole ?? "",
    });
  }, [user, basicForm, intendedRole]);

  const isCurrentRoleStepValid = useMemo(() => {
    if (role === "talent") {
      if (wizardStep === 0) {
        const len = talentDraft.bio.trim().length;
        return len >= TALENT_BIO_MIN_CHARS && len <= TALENT_BIO_MAX_CHARS;
      }
      if (wizardStep === 1) return talentDraft.verificationMedia.length > 0;
      if (wizardStep === 2) {
        return (
          Boolean(talentDraft.saudiRegionId) &&
          Boolean(talentDraft.city.trim()) &&
          isValidSaudiCityFlexible(
            talentDraft.saudiRegionId,
            talentDraft.city.trim(),
            apiSaudiRegions,
          ) &&
          talentDraft.acceptedQualityDisclaimer
        );
      }
      return isTalentDraftReady(talentDraft);
    }
    if (role === "vendor") {
      if (wizardStep === 0) {
        const len = vendorDraft.bio.trim().length;
        return (
          vendorDraft.profileName.trim().length >= 2 &&
          len >= VENDOR_BIO_MIN_CHARS &&
          len <= TALENT_BIO_MAX_CHARS
        );
      }
      if (wizardStep === 1) return vendorDraft.serviceCategories.length > 0;
      if (wizardStep === 2) return vendorDraft.verificationDocuments.length > 0;
      return isVendorDraftReady(vendorDraft);
    }
    if (role === "organizer") {
      if (wizardStep === 0) {
        const len = organizerDraft.bio.trim().length;
        return (
          organizerDraft.displayName.trim().length >= 2 &&
          len >= TALENT_BIO_MIN_CHARS &&
          len <= TALENT_BIO_MAX_CHARS
        );
      }
      if (wizardStep === 1) {
        return (
          organizerDraft.email.includes("@") &&
          organizerDraft.location.trim().length >= 2
        );
      }
      if (wizardStep === 2) {
        const ownerValid =
          organizerDraft.ownerName.trim().length >= 2 &&
          organizerDraft.ownerInfo.trim().length >= 10;
        if (!organizerDraft.isCompany) return ownerValid;
        return (
          ownerValid &&
          (organizerDraft.companyName?.trim().length ?? 0) >= 2 &&
          (organizerDraft.companyInfo?.trim().length ?? 0) >= 10
        );
      }
      return isOrganizerDraftReady(organizerDraft);
    }
    return false;
  }, [apiSaudiRegions, organizerDraft, role, talentDraft, vendorDraft, wizardStep]);

  const handleBasicSubmit = basicForm.handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const pickedRole = values.role;
      if (pickedRole === "guest") {
        if (!user) {
          await signUp(
            values.fullName,
            values.email,
            values.password,
            values.contactPhone,
            Boolean(values.agreeTerms),
          );
        }
        clearRegisterDraft();
        navigate(redirectAfterAuth ?? "/");
        return;
      }

      const nextRole = pickedRole as OnboardingRole;
      if (!user) {
        const signUpResult = await signUp(
          values.fullName,
          values.email,
          values.password,
          values.contactPhone,
          Boolean(values.agreeTerms),
          nextRole,
        );
        setRegistrationPassword(values.password);
        if (signUpResult.status === "verification_required") {
          setVerificationNotice(
            signUpResult.message || t("register.verificationDuringOnboarding"),
          );
        } else {
          setVerificationNotice(null);
        }
      } else {
        setRegistrationPassword(values.password || registrationPassword);
      }

      prefillRoleDrafts(values);
      setRole(nextRole);
      setWizardStep(0);
      setPendingProfileImageFile(null);
      setRefreshResumeNote(false);
      setStage("onboarding");
    } catch (e) {
      setError(authErrorMessage(e, t("register.errors.signUpFailed")));
    } finally {
      setLoading(false);
    }
  });

  async function submitPortalProfile() {
    if (wizardStep !== steps.length - 1) return;
    if (!isCurrentRoleStepValid) return;

    const email = basic.email.trim();
    const password = registrationPassword;
    if (!email || !password) {
      setError(t("register.refreshResumeNote"));
      setStage("basic");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const draft =
        role === "talent"
          ? talentDraft
          : role === "vendor"
            ? vendorDraft
            : organizerDraft;

      await submitRegisterPortalProfile({
        role,
        email,
        password,
        draft,
        uploadProfileImage: user ? uploadProfileImage : undefined,
        pendingProfileImageFile,
      });

      clearRegisterDraft();
      window.location.assign(getRolePortalLoginUrlForRole(role, email));
    } catch (err) {
      setError(
        portalSubmitErrorMessage(
          err,
          t("register.errors.submitProfileFailed"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const roleParam = searchParams.get("role");
  if (roleParam === "talent" || roleParam === "vendor" || roleParam === "organizer") {
    return <Navigate to={`/apply/${roleParam}`} replace />;
  }

  return (
    <div>
      {stage === "basic" && (
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
          {refreshResumeNote ? (
            <InlineNotice variant="info" title={t("register.refreshResumeNote")} className="mt-4">
              <span className="sr-only">{t("register.refreshResumeNote")}</span>
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
          <form
            onSubmit={handleBasicSubmit}
            className="mt-6 space-y-4"
            noValidate
          >
            <SharedBasicStep
              value={basic}
              onChange={setBasicField}
              errors={basicForm.formState.errors}
            />
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {t("register.roleSelection.title")}
              </p>
              <p className="mt-1 text-[12px] text-ink-60">
                {t("register.roleSelection.description")}
              </p>
              {roleFieldError ? (
                <p className="mt-2 text-[12px] font-semibold text-coral">
                  {roleFieldError}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ROLE_CARDS.map((card) => {
                  const Icon = card.icon;
                  const isSelected = selectedFormRole === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() =>
                        basicForm.setValue("role", card.id, {
                          shouldValidate: true,
                          shouldTouch: true,
                        })
                      }
                      aria-pressed={isSelected}
                      className={cn(
                        "min-h-[148px] rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink",
                        card.surface,
                        isSelected && "ring-2 ring-coral ring-offset-2",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-extrabold leading-tight text-ink">
                          {t(`register.roles.${card.id}.label`)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            card.iconTone,
                          )}
                        >
                          <Icon size={20} weight="fill" />
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-70">
                        {t(`register.roles.${card.id}.helper`)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <InlineNotice variant="info" title={t("register.basic.terms")}>
              <p className="text-[12px] text-ink-60">
                {t("register.basic.termsBody")}{" "}
                <Link
                  to="/terms"
                  className="font-semibold text-coral underline"
                >
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
              disabled={loading || basicForm.formState.isSubmitting}
            >
              {selectedFormRole === "guest"
                ? t("register.roleSelection.continueAsGuest")
                : t("register.basic.createAccount")}
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
      )}

      {stage === "onboarding" && (
        <FormSectionCard
          eyebrow={t("register.wizard.eyebrow")}
          title={onboardingTitle}
          description={t("register.wizard.description")}
          className="overflow-hidden p-6"
        >
          {verificationNotice ? (
            <InlineNotice variant="info" title={t("register.verificationDuringOnboarding")}>
              <p className="text-[13px] leading-relaxed text-ink-70">
                {verificationNotice}
              </p>
            </InlineNotice>
          ) : null}
          {error && (
            <div
              role="alert"
              className={cn(
                "rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral",
                verificationNotice ? "mt-4" : "mb-4",
              )}
            >
              {error}
            </div>
          )}
          <OnboardingHeader
            title={steps[wizardStep] ?? t("register.titles.default")}
            description={
              role === "organizer"
                ? t("register.wizard.organizerStepDesc")
                : undefined
            }
            steps={steps}
            activeIdx={wizardStep}
          />
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4"
          >
            {role === "talent" && (
              <TalentSteps
                step={wizardStep}
                draft={talentDraft}
                mediaInput={talentMediaInput}
                setMediaInput={setTalentMediaInput}
                onChange={(patch) =>
                  setTalentDraft((prev) => ({ ...prev, ...patch }))
                }
                deferProfileImageUpload={!user}
                onProfileImageFileChange={setPendingProfileImageFile}
              />
            )}
            {role === "vendor" && (
              <VendorSteps
                step={wizardStep}
                draft={vendorDraft}
                tempInput={vendorTempInput}
                setTempInput={setVendorTempInput}
                onChange={(patch) =>
                  setVendorDraft((prev) => ({ ...prev, ...patch }))
                }
                deferProfileImageUpload={!user}
                onProfileImageFileChange={setPendingProfileImageFile}
              />
            )}
            {role === "organizer" && (
              <OrganizerSteps
                step={wizardStep}
                draft={organizerDraft}
                socialInput={organizerSocialInput}
                setSocialInput={setOrganizerSocialInput}
                onChange={(patch) =>
                  setOrganizerDraft((prev) => ({ ...prev, ...patch }))
                }
                deferProfileImageUpload={!user}
                onProfileImageFileChange={setPendingProfileImageFile}
              />
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full sm:flex-1"
                onClick={() => {
                  if (wizardStep === 0) {
                    setStage("basic");
                    return;
                  }
                  setWizardStep((s) => Math.max(0, s - 1));
                }}
              >
                {t("register.wizard.back")}
              </Button>
              {wizardStep < steps.length - 1 ? (
                <Button
                  type="button"
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  disabled={!isCurrentRoleStepValid}
                  onClick={() =>
                    setWizardStep((s) => Math.min(steps.length - 1, s + 1))
                  }
                >
                  {t("register.wizard.next")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  loading={loading}
                  disabled={!isCurrentRoleStepValid}
                  onClick={() => void submitPortalProfile()}
                >
                  {t("register.wizard.submitProfile")}
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="w-full"
              onClick={clearRegisterForm}
            >
              {t("register.wizard.clearForm")}
            </Button>
          </form>
        </FormSectionCard>
      )}
    </div>
  );
}
