import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { OnboardingHeader } from '@/components/auth/OnboardingHeader';
import { TalentSteps } from '@/components/auth/steps/TalentSteps';
import { VendorSteps } from '@/components/auth/steps/VendorSteps';
import { OrganizerSteps } from '@/components/auth/steps/OrganizerSteps';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { useAuth } from '@/contexts/AuthContext';
import type { UpgradeRole } from '@/data/roleUpgradeBanners';
import {
  useAddOrganizerSocialLinkMutation,
  useAddTalentMediaMutation,
  useAddVendorDocumentMutation,
  useAddVendorGalleryItemMutation,
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
} from '@/api/endpoints';
import { toAuthApiError } from '@/lib/authErrors';
import {
  clearApplyDraft,
  readApplyDraft,
  writeApplyDraft,
} from '@/lib/formDraftStorage';
import {
  isOrganizerDraftReady,
  isTalentDraftReady,
  isVendorDraftReady,
  TALENT_BIO_MAX_CHARS,
  TALENT_BIO_MIN_CHARS,
  VENDOR_BIO_MIN_CHARS,
} from '@/lib/onboardingValidation';
import { isValidSaudiCityFlexible } from '@/lib/saudiLocations';
import {
  runOrganizerRoleApplicationPipeline,
  runTalentRoleApplicationPipeline,
  runVendorRoleApplicationPipeline,
} from '@/services/roleApplicationSubmit';
import type {
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';

type ApplyStage = 'onboarding' | 'complete';

const EMPTY_TALENT_DRAFT: TalentOnboardingDraft = {
  fullName: '',
  contactEmail: '',
  contactPhone: '',
  profileImage: '',
  bio: '',
  saudiRegionId: '',
  city: '',
  travelReady: false,
  locationPublic: false,
  verificationMedia: [],
  certificateName: '',
  acceptedQualityDisclaimer: false,
};

const EMPTY_VENDOR_DRAFT: VendorOnboardingDraft = {
  profileName: '',
  contactEmail: '',
  contactPhone: '',
  profileImage: '',
  bio: '',
  serviceCategories: [],
  verificationDocuments: [],
  gallery: [],
  city: '',
  coverageArea: '',
};

const EMPTY_ORGANIZER_DRAFT: OrganizerOnboardingDraft = {
  displayName: '',
  profileImage: '',
  bio: '',
  email: '',
  contactPhone: '',
  location: '',
  socialLinks: [],
  optionalDocument: '',
  isCompany: false,
  companyName: '',
  companyInfo: '',
  ownerName: '',
  ownerInfo: '',
};

type RoleOnboardingFlowProps = {
  role: UpgradeRole;
};

export function RoleOnboardingFlow({ role }: RoleOnboardingFlowProps) {
  const { t } = useTranslation('authPages');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<ApplyStage>('onboarding');
  const [wizardStep, setWizardStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [talentDraft, setTalentDraft] = useState<TalentOnboardingDraft>(EMPTY_TALENT_DRAFT);
  const [vendorDraft, setVendorDraft] = useState<VendorOnboardingDraft>(EMPTY_VENDOR_DRAFT);
  const [organizerDraft, setOrganizerDraft] =
    useState<OrganizerOnboardingDraft>(EMPTY_ORGANIZER_DRAFT);
  const [talentMediaInput, setTalentMediaInput] = useState('');
  const [vendorTempInput, setVendorTempInput] = useState('');
  const [organizerSocialInput, setOrganizerSocialInput] = useState('');

  const { data: saudiRegionsRes } = useGetSaudiRegionsQuery();
  const apiSaudiRegions = saudiRegionsRes?.data;
  const { data: myRoleApps } = useGetMyRoleApplicationsQuery();

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
  const [resubmitOrganizerApplication] = useResubmitOrganizerApplicationMutation();

  const steps = useMemo(() => {
    const key = role === 'talent' || role === 'vendor' || role === 'organizer' ? role : 'organizer';
    return t(`onboarding.steps.${key}`, { returnObjects: true }) as string[];
  }, [role, t]);

  const onboardingTitle = useMemo(() => {
    if (role === 'talent') return t('onboarding.titles.talent');
    if (role === 'vendor') return t('onboarding.titles.vendor');
    return t('onboarding.titles.organizer');
  }, [role, t]);

  const roleLabel = t(`onboarding.roles.${role}`);

  function clearApplyForm() {
    clearApplyDraft();
    setStage('onboarding');
    setWizardStep(0);
    setError(null);
    setTalentDraft(EMPTY_TALENT_DRAFT);
    setVendorDraft(EMPTY_VENDOR_DRAFT);
    setOrganizerDraft(EMPTY_ORGANIZER_DRAFT);
    prefillFromUser();
  }

  function prefillFromUser() {
    if (!user) return;
    setTalentDraft((prev) => ({
      ...prev,
      fullName: user.name,
      contactEmail: user.email,
      contactPhone: user.phone,
    }));
    setVendorDraft((prev) => ({
      ...prev,
      profileName: user.name,
      contactEmail: user.email,
      contactPhone: user.phone,
    }));
    setOrganizerDraft((prev) => ({
      ...prev,
      displayName: user.name,
      email: user.email,
      contactPhone: user.phone,
      ownerName: user.name,
    }));
  }

  useEffect(() => {
    const stored = readApplyDraft();
    if (stored && stored.role === role) {
      setWizardStep(stored.wizardStep);
      setTalentDraft(stored.talentDraft);
      setVendorDraft(stored.vendorDraft);
      setOrganizerDraft(stored.organizerDraft);
    }
    setDraftHydrated(true);
  }, [role]);

  useEffect(() => {
    if (!user || !draftHydrated) return;
    const stored = readApplyDraft();
    if (stored?.role === role) return;
    prefillFromUser();
  }, [user, draftHydrated, role]);

  useEffect(() => {
    if (!draftHydrated || stage === 'complete') return;
    writeApplyDraft({
      role,
      wizardStep,
      talentDraft,
      vendorDraft,
      organizerDraft,
    });
  }, [draftHydrated, organizerDraft, role, stage, talentDraft, vendorDraft, wizardStep]);

  const isCurrentRoleStepValid = useMemo(() => {
    if (role === 'talent') {
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
    if (role === 'vendor') {
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
    if (role === 'organizer') {
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
          organizerDraft.email.includes('@') &&
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

  async function submitRoleApplication() {
    if (wizardStep !== steps.length - 1) return;
    if (!isCurrentRoleStepValid || !user) return;

    setLoading(true);
    setError(null);

    try {
      const basicPayload = {
        fullName: user.name,
        email: user.email,
        contactPhone: user.phone,
      };

      const talentSummary = myRoleApps?.talent;
      const vendorSummary = myRoleApps?.vendor;
      const organizerSummary = myRoleApps?.organizer;

      const talentMutations = {
        createTalentApplication: (body: Parameters<typeof createTalentApplication>[0]) =>
          createTalentApplication(body).unwrap(),
        updateTalentApplication: (args: Parameters<typeof updateTalentApplication>[0]) =>
          updateTalentApplication(args).unwrap(),
        addTalentMedia: (args: Parameters<typeof addTalentMedia>[0]) =>
          addTalentMedia(args).unwrap(),
        submitTalentApplication: (args: Parameters<typeof submitTalentApplication>[0]) =>
          submitTalentApplication(args).unwrap(),
        resubmitTalentApplication: (args: Parameters<typeof resubmitTalentApplication>[0]) =>
          resubmitTalentApplication(args).unwrap(),
      };

      const vendorMutations = {
        createVendorApplication: (body: Parameters<typeof createVendorApplication>[0]) =>
          createVendorApplication(body).unwrap(),
        updateVendorApplication: (args: Parameters<typeof updateVendorApplication>[0]) =>
          updateVendorApplication(args).unwrap(),
        addVendorDocument: (args: Parameters<typeof addVendorDocument>[0]) =>
          addVendorDocument(args).unwrap(),
        addVendorGalleryItem: (args: Parameters<typeof addVendorGalleryItem>[0]) =>
          addVendorGalleryItem(args).unwrap(),
        submitVendorApplication: (args: Parameters<typeof submitVendorApplication>[0]) =>
          submitVendorApplication(args).unwrap(),
        resubmitVendorApplication: (args: Parameters<typeof resubmitVendorApplication>[0]) =>
          resubmitVendorApplication(args).unwrap(),
      };

      const organizerMutations = {
        createOrganizerApplication: (body: Parameters<typeof createOrganizerApplication>[0]) =>
          createOrganizerApplication(body).unwrap(),
        updateOrganizerApplication: (args: Parameters<typeof updateOrganizerApplication>[0]) =>
          updateOrganizerApplication(args).unwrap(),
        addOrganizerSocialLink: (args: Parameters<typeof addOrganizerSocialLink>[0]) =>
          addOrganizerSocialLink(args).unwrap(),
        submitOrganizerApplication: (args: Parameters<typeof submitOrganizerApplication>[0]) =>
          submitOrganizerApplication(args).unwrap(),
        resubmitOrganizerApplication: (
          args: Parameters<typeof resubmitOrganizerApplication>[0],
        ) => resubmitOrganizerApplication(args).unwrap(),
      };

      if (role === 'talent') {
        await runTalentRoleApplicationPipeline(
          {
            draft: {
              ...talentDraft,
              fullName: talentDraft.fullName.trim() || basicPayload.fullName,
              contactEmail: talentDraft.contactEmail.trim() || basicPayload.email,
              contactPhone: talentDraft.contactPhone.trim() || basicPayload.contactPhone,
            },
            basic: basicPayload,
            finalize: 'submit',
            existingApplicationId: talentSummary?.id,
            existingApiStatus:
              talentSummary?.status != null ? String(talentSummary.status) : null,
            existingMediaUrls: [],
          },
          talentMutations,
        );
      } else if (role === 'vendor') {
        await runVendorRoleApplicationPipeline(
          {
            draft: {
              ...vendorDraft,
              profileName: vendorDraft.profileName.trim() || basicPayload.fullName,
              contactEmail: vendorDraft.contactEmail.trim() || basicPayload.email,
              contactPhone: vendorDraft.contactPhone.trim() || basicPayload.contactPhone,
            },
            basic: basicPayload,
            finalize: 'submit',
            existingApplicationId: vendorSummary?.id,
            existingApiStatus:
              vendorSummary?.status != null ? String(vendorSummary.status) : null,
            existingDocumentUrls: [],
            existingGalleryUrls: [],
          },
          vendorMutations,
        );
      } else {
        await runOrganizerRoleApplicationPipeline(
          {
            draft: {
              ...organizerDraft,
              displayName: organizerDraft.displayName.trim() || basicPayload.fullName,
              email: organizerDraft.email.trim() || basicPayload.email,
              contactPhone: organizerDraft.contactPhone.trim() || basicPayload.contactPhone,
              ownerName: organizerDraft.ownerName.trim() || basicPayload.fullName,
            },
            basic: basicPayload,
            finalize: 'submit',
            existingApplicationId: organizerSummary?.id,
            existingApiStatus:
              organizerSummary?.status != null ? String(organizerSummary.status) : null,
            existingSocialUrls: [],
          },
          organizerMutations,
        );
      }

      clearApplyDraft();
      setStage('complete');
    } catch (err) {
      setError(toAuthApiError(err, t('onboarding.errors.submitApplicationFailed')).message);
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'complete') {
    return (
      <FormSectionCard
        eyebrow={t('onboarding.roleUpgrade.eyebrow')}
        title={t('onboarding.roleUpgrade.title')}
        description={t('onboarding.roleUpgrade.description')}
      >
        <InlineNotice variant="info" title={t('onboarding.complete.whatHappensNext')}>
          <p className="text-[13px] leading-relaxed text-ink-70">
            <Trans
              i18nKey="onboarding.complete.applicationSubmittedBody"
              ns="authPages"
              values={{ role: roleLabel }}
              components={{ strong: <strong className="text-ink" /> }}
            />
          </p>
        </InlineNotice>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="dark"
            size="md"
            className="w-full sm:flex-1"
            onClick={() => navigate('/profile', { replace: true })}
          >
            {t('onboarding.complete.viewAccount')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full sm:flex-1"
            onClick={() => navigate('/')}
          >
            {t('onboarding.complete.backToHome')}
          </Button>
        </div>
      </FormSectionCard>
    );
  }

  return (
    <FormSectionCard
      eyebrow={t('onboarding.roleUpgrade.eyebrow')}
      title={onboardingTitle}
      description={t('onboarding.roleUpgrade.flowTitle')}
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
        title={steps[wizardStep] ?? t('onboarding.defaultStepTitle')}
        description={
          role === 'organizer' ? t('onboarding.roleUpgrade.organizerDescription') : undefined
        }
        steps={steps}
        activeIdx={wizardStep}
      />
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {role === 'talent' && (
          <TalentSteps
            step={wizardStep}
            draft={talentDraft}
            mediaInput={talentMediaInput}
            setMediaInput={setTalentMediaInput}
            onChange={(patch) => setTalentDraft((prev) => ({ ...prev, ...patch }))}
          />
        )}
        {role === 'vendor' && (
          <VendorSteps
            step={wizardStep}
            draft={vendorDraft}
            tempInput={vendorTempInput}
            setTempInput={setVendorTempInput}
            onChange={(patch) => setVendorDraft((prev) => ({ ...prev, ...patch }))}
          />
        )}
        {role === 'organizer' && (
          <OrganizerSteps
            step={wizardStep}
            draft={organizerDraft}
            socialInput={organizerSocialInput}
            setSocialInput={setOrganizerSocialInput}
            onChange={(patch) => setOrganizerDraft((prev) => ({ ...prev, ...patch }))}
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
                navigate('/');
                return;
              }
              setWizardStep((s) => Math.max(0, s - 1));
            }}
          >
            {t('onboarding.buttons.back')}
          </Button>
          {wizardStep < steps.length - 1 ? (
            <Button
              type="button"
              variant="dark"
              size="md"
              className="w-full sm:flex-1"
              disabled={!isCurrentRoleStepValid}
              onClick={() => setWizardStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              {t('onboarding.buttons.next')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="dark"
              size="md"
              className="w-full sm:flex-1"
              loading={loading}
              disabled={!isCurrentRoleStepValid}
              onClick={() => void submitRoleApplication()}
            >
              {t('onboarding.buttons.submitApplication', { role: roleLabel })}
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          onClick={clearApplyForm}
        >
          {t('onboarding.buttons.clearForm')}
        </Button>
      </form>
    </FormSectionCard>
  );
}
