import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Buildings,
  MicrophoneStage,
  Storefront,
  User,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { SharedBasicStep } from "@/components/auth/steps/SharedBasicStep";
import { TalentSteps } from "@/components/auth/steps/TalentSteps";
import { VendorSteps } from "@/components/auth/steps/VendorSteps";
import { OrganizerSteps } from "@/components/auth/steps/OrganizerSteps";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";
import { FormSectionCard } from "@/components/ui/form/FormSectionCard";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import type {
  BaseRegistrationFields,
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from "@/types/domain";
import {
  isOrganizerDraftReady,
  isTalentDraftReady,
  isVendorDraftReady,
  TALENT_BIO_MAX_CHARS,
  TALENT_BIO_MIN_CHARS,
  VENDOR_BIO_MIN_CHARS,
} from "@/lib/onboardingValidation";
import { isValidSaudiCityFlexible } from "@/lib/saudiLocations";
import { getSafeRedirectPath } from "@/lib/navigation";
import { authErrorMessage, toAuthApiError } from "@/lib/authErrors";
import {
  basicRegistrationSchema,
  type BasicRegistrationSchema,
} from "@/schemas/auth";
import { cn } from "@/lib/utils";
import { getToken } from "@/api/authToken";
import {
  clearRegisterDraft,
  readRegisterDraft,
  writeRegisterDraft,
} from "@/lib/formDraftStorage";
import {
  useAddTalentMediaMutation,
  useAddVendorDocumentMutation,
  useAddVendorGalleryItemMutation,
  useAddOrganizerSocialLinkMutation,
  useCreateOrganizerApplicationMutation,
  useCreateTalentApplicationMutation,
  useCreateVendorApplicationMutation,
  useGetMyRoleApplicationsQuery,
  useGetSaudiRegionsQuery,
  useResubmitOrganizerApplicationMutation,
  useResubmitTalentApplicationMutation,
  useResubmitVendorApplicationMutation,
  useSubmitOrganizerApplicationMutation,
  useSubmitTalentApplicationMutation,
  useSubmitVendorApplicationMutation,
  useUpdateOrganizerApplicationMutation,
  useUpdateTalentApplicationMutation,
  useUpdateVendorApplicationMutation,
} from "@/api/endpoints";
import {
  runOrganizerRoleApplicationPipeline,
  runTalentRoleApplicationPipeline,
  runVendorRoleApplicationPipeline,
} from "@/services/roleApplicationSubmit";

type RegisterRole = "guest" | "talent" | "organizer" | "vendor";
type RegisterStage = "basic" | "role-selection" | "onboarding" | "complete";

const REGISTRATION_VERIFICATION_REMINDER =
  "We sent a verification link to your email. Verify your address before signing in.";

interface RoleCard {
  id: RegisterRole;
  label: string;
  responsibility: string;
  helper: string;
  icon: Icon;
  surface: string;
  iconTone: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: "guest",
    label: "Guest",
    responsibility: "Browse events and book tickets quickly.",
    helper: "Fast path, no onboarding required.",
    icon: User,
    surface: "bg-lemon/30 border-lemon/50",
    iconTone: "bg-lemon text-ink",
  },
  {
    id: "talent",
    label: "Talent",
    responsibility: "Showcase your profile and accept event engagements.",
    helper: "For performers, artists, and speakers.",
    icon: MicrophoneStage,
    surface: "bg-coral/10 border-coral/40",
    iconTone: "bg-coral text-white",
  },
  {
    id: "organizer",
    label: "Organizer",
    responsibility: "Create experiences and coordinate event operations.",
    helper: "For event owners and production leads.",
    icon: Buildings,
    surface: "bg-sky/15 border-sky/40",
    iconTone: "bg-sky text-ink",
  },
  {
    id: "vendor",
    label: "Vendor",
    responsibility: "Provide services like staging, lighting, and logistics.",
    helper: "For suppliers and event service providers.",
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
  const { signUp, signInWithOAuth, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectAfterAuth =
    getSafeRedirectPath(
      (location.state as { from?: { pathname: string } } | null)?.from
        ?.pathname,
    ) ?? null;
  const [stage, setStage] = useState<RegisterStage>("role-selection");
  const [role, setRole] = useState<RegisterRole>("guest");
  const [wizardStep, setWizardStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [loadedRegisterDraft, setLoadedRegisterDraft] = useState(false);
  const basicForm = useForm<BasicRegistrationSchema>({
    resolver: yupResolver(basicRegistrationSchema),
    mode: "onTouched",
    defaultValues: {
      ...EMPTY_BASIC,
    },
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
  const [talentDraft, setTalentDraft] =
    useState<TalentOnboardingDraft>(EMPTY_TALENT_DRAFT);
  const [vendorDraft, setVendorDraft] =
    useState<VendorOnboardingDraft>(EMPTY_VENDOR_DRAFT);
  const [organizerDraft, setOrganizerDraft] =
    useState<OrganizerOnboardingDraft>(EMPTY_ORGANIZER_DRAFT);
  const [talentMediaInput, setTalentMediaInput] = useState("");
  const [vendorTempInput, setVendorTempInput] = useState("");
  const [organizerSocialInput, setOrganizerSocialInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const { data: saudiRegionsRes } = useGetSaudiRegionsQuery();
  const apiSaudiRegions = saudiRegionsRes?.data;
  const { data: myRoleApps } = useGetMyRoleApplicationsQuery(undefined, {
    skip: !user,
  });

  const [createTalentApplication] = useCreateTalentApplicationMutation();
  const [updateTalentApplication] = useUpdateTalentApplicationMutation();
  const [addTalentMedia] = useAddTalentMediaMutation();
  const [submitTalentApplication] = useSubmitTalentApplicationMutation();
  const [resubmitTalentApplication] = useResubmitTalentApplicationMutation();

  const [createVendorApplication] = useCreateVendorApplicationMutation();
  const [updateVendorApplication] = useUpdateVendorApplicationMutation();
  const [addVendorDocument] = useAddVendorDocumentMutation();
  const [addVendorGalleryItem] = useAddVendorGalleryItemMutation();
  const [submitVendorApplication] = useSubmitVendorApplicationMutation();
  const [resubmitVendorApplication] = useResubmitVendorApplicationMutation();

  const [createOrganizerApplication] = useCreateOrganizerApplicationMutation();
  const [updateOrganizerApplication] = useUpdateOrganizerApplicationMutation();
  const [addOrganizerSocialLink] = useAddOrganizerSocialLinkMutation();
  const [submitOrganizerApplication] = useSubmitOrganizerApplicationMutation();
  const [resubmitOrganizerApplication] =
    useResubmitOrganizerApplicationMutation();

  function clearRegisterForm() {
    clearRegisterDraft();
    setStage("role-selection");
    setRole("guest");
    setWizardStep(0);
    setError(null);
    setSuccess(null);
    setRegisteredEmail("");
    setCompletionMessage("");
    setApplicationSubmitted(false);
    setTalentDraft(EMPTY_TALENT_DRAFT);
    setVendorDraft(EMPTY_VENDOR_DRAFT);
    setOrganizerDraft(EMPTY_ORGANIZER_DRAFT);
    basicForm.reset(EMPTY_BASIC);
  }

  useEffect(() => {
    const stored = readRegisterDraft();
    if (stored) {
      setLoadedRegisterDraft(true);
      setStage(stored.stage);
      setRole(stored.role);
      setWizardStep(stored.wizardStep);
      setTalentDraft(stored.talentDraft);
      setVendorDraft(stored.vendorDraft);
      setOrganizerDraft(stored.organizerDraft);
      basicForm.reset(stored.basic);
    }
    setDraftHydrated(true);
  }, [basicForm]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (stage === "complete") return;
    writeRegisterDraft({
      stage,
      role,
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
    stage,
    talentDraft,
    vendorDraft,
    wizardStep,
  ]);

  useEffect(() => {
    const rp = searchParams.get("role");
    if (rp !== "talent" && rp !== "vendor" && rp !== "organizer") return;
    setRole(rp);
    setStage("onboarding");
    setWizardStep(0);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    if (loadedRegisterDraft) return;
    basicForm.reset({
      fullName: user.name,
      email: user.email,
      contactPhone: user.phone,
      password: "",
      passwordConfirmation: "",
      agreeTerms: true,
    });
  }, [user, basicForm, loadedRegisterDraft]);

  const steps = useMemo(() => {
    if (role === "talent")
      return ["Talent profile", "Verification", "Preferences"];
    if (role === "vendor") return ["Vendor profile", "Services", "Compliance"];
    return ["Public profile", "Contacts", "Entity details", "Social"];
  }, [role]);

  const onboardingTitle = useMemo(() => {
    if (role === "talent") return "Talent onboarding";
    if (role === "vendor") return "Vendor onboarding";
    if (role === "organizer") return "Organizer onboarding";
    return "Create your account";
  }, [role]);

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
  }, [
    organizerDraft,
    role,
    talentDraft,
    vendorDraft,
    wizardStep,
    apiSaudiRegions,
  ]);

  const continueAsGuest = basicForm.handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await signUp(
        values.fullName,
        values.email,
        values.password,
        values.contactPhone,
        Boolean(values.agreeTerms),
      );
      clearRegisterDraft();
      setRegisteredEmail(values.email);
      setApplicationSubmitted(false);
      setCompletionMessage(
        result.status === "verification_required"
          ? result.message
          : REGISTRATION_VERIFICATION_REMINDER,
      );
      setStage("complete");
    } catch (e) {
      setError(authErrorMessage(e, "Sign-up failed."));
    } finally {
      setLoading(false);
    }
  });

  async function continueWithGoogle() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInWithOAuth("google");
      // Navigation happens via window.location during the OAuth round-trip.
    } catch (e) {
      setError(authErrorMessage(e, "Could not start Google sign-in."));
    } finally {
      setLoading(false);
    }
  }

  const handleBasicSubmit = basicForm.handleSubmit(() => {
    setError(null);
    setSuccess(null);
    setStage("role-selection");
  });

  function selectRole(nextRole: RegisterRole) {
    setError(null);
    setSuccess(null);
    setRole(nextRole);
    if (nextRole === "guest") return;
    if (nextRole === "talent") {
      setTalentDraft((prev) => ({
        ...prev,
        fullName: prev.fullName || basic.fullName,
        contactEmail: prev.contactEmail || basic.email,
        contactPhone: prev.contactPhone || basic.contactPhone,
      }));
    }
    if (nextRole === "vendor") {
      setVendorDraft((prev) => ({
        ...prev,
        profileName: prev.profileName || basic.fullName,
        contactEmail: prev.contactEmail || basic.email,
        contactPhone: prev.contactPhone || basic.contactPhone,
      }));
    }
    if (nextRole === "organizer") {
      setOrganizerDraft((prev) => ({
        ...prev,
        displayName: prev.displayName || basic.fullName,
        email: prev.email || basic.email,
        contactPhone: prev.contactPhone || basic.contactPhone,
        ownerName: prev.ownerName || basic.fullName,
      }));
    }
    setWizardStep(0);
    setStage("onboarding");
  }

  async function submitRoleOnboardingFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!isCurrentRoleStepValid) return;
    if (role === "guest") return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let verificationMessage = REGISTRATION_VERIFICATION_REMINDER;
      if (!user) {
        const signUpResult = await signUp(
          basic.fullName,
          basic.email,
          basic.password,
          basic.contactPhone,
          Boolean(basic.agreeTerms),
        );
        if (signUpResult.status === "verification_required") {
          verificationMessage = signUpResult.message;
        }
      }

      const hasSession = Boolean(user || getToken());
      const basicPayload = user
        ? { fullName: user.name, email: user.email, contactPhone: user.phone }
        : {
            fullName: basic.fullName,
            email: basic.email,
            contactPhone: basic.contactPhone,
          };

      const talentSummary = myRoleApps?.talent;
      const vendorSummary = myRoleApps?.vendor;
      const organizerSummary = myRoleApps?.organizer;

      const talentMutations = {
        createTalentApplication: (
          body: Parameters<typeof createTalentApplication>[0],
        ) => createTalentApplication(body).unwrap(),
        updateTalentApplication: (
          args: Parameters<typeof updateTalentApplication>[0],
        ) => updateTalentApplication(args).unwrap(),
        addTalentMedia: (args: Parameters<typeof addTalentMedia>[0]) =>
          addTalentMedia(args).unwrap(),
        submitTalentApplication: (
          args: Parameters<typeof submitTalentApplication>[0],
        ) => submitTalentApplication(args).unwrap(),
        resubmitTalentApplication: (
          args: Parameters<typeof resubmitTalentApplication>[0],
        ) => resubmitTalentApplication(args).unwrap(),
      };

      const vendorMutations = {
        createVendorApplication: (
          body: Parameters<typeof createVendorApplication>[0],
        ) => createVendorApplication(body).unwrap(),
        updateVendorApplication: (
          args: Parameters<typeof updateVendorApplication>[0],
        ) => updateVendorApplication(args).unwrap(),
        addVendorDocument: (args: Parameters<typeof addVendorDocument>[0]) =>
          addVendorDocument(args).unwrap(),
        addVendorGalleryItem: (
          args: Parameters<typeof addVendorGalleryItem>[0],
        ) => addVendorGalleryItem(args).unwrap(),
        submitVendorApplication: (
          args: Parameters<typeof submitVendorApplication>[0],
        ) => submitVendorApplication(args).unwrap(),
        resubmitVendorApplication: (
          args: Parameters<typeof resubmitVendorApplication>[0],
        ) => resubmitVendorApplication(args).unwrap(),
      };

      const organizerMutations = {
        createOrganizerApplication: (
          body: Parameters<typeof createOrganizerApplication>[0],
        ) => createOrganizerApplication(body).unwrap(),
        updateOrganizerApplication: (
          args: Parameters<typeof updateOrganizerApplication>[0],
        ) => updateOrganizerApplication(args).unwrap(),
        addOrganizerSocialLink: (
          args: Parameters<typeof addOrganizerSocialLink>[0],
        ) => addOrganizerSocialLink(args).unwrap(),
        submitOrganizerApplication: (
          args: Parameters<typeof submitOrganizerApplication>[0],
        ) => submitOrganizerApplication(args).unwrap(),
        resubmitOrganizerApplication: (
          args: Parameters<typeof resubmitOrganizerApplication>[0],
        ) => resubmitOrganizerApplication(args).unwrap(),
      };

      let submittedApplication = false;
      if (hasSession && role === "talent") {
        await runTalentRoleApplicationPipeline(
          {
            draft: {
              ...talentDraft,
              fullName: talentDraft.fullName.trim() || basicPayload.fullName,
              contactEmail:
                talentDraft.contactEmail.trim() || basicPayload.email,
              contactPhone:
                talentDraft.contactPhone.trim() || basicPayload.contactPhone,
            },
            basic: basicPayload,
            finalize: "submit",
            existingApplicationId: talentSummary?.id,
            existingApiStatus:
              talentSummary?.status != null
                ? String(talentSummary.status)
                : null,
            existingMediaUrls: [],
          },
          talentMutations,
        );
        submittedApplication = true;
      }
      if (hasSession && role === "vendor") {
        await runVendorRoleApplicationPipeline(
          {
            draft: {
              ...vendorDraft,
              profileName:
                vendorDraft.profileName.trim() || basicPayload.fullName,
              contactEmail:
                vendorDraft.contactEmail.trim() || basicPayload.email,
              contactPhone:
                vendorDraft.contactPhone.trim() || basicPayload.contactPhone,
            },
            basic: basicPayload,
            finalize: "submit",
            existingApplicationId: vendorSummary?.id,
            existingApiStatus:
              vendorSummary?.status != null
                ? String(vendorSummary.status)
                : null,
            existingDocumentUrls: [],
            existingGalleryUrls: [],
          },
          vendorMutations,
        );
        submittedApplication = true;
      }
      if (hasSession && role === "organizer") {
        await runOrganizerRoleApplicationPipeline(
          {
            draft: {
              ...organizerDraft,
              displayName:
                organizerDraft.displayName.trim() || basicPayload.fullName,
              email: organizerDraft.email.trim() || basicPayload.email,
              contactPhone:
                organizerDraft.contactPhone.trim() || basicPayload.contactPhone,
              ownerName:
                organizerDraft.ownerName.trim() || basicPayload.fullName,
            },
            basic: basicPayload,
            finalize: "submit",
            existingApplicationId: organizerSummary?.id,
            existingApiStatus:
              organizerSummary?.status != null
                ? String(organizerSummary.status)
                : null,
            existingSocialUrls: [],
          },
          organizerMutations,
        );
        submittedApplication = true;
      }

      clearRegisterDraft();
      setRegisteredEmail(basicPayload.email);
      setApplicationSubmitted(submittedApplication);
      setCompletionMessage(verificationMessage);
      setStage("complete");
    } catch (err) {
      const authErr = toAuthApiError(err, "Could not submit application.");
      const emailErr = authErr.fieldErrors.email?.[0];
      const phoneErr = authErr.fieldErrors.phone?.[0];
      const fullNameErr =
        authErr.fieldErrors.full_name?.[0] ?? authErr.fieldErrors.name?.[0];
      if (emailErr)
        basicForm.setError("email", { type: "server", message: emailErr });
      if (phoneErr)
        basicForm.setError("contactPhone", {
          type: "server",
          message: phoneErr,
        });
      if (fullNameErr)
        basicForm.setError("fullName", {
          type: "server",
          message: fullNameErr,
        });
      setError(authErr.message);
      setStage("basic");
      setWizardStep(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {stage === "basic" && (
        <FormSectionCard
          eyebrow="Create account"
          title="Start with your details"
          description="Create your MyTicket account, then choose how you’ll use the platform."
        >
          <p className="-mt-4 text-[14px] text-ink-60">
            Already have an account?{" "}
            <Link
              to="/login"
              state={location.state}
              className="font-semibold text-coral hover:underline"
            >
              Sign in
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
          {success && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-mint/50 bg-mint/20 px-4 py-3 text-[13px] font-medium text-ink"
            >
              {success}
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
            <InlineNotice variant="info" title="Terms">
              <p className="text-[12px] text-ink-60">
                By registering you agree to the{" "}
                <Link
                  to="/terms"
                  className="font-semibold text-coral underline"
                >
                  Terms of Service
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
              Continue
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[12px] font-medium text-ink-40">
                  or
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full border-ink-20"
              onClick={continueWithGoogle}
              disabled={loading}
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="w-full"
              onClick={clearRegisterForm}
            >
              Clear form
            </Button>
          </form>
        </FormSectionCard>
      )}

      {stage === "role-selection" && (
        <FormSectionCard
          eyebrow="Onboarding"
          title="Choose your role"
          description="Pick one role to continue its onboarding steps on this page. Your account is created only after you finish and submit. You can also skip onboarding and continue as Guest."
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectRole(card.id)}
                  className={cn(
                    "min-h-[178px] rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink",
                    card.surface,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-extrabold leading-tight text-ink">
                        {card.label}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-50">
                        {card.helper}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                        card.iconTone,
                      )}
                    >
                      <Icon size={22} weight="fill" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[13px] leading-relaxed text-ink-70">
                      {card.responsibility}
                    </p>
                    <p className="mt-3 text-[12px] font-bold text-coral">
                      Select role
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setStage("basic")}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="dark"
              size="md"
              className="flex-1"
              loading={loading}
              onClick={continueAsGuest}
            >
              Continue as Guest
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="mt-2 w-full"
            onClick={clearRegisterForm}
          >
            Clear form
          </Button>
        </FormSectionCard>
      )}

      {stage === "onboarding" && role !== "guest" && (
        <FormSectionCard
          eyebrow="Onboarding"
          title={onboardingTitle}
          description="Complete the steps below. You can go back at any time."
          className="overflow-hidden p-6"
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
            >
              {error}
            </div>
          )}
          <OnboardingHeader
            title={steps[wizardStep] ?? "Onboarding"}
            description={
              role === "organizer"
                ? "Build your public organizer profile (demo)."
                : undefined
            }
            steps={steps}
            activeIdx={wizardStep}
          />
          <form onSubmit={submitRoleOnboardingFlow} className="space-y-4">
            {role === "talent" && (
              <TalentSteps
                step={wizardStep}
                draft={talentDraft}
                mediaInput={talentMediaInput}
                setMediaInput={setTalentMediaInput}
                onChange={(patch) =>
                  setTalentDraft((prev) => ({ ...prev, ...patch }))
                }
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
                    setStage("role-selection");
                    return;
                  }
                  setWizardStep((s) => Math.max(0, s - 1));
                }}
              >
                Back
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
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  className="w-full sm:flex-1"
                  loading={loading}
                  disabled={!isCurrentRoleStepValid}
                >
                  Submit {role} application
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
              Clear form
            </Button>
          </form>
        </FormSectionCard>
      )}

      {stage === "complete" && (
        <FormSectionCard
          eyebrow="Registration"
          title="Account created"
          description="You're almost ready to use MyTicket."
        >
          <InlineNotice variant="info" title="Verify your email">
            <p className="text-[13px] leading-relaxed text-ink-70">
              {completionMessage || REGISTRATION_VERIFICATION_REMINDER}
              {registeredEmail ? (
                <>
                  {" "}
                  We sent the link to{" "}
                  <strong className="text-ink">{registeredEmail}</strong>.
                </>
              ) : null}
            </p>
          </InlineNotice>
          {applicationSubmitted && role !== "guest" && (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-70">
              Your <strong className="text-ink">{role}</strong> application was
              submitted and is pending review.
            </p>
          )}
          {!applicationSubmitted && role !== "guest" && (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-70">
              After you verify your email and sign in, you can finish submitting
              your <strong className="text-ink">{role}</strong> application from
              your account.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="dark"
              size="md"
              className="w-full sm:flex-1"
              onClick={() => navigate("/login", { replace: true })}
            >
              Go to sign in
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:flex-1"
              onClick={() => navigate(redirectAfterAuth ?? "/")}
            >
              Back to home
            </Button>
          </div>
        </FormSectionCard>
      )}
    </div>
  );
}
