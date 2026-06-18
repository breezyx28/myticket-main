import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleOnboardingStatus, TalentOnboardingDraft } from '@/types/domain';
import { AccountProfileAvatar } from '@/components/profile/AccountProfileAvatar';
import { DraftProfileImageAvatarInput } from '@/components/auth/DraftProfileImageAvatarInput';
import { TALENT_BIO_MAX_CHARS, TALENT_BIO_MIN_CHARS } from '@/lib/onboardingValidation';
import {
  getCitiesForRegionFlexible,
  getRegionsFlexible,
  isValidSaudiCityFlexible,
  SAUDI_REGIONS,
} from '@/lib/saudiLocations';
import { apiStatusToOnboardingStatus, apiTalentDetailToDraft } from '@/lib/roleApplicationMappers';
import { runTalentRoleApplicationPipeline } from '@/services/roleApplicationSubmit';
import { isOrganizerUser } from '@/lib/organizerPortal';
import { isTalentUser } from '@/lib/talentPortal';
import { buildVendorPortalUrl, isVendorUser } from '@/lib/vendorPortal';
import type { RoleApplicationSummary } from '@/api/types/roleApplication';
import type { UserSession } from '@/api/types/user';
import {
  useAddTalentMediaMutation,
  useCreateTalentApplicationMutation,
  useGetPreferencesQuery,
  useGetRoleApplicationQuery,
  useGetTalentAvailabilityQuery,
  useGetMyRoleApplicationsQuery,
  useGetSaudiRegionsQuery,
  useListDevicesQuery,
  useListSavedCardsQuery,
  useListSessionsQuery,
  useRemoveDeviceMutation,
  useResubmitTalentApplicationMutation,
  useRevokeSessionMutation,
  useSubmitTalentApplicationMutation,
  useUpdateTalentApplicationMutation,
  useWithdrawTalentApplicationMutation,
  useWithdrawVendorApplicationMutation,
  useWithdrawOrganizerApplicationMutation,
  useResubmitVendorApplicationMutation,
  useResubmitOrganizerApplicationMutation,
} from '@/api/endpoints';
import type { SavedCard } from '@/api/types/savedCard';
import { SavedCardsSection } from '@/components/profile/SavedCardsSection';
import { toAuthApiError } from '@/lib/authErrors';
import {
  createDeleteAccountSchema,
  createUpdatePreferencesSchema,
  createUpdateProfileSchema,
  type UpdatePreferencesSchema,
  type UpdateProfileSchema,
} from '@/schemas/profile';
import { createChangePasswordSchema, type ChangePasswordSchema } from '@/schemas/auth';
import { EmailChangeDialog } from '@/pages/profile/EmailChangeDialog';

const EMPTY_DRAFT: TalentOnboardingDraft = {
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
const SAUDI_COUNTRY_CODE = '+966';

function formatSeenAt(iso?: string | null, emDash = '—'): string {
  if (!iso) return emDash;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return emDash;
  }
}

/** Relative time for device `last_seen_at` (falls back to em dash). */
function formatRelativeSeenAt(iso?: string | null, emDash = '—'): string {
  if (!iso) return emDash;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return emDash;
  const sec = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [86400 * 7, 'day'],
    [86400 * 30, 'week'],
    [86400 * 365, 'month'],
    [Infinity, 'year'],
  ];
  for (let i = 0; i < divisions.length; i++) {
    const [limit, unit] = divisions[i];
    if (Math.abs(sec) < limit) {
      const prev = i === 0 ? 1 : divisions[i - 1][0];
      const value = Math.round(sec / prev);
      return rtf.format(-value, unit);
    }
  }
  return rtf.format(-Math.round(sec / (86400 * 365)), 'year');
}

type ProfileTab = 'info' | 'preferences' | 'cards' | 'security' | 'roles' | 'danger';

function readApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const candidate = (err as { data?: unknown }).data;
    if (candidate && typeof candidate === 'object') {
      const message = (candidate as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
    const direct = (err as { message?: unknown }).message;
    if (typeof direct === 'string' && direct.trim().length > 0) return direct;
  }
  return fallback;
}

type DeleteAccountFormValues = {
  confirmation: string;
  reason: string;
};

export function ProfilePage() {
  const { t } = useTranslation(['profile', 'common']);
  const { t: tValidation, i18n } = useTranslation('validation');
  const updateProfileSchema = useMemo(
    () => createUpdateProfileSchema(tValidation),
    [tValidation, i18n.language],
  );
  const updatePreferencesSchema = useMemo(
    () => createUpdatePreferencesSchema(tValidation),
    [tValidation, i18n.language],
  );
  const changePasswordSchema = useMemo(
    () => createChangePasswordSchema(tValidation),
    [tValidation, i18n.language],
  );
  const deleteAccountSchema = useMemo(
    () => createDeleteAccountSchema(tValidation),
    [tValidation, i18n.language],
  );
  const navigate = useNavigate();
  const {
    user,
    signOut,
    updateAccountInfo,
    updatePreferences,
    updateSecuritySettings,
    changePassword,
    requestEmailChange,
    requestAccountDeletion,
    setTalentAvailabilityStatus,
  } = useAuth();

  const { data: prefsFromApi } = useGetPreferencesQuery(undefined, { skip: !user });
  const { data: sessions = [], isFetching: sessionsLoading } = useListSessionsQuery(undefined, { skip: !user });
  const sessionRows: UserSession[] = useMemo(() => {
    if (!sessions) return [];
    if (Array.isArray(sessions)) return sessions;
    if (typeof sessions === 'object' && 'data' in sessions && Array.isArray((sessions as { data?: unknown }).data)) {
      return (sessions as { data: UserSession[] }).data;
    }
    return [];
  }, [sessions]);
  const { data: devices = [], isFetching: devicesLoading } = useListDevicesQuery(undefined, { skip: !user });
  const [revokeSession, { isLoading: revokingSession }] = useRevokeSessionMutation();
  const [removeDevice, { isLoading: removingDevice }] = useRemoveDeviceMutation();
  const { data: talentAvail, isFetching: availLoading } = useGetTalentAvailabilityQuery(undefined, {
    skip: !user || user.role !== 'talent',
  });

  const { data: savedCardsRaw, isFetching: savedCardsLoading, isError: savedCardsError } =
    useListSavedCardsQuery(undefined, { skip: !user });
  const savedCards: SavedCard[] = useMemo(() => {
    if (!savedCardsRaw) return [];
    if (Array.isArray(savedCardsRaw)) return savedCardsRaw;
    return savedCardsRaw.data ?? [];
  }, [savedCardsRaw]);

  const { data: myRoleApps, refetch: refetchMyApps } = useGetMyRoleApplicationsQuery(undefined, { skip: !user });
  const talentSummary = myRoleApps?.talent;
  const vendorSummary = myRoleApps?.vendor;
  const organizerSummary = myRoleApps?.organizer;
  const talentAppId = talentSummary?.id;
  const talentUiStatus = apiStatusToOnboardingStatus(talentSummary?.status);

  const {
    data: talentDetail,
    isLoading: talentDetailLoading,
    refetch: refetchTalentDetail,
  } = useGetRoleApplicationQuery({ role: 'talent', id: talentAppId! }, { skip: !user || !talentAppId });

  const { data: saudiRegionsRes } = useGetSaudiRegionsQuery();
  const apiSaudiRegions = saudiRegionsRes?.data;

  const serverTalentMediaUrls = useMemo(() => {
    const media = talentDetail?.talent_application?.verification_media ?? [];
    return media.map((m) => (typeof m === 'string' ? m : (m.url ?? ''))).filter(Boolean);
  }, [talentDetail]);

  const [createTalentApplication] = useCreateTalentApplicationMutation();
  const [updateTalentApplication] = useUpdateTalentApplicationMutation();
  const [addTalentMedia] = useAddTalentMediaMutation();
  const [submitTalentApplication] = useSubmitTalentApplicationMutation();
  const [resubmitTalentApplication] = useResubmitTalentApplicationMutation();
  const [withdrawTalentApplication] = useWithdrawTalentApplicationMutation();
  const [withdrawVendorApplication] = useWithdrawVendorApplicationMutation();
  const [withdrawOrganizerApplication] = useWithdrawOrganizerApplicationMutation();
  const [resubmitVendorApplication] = useResubmitVendorApplicationMutation();
  const [resubmitOrganizerApplication] = useResubmitOrganizerApplicationMutation();

  const talentMutations = useMemo(
    () => ({
      createTalentApplication: (body: Parameters<typeof createTalentApplication>[0]) =>
        createTalentApplication(body).unwrap(),
      updateTalentApplication: (args: Parameters<typeof updateTalentApplication>[0]) =>
        updateTalentApplication(args).unwrap(),
      addTalentMedia: (args: Parameters<typeof addTalentMedia>[0]) => addTalentMedia(args).unwrap(),
      submitTalentApplication: (args: Parameters<typeof submitTalentApplication>[0]) =>
        submitTalentApplication(args).unwrap(),
      resubmitTalentApplication: (args: Parameters<typeof resubmitTalentApplication>[0]) =>
        resubmitTalentApplication(args).unwrap(),
    }),
    [
      createTalentApplication,
      updateTalentApplication,
      addTalentMedia,
      submitTalentApplication,
      resubmitTalentApplication,
    ],
  );

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [draft, setDraft] = useState<TalentOnboardingDraft>(EMPTY_DRAFT);
  const [talentHydrated, setTalentHydrated] = useState(false);
  const [talentFormBusy, setTalentFormBusy] = useState(false);
  const [mediaInput, setMediaInput] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<{
    queued_resales: number;
    scheduled_purge_at: string;
  } | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.security.twoFactorEnabled ?? false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);

  const profileForm = useForm<UpdateProfileSchema>({
    resolver: yupResolver(updateProfileSchema) as Resolver<UpdateProfileSchema>,
    defaultValues: {
      full_name: '',
      display_name: '',
      bio: '',
      phone: '',
      city: '',
      region: '',
    },
  });

  const preferencesForm = useForm<UpdatePreferencesSchema>({
    resolver: yupResolver(updatePreferencesSchema) as Resolver<UpdatePreferencesSchema>,
    defaultValues: {
      language: 'en',
      theme: 'system',
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      marketing_emails: false,
    },
  });

  const passwordForm = useForm<ChangePasswordSchema>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const deleteForm = useForm<DeleteAccountFormValues>({
    resolver: yupResolver(deleteAccountSchema) as Resolver<DeleteAccountFormValues>,
    defaultValues: { confirmation: '', reason: '' },
  });

  const profileRegion = profileForm.watch('region');
  const accountCities = getCitiesForRegionFlexible(profileRegion ?? '', apiSaudiRegions);

  const talentRegionOptions = getRegionsFlexible(apiSaudiRegions);
  const talentCities = useMemo(
    () => getCitiesForRegionFlexible(draft.saudiRegionId, apiSaudiRegions),
    [draft.saudiRegionId, apiSaudiRegions],
  );

  useEffect(() => {
    if (!user) return;
    setTwoFactorEnabled(user.security.twoFactorEnabled);
  }, [user?.security.twoFactorEnabled, user]);

  useEffect(() => {
    if (!user) return;
    const mappedRegion = SAUDI_REGIONS.find((r) => r.id === user.region || r.name === user.region)?.id ?? '';
    const normalizedPhone = user.phone.startsWith(SAUDI_COUNTRY_CODE)
      ? user.phone
      : `${SAUDI_COUNTRY_CODE}${user.phone.replace(/^\+/, '').trim()}`;
    profileForm.reset({
      full_name: user.name,
      display_name: user.name,
      bio: user.bio,
      phone: normalizedPhone,
      city: user.city,
      region: mappedRegion,
    });
  }, [user, profileForm]);

  useEffect(() => {
    if (!prefsFromApi) return;
    preferencesForm.reset({
      language: prefsFromApi.language,
      theme: prefsFromApi.theme,
      email_notifications: prefsFromApi.email_notifications,
      push_notifications: prefsFromApi.push_notifications,
      sms_notifications: prefsFromApi.sms_notifications,
      marketing_emails: prefsFromApi.marketing_emails,
    });
  }, [prefsFromApi, preferencesForm]);

  useEffect(() => {
    setTalentHydrated(false);
  }, [talentAppId]);

  useEffect(() => {
    if (!user) return;
    if (talentAppId && talentDetailLoading) return;
    if (talentHydrated) return;
    const ta = talentDetail?.talent_application;
    if (ta) {
      setDraft(apiTalentDetailToDraft(ta, { name: user.name, email: user.email, phone: user.phone }));
    } else {
      setDraft({
        ...EMPTY_DRAFT,
        fullName: user.name,
        contactEmail: user.email,
        contactPhone: user.phone,
      });
    }
    setTalentHydrated(true);
  }, [user, talentAppId, talentDetail, talentDetailLoading, talentHydrated]);

  const requiredReady = useMemo(() => {
    const regionOk =
      Boolean(draft.saudiRegionId) &&
      isValidSaudiCityFlexible(draft.saudiRegionId, draft.city.trim(), apiSaudiRegions);
    return (
      draft.fullName.trim().length >= 3 &&
      draft.contactEmail.includes('@') &&
      draft.bio.trim().length >= TALENT_BIO_MIN_CHARS &&
      draft.bio.trim().length <= TALENT_BIO_MAX_CHARS &&
      draft.verificationMedia.length > 0 &&
      draft.acceptedQualityDisclaimer &&
      regionOk
    );
  }, [draft, apiSaudiRegions]);

  const statusBadge = useMemo(() => {
    if (!user) return null;
    if (talentUiStatus === 'approved') return t('statusBadge.approvedTalent');
    if (talentUiStatus === 'submitted') return t('statusBadge.underReview');
    if (talentUiStatus === 'rejected') return t('statusBadge.rejected');
    if (talentUiStatus === 'draft') return t('statusBadge.draft');
    return t('statusBadge.notStarted');
  }, [user, talentUiStatus, t]);

  const talentFormLocked = talentUiStatus === 'submitted' || talentUiStatus === 'approved';

  const talentRejectionReason =
    talentDetail?.rejection_reason ?? talentSummary?.rejection_reason ?? null;

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateAccountInfo({
        name: values.full_name?.trim() ?? '',
        displayName: values.display_name?.trim() ?? '',
        phone: values.phone?.trim() ?? '',
        region: values.region ?? '',
        city: values.city ?? '',
        bio: values.bio ?? '',
      });
      setSaveMessage(t('messages.profileSaved'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.saveProfile')).message);
    }
  });

  const onSavePreferences = preferencesForm.handleSubmit(async (values) => {
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updatePreferences({
        language: values.language as 'en' | 'ar',
        theme: values.theme as 'system' | 'light' | 'dark',
        emailNotifications: Boolean(values.email_notifications),
        pushNotifications: Boolean(values.push_notifications),
        smsNotifications: Boolean(values.sms_notifications),
        marketingEmails: Boolean(values.marketing_emails),
      });
      setSaveMessage(t('messages.preferencesSaved'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.savePreferences')).message);
    }
  });

  function onSaveSecurity(e: React.FormEvent) {
    e.preventDefault();
    updateSecuritySettings({ twoFactorEnabled });
    setSaveMessage(t('messages.securityUpdated'));
  }

  async function onSubmitPassword(values: ChangePasswordSchema) {
    setSaveError(null);
    setSaveMessage(null);
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      passwordForm.reset();
      setSaveMessage(t('messages.passwordUpdated'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.changePassword')).message);
    }
  }

  async function onRevokeSession(id: string, current?: boolean) {
    if (current) return;
    setSaveError(null);
    try {
      await revokeSession({ id }).unwrap();
      setSaveMessage(t('messages.sessionRevoked'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.revokeSession')).message);
    }
  }

  async function onRemoveDevice(id: string) {
    setSaveError(null);
    try {
      await removeDevice({ id }).unwrap();
      setSaveMessage(t('messages.deviceRemoved'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.removeDevice')).message);
    }
  }

  async function onToggleAvailability(next: 'available' | 'reserved') {
    if (!user || user.role !== 'talent') return;
    setSaveError(null);
    setAvailabilityBusy(true);
    try {
      await setTalentAvailabilityStatus(next);
      setSaveMessage(next === 'available' ? t('messages.markedAvailable') : t('messages.markedReserved'));
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.updateAvailability')).message);
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function onSubmitDeleteAccount(values: DeleteAccountFormValues) {
    setSaveError(null);
    try {
      const res = await requestAccountDeletion({
        confirmation: 'DELETE',
        reason: values.reason?.trim() || undefined,
      });
      setDeleteSummary({
        queued_resales: res.queued_resales,
        scheduled_purge_at: String(res.scheduled_purge_at),
      });
    } catch (e) {
      setSaveError(toAuthApiError(e, t('errors.deleteAccount')).message);
    }
  }

  async function onSaveTalentDraft() {
    if (!user) return;
    setSaveError(null);
    setTalentFormBusy(true);
    try {
      await runTalentRoleApplicationPipeline(
        {
          draft,
          basic: { fullName: user.name, email: user.email, contactPhone: user.phone },
          finalize: 'none',
          existingApplicationId: talentSummary?.id,
          existingApiStatus: talentSummary?.status != null ? String(talentSummary.status) : null,
          existingMediaUrls: serverTalentMediaUrls,
        },
        talentMutations,
      );
      await refetchMyApps();
      await refetchTalentDetail();
      setSaveMessage(t('messages.talentDraftSaved'));
    } catch (e) {
      setSaveError(readApiErrorMessage(e, t('errors.saveDraft')));
    } finally {
      setTalentFormBusy(false);
    }
  }

  async function onSubmitTalentApplication() {
    if (!user || !requiredReady) return;
    setSaveError(null);
    setTalentFormBusy(true);
    try {
      await runTalentRoleApplicationPipeline(
        {
          draft,
          basic: { fullName: user.name, email: user.email, contactPhone: user.phone },
          finalize: 'submit',
          existingApplicationId: talentSummary?.id,
          existingApiStatus: talentSummary?.status != null ? String(talentSummary.status) : null,
          existingMediaUrls: serverTalentMediaUrls,
        },
        talentMutations,
      );
      await refetchMyApps();
      await refetchTalentDetail();
      setSaveMessage(t('messages.applicationSubmitted'));
    } catch (e) {
      setSaveError(readApiErrorMessage(e, t('errors.submitApplication')));
    } finally {
      setTalentFormBusy(false);
    }
  }

  async function onWithdrawTalentApplication() {
    if (!talentAppId) return;
    setSaveError(null);
    try {
      await withdrawTalentApplication({ id: talentAppId }).unwrap();
      await refetchMyApps();
      await refetchTalentDetail();
      setSaveMessage(t('messages.talentWithdrawn'));
    } catch (e) {
      setSaveError(readApiErrorMessage(e, t('errors.withdrawApplication')));
    }
  }

  function appendVerificationItem(value: string) {
    const v = value.trim();
    if (!v) return;
    setDraft((prev) => {
      if (prev.verificationMedia.includes(v)) return prev;
      return { ...prev, verificationMedia: [...prev.verificationMedia, v] };
    });
  }

  const bioLen = draft.bio.trim().length;

  function statusText(status: RoleOnboardingStatus) {
    if (status === 'approved') return t('status.approved');
    if (status === 'submitted') return t('status.underReview');
    if (status === 'rejected') return t('status.rejected');
    if (status === 'draft') return t('status.draft');
    return t('status.notStarted');
  }

  function renderVendorOrganizerCard(
    kind: 'vendor' | 'organizer',
    title: string,
    summary: RoleApplicationSummary | null | undefined,
  ) {
    const status = apiStatusToOnboardingStatus(summary?.status);
    const isSubmitted = status === 'submitted';
    const isRejected = status === 'rejected';
    const isApproved = status === 'approved';
    const rejectionReason =
      typeof summary?.rejection_reason === 'string' ? summary.rejection_reason : undefined;

    return (
      <article className="rounded-xl border border-ink-10 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-ink">{title}</p>
          <span className="rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-60">
            {statusText(status)}
          </span>
        </div>
        {isRejected && (
          <p className="mt-2 text-[12px] text-coral">
            {t('otherRoles.rejectionReason')}{' '}
            {rejectionReason ?? t('otherRoles.rejectionFallback')}
          </p>
        )}
        {kind === 'vendor' && !isApproved ? (
          <div className="mt-3">
            <a
              href={buildVendorPortalUrl(
                status === 'submitted' ? '/application/status' : '/application',
                user,
              )}
              className="text-[13px] font-semibold text-coral hover:underline"
            >
              {t('otherRoles.continueVendor')}
            </a>
          </div>
        ) : null}
        {isApproved ? (
          <p className="mt-2 text-[12px] text-mint-dark">{t('otherRoles.roleActive')}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {isRejected && summary?.id && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={async () => {
                  setSaveError(null);
                  try {
                    if (kind === 'vendor') {
                      await resubmitVendorApplication({ id: summary.id }).unwrap();
                    } else {
                      await resubmitOrganizerApplication({ id: summary.id }).unwrap();
                    }
                    await refetchMyApps();
                    if (kind === 'vendor') {
                      window.location.assign(buildVendorPortalUrl('/application', user));
                    } else {
                      navigate(`/apply/${kind}`);
                    }
                  } catch (e) {
                    setSaveError(readApiErrorMessage(e, t('errors.reopenApplication')));
                  }
                }}
              >
                {t('otherRoles.reapply')}
              </Button>
            )}
            {isSubmitted && summary?.id && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={async () => {
                  setSaveError(null);
                  try {
                    if (kind === 'vendor') {
                      await withdrawVendorApplication({ id: summary.id }).unwrap();
                    } else {
                      await withdrawOrganizerApplication({ id: summary.id }).unwrap();
                    }
                    await refetchMyApps();
                    setSaveMessage(
                      kind === 'vendor' ? t('messages.vendorWithdrawn') : t('messages.organizerWithdrawn'),
                    );
                  } catch (e) {
                    setSaveError(readApiErrorMessage(e, t('errors.withdrawApplication')));
                  }
                }}
              >
                {t('otherRoles.withdraw')}
              </Button>
            )}
          </div>
        )}
      </article>
    );
  }

  if (isTalentUser(user)) {
    return <Navigate to="/talent-portal" replace />;
  }

  if (isVendorUser(user)) {
    return <Navigate to="/vendor-portal/profile" replace />;
  }

  if (isOrganizerUser(user)) {
    return <Navigate to="/organizer-portal" replace />;
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6 lg:px-8">
        <h1 className="text-[32px] font-extrabold text-ink">{t('title')}</h1>
        <p className="mt-2 text-[15px] text-ink-60">{t('subtitle')}</p>
        {saveMessage && (
          <p className="mt-3 rounded-lg border border-ink-10 bg-ink-5 px-3 py-2 text-[12px] font-semibold text-ink-60">
            {saveMessage}
          </p>
        )}
        {saveError && (
          <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
            {saveError}
          </p>
        )}

        <div className="mt-8 grid w-full grid-cols-2 gap-1 rounded-2xl border border-ink-10 bg-ink-5/60 p-1 sm:grid-cols-3 lg:grid-cols-6">
          {(['info', 'preferences', 'cards', 'security', 'roles', 'danger'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSaveError(null);
              }}
              className={`w-full rounded-xl px-4 py-2 text-center text-[12px] font-semibold ${
                activeTab === tab ? 'bg-ink text-white' : 'text-ink-60 hover:bg-white'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <form onSubmit={onSaveProfile} className="mt-10 space-y-4 rounded-2xl border border-ink-10 p-6">
            <h2 className="text-lg font-extrabold text-ink">{t('info.title')}</h2>
            <AccountProfileAvatar
              displayName={
                profileForm.watch('display_name')?.trim() ||
                profileForm.watch('full_name')?.trim() ||
                user?.name ||
                t('defaultUser')
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.fullName')}</span>
                <input
                  {...profileForm.register('full_name')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
                {profileForm.formState.errors.full_name && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.displayName')}</span>
                <input
                  {...profileForm.register('display_name')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
                {profileForm.formState.errors.display_name && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">
                    {profileForm.formState.errors.display_name.message}
                  </p>
                )}
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end">
                <label className="block min-w-0 flex-1">
                  <span className="text-[12px] font-semibold text-ink-60">{t('info.email')}</span>
                  <input
                    type="email"
                    readOnly
                    value={user?.email ?? ''}
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-ink-10 bg-ink-5 px-4 py-3 text-[14px] text-ink-60"
                  />
                  <span className="mt-1 block text-[11px] text-ink-40">{t('info.emailHint')}</span>
                </label>
                <Button type="button" variant="outline" size="md" className="shrink-0" onClick={() => setEmailDialogOpen(true)}>
                  {t('info.changeEmail')}
                </Button>
              </div>
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.phone')}</span>
                <Controller
                  name="phone"
                  control={profileForm.control}
                  render={({ field }) => {
                    const raw = field.value ?? '';
                    const digits = raw.startsWith(SAUDI_COUNTRY_CODE)
                      ? raw.slice(SAUDI_COUNTRY_CODE.length).replace(/\D/g, '')
                      : raw.replace(/\D/g, '');
                    return (
                      <div className="mt-1.5 flex overflow-hidden rounded-xl border border-ink-10">
                        <input
                          value={SAUDI_COUNTRY_CODE}
                          readOnly
                          disabled
                          className="w-20 border-r border-ink-10 bg-ink-5 px-3 py-3 text-center text-[14px] font-semibold text-ink-40"
                        />
                        <input
                          type="tel"
                          value={digits}
                          onChange={(e) =>
                            field.onChange(`${SAUDI_COUNTRY_CODE}${e.target.value.replace(/\D/g, '')}`)
                          }
                          placeholder={t('info.phonePlaceholder')}
                          className="min-w-0 flex-1 px-4 py-3 text-[14px] outline-none"
                        />
                      </div>
                    );
                  }}
                />
                {profileForm.formState.errors.phone && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">{profileForm.formState.errors.phone.message}</p>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.region')}</span>
                <Controller
                  name="region"
                  control={profileForm.control}
                  render={({ field }) => (
                    <select
                      ref={field.ref}
                      name={field.name}
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        field.onChange(e);
                        profileForm.setValue('city', '', { shouldValidate: true });
                      }}
                      className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                    >
                      <option value="">{t('info.selectRegion')}</option>
                      {talentRegionOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {profileForm.formState.errors.region && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">{profileForm.formState.errors.region.message}</p>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.city')}</span>
                <Controller
                  name="city"
                  control={profileForm.control}
                  render={({ field }) => (
                    <select
                      ref={field.ref}
                      name={field.name}
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      disabled={!profileRegion}
                      className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] disabled:cursor-not-allowed disabled:bg-ink-5 disabled:text-ink-40"
                    >
                      <option value="">
                        {profileRegion ? t('info.selectCity') : t('info.chooseRegionFirst')}
                      </option>
                      {accountCities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {profileForm.formState.errors.city && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">{profileForm.formState.errors.city.message}</p>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold text-ink-60">{t('info.bio')}</span>
                <textarea
                  rows={4}
                  {...profileForm.register('bio')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  placeholder={t('info.bioPlaceholder')}
                />
                {profileForm.formState.errors.bio && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">{profileForm.formState.errors.bio.message}</p>
                )}
              </label>
            </div>
            <Button type="submit" variant="dark" size="md" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? t('info.saving') : t('info.save')}
            </Button>
          </form>
        )}

        {activeTab === 'preferences' && (
          <form onSubmit={onSavePreferences} className="mt-10 space-y-4 rounded-2xl border border-ink-10 p-6">
            <h2 className="text-lg font-extrabold text-ink">{t('preferences.title')}</h2>
            {!prefsFromApi && user ? (
              <p className="text-[13px] text-ink-40">{t('preferences.loading')}</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('preferences.language')}</span>
                <select
                  {...preferencesForm.register('language')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                >
                  <option value="en">{t('preferences.english')}</option>
                  <option value="ar">{t('preferences.arabic')}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('preferences.theme')}</span>
                <select
                  {...preferencesForm.register('theme')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                >
                  <option value="system">{t('preferences.system')}</option>
                  <option value="light">{t('preferences.light')}</option>
                  <option value="dark">{t('preferences.dark')}</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('email_notifications')} />
                {t('preferences.emailNotifications')}
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('push_notifications')} />
                {t('preferences.pushNotifications')}
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('sms_notifications')} />
                {t('preferences.smsNotifications')}
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('marketing_emails')} />
                {t('preferences.marketingEmails')}
              </label>
            </div>
            <Button type="submit" variant="dark" size="md" disabled={preferencesForm.formState.isSubmitting}>
              {preferencesForm.formState.isSubmitting ? t('preferences.saving') : t('preferences.save')}
            </Button>
          </form>
        )}

        {activeTab === 'cards' && (
          <SavedCardsSection
            savedCards={savedCards}
            loading={savedCardsLoading}
            error={savedCardsError}
            onMessage={(msg) => {
              setSaveError(null);
              setSaveMessage(msg);
            }}
            onError={(msg) => {
              setSaveMessage(null);
              setSaveError(msg);
            }}
          />
        )}

        {activeTab === 'security' && (
          <div className="mt-10 space-y-8">
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="space-y-4 rounded-2xl border border-ink-10 p-6"
            >
              <h2 className="text-lg font-extrabold text-ink">{t('security.changePassword')}</h2>
              <p className="text-[12px] text-ink-40">
                {t('security.lastPasswordChange')}{' '}
                {user?.security.lastPasswordChangedAt
                  ? formatSeenAt(user.security.lastPasswordChangedAt, t('emDash'))
                  : t('emDash')}
              </p>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('security.currentPassword')}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('current_password')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('security.newPassword')}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('new_password')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">{t('security.confirmNewPassword')}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('new_password_confirmation')}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                />
                {passwordForm.formState.errors.new_password_confirmation && (
                  <p className="mt-1 text-[12px] font-semibold text-coral">
                    {passwordForm.formState.errors.new_password_confirmation.message}
                  </p>
                )}
              </label>
              <Button type="submit" variant="dark" size="md" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? t('security.updating') : t('security.updatePassword')}
              </Button>
            </form>

            <section className="rounded-2xl border border-ink-10 p-6">
              <h3 className="text-[15px] font-extrabold text-ink">{t('security.activeSessions')}</h3>
              <p className="mt-1 text-[12px] text-ink-40">{t('security.activeSessionsHint')}</p>
              {sessionsLoading ? (
                <p className="mt-4 text-[13px] text-ink-40">{t('security.loadingSessions')}</p>
              ) : sessionRows.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-40">{t('security.noSessions')}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-ink-10 text-ink-40">
                        <th className="py-2 pr-2 font-semibold">{t('security.device')}</th>
                        <th className="py-2 pr-2 font-semibold">{t('security.ip')}</th>
                        <th className="py-2 pr-2 font-semibold">{t('security.lastActive')}</th>
                        <th className="py-2 font-semibold"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionRows.map((s) => (
                        <tr key={String(s.id)} className="border-b border-ink-10/60 text-ink-60">
                          <td className="py-2 pr-2 align-top">
                            <span className="font-semibold text-ink">{s.device_label ?? t('security.unknownDevice')}</span>
                            {s.current ? (
                              <span className="ml-2 rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint-dark">
                                {t('security.thisDevice')}
                              </span>
                            ) : null}
                            {s.user_agent ? (
                              <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-ink-40">{s.user_agent}</p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 align-top">{s.ip_address ?? t('emDash')}</td>
                          <td className="py-2 pr-2 align-top">{formatSeenAt(s.last_active_at, t('emDash'))}</td>
                          <td className="py-2 align-top text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              disabled={Boolean(s.current) || revokingSession}
                              onClick={() => void onRevokeSession(String(s.id), s.current)}
                            >
                              {t('security.revoke')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-ink-10 p-6">
              <h3 className="text-[15px] font-extrabold text-ink">{t('security.registeredDevices')}</h3>
              <p className="mt-1 text-[12px] text-ink-40">{t('security.registeredDevicesHint')}</p>
              {devicesLoading ? (
                <p className="mt-4 text-[13px] text-ink-40">{t('security.loadingDevices')}</p>
              ) : devices.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-40">{t('security.noDevices')}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-ink-10 text-ink-40">
                        <th className="py-2 pr-2 font-semibold">{t('security.label')}</th>
                        <th className="py-2 pr-2 font-semibold">{t('security.platform')}</th>
                        <th className="py-2 pr-2 font-semibold">{t('security.lastSeen')}</th>
                        <th className="py-2 font-semibold"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((d) => (
                        <tr key={String(d.id)} className="border-b border-ink-10/60 text-ink-60">
                          <td className="py-2 pr-2 align-top">
                            <span>{d.device_label ?? t('emDash')}</span>
                            {d.is_current ? (
                              <span className="ml-2 rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint-dark">
                                {t('security.thisDevice')}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 align-top">{d.platform ?? t('emDash')}</td>
                          <td className="py-2 pr-2 align-top">{formatRelativeSeenAt(d.last_seen_at, t('emDash'))}</td>
                          <td className="py-2 align-top text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              disabled={removingDevice}
                              onClick={() => void onRemoveDevice(String(d.id))}
                            >
                              {t('security.remove')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <form onSubmit={onSaveSecurity} className="space-y-4 rounded-2xl border border-ink-10 p-6">
              <h3 className="text-[15px] font-extrabold text-ink">{t('security.twoFactor')}</h3>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                />
                {t('security.enable2fa')}
              </label>
              <div>
                <Button type="submit" variant="dark" size="md">
                  {t('security.saveSecurity')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'roles' && (
          <>
            {user?.role === 'talent' && (
              <div className="mt-10 rounded-2xl border border-ink-10 p-6">
                <h2 className="text-lg font-extrabold text-ink">{t('talentAvailability.title')}</h2>
                <p className="mt-2 text-[14px] text-ink-60">{t('talentAvailability.lead')}</p>
                {availLoading ? (
                  <p className="mt-4 text-[13px] text-ink-40">{t('talentAvailability.loading')}</p>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-ink-5 px-3 py-1 text-[11px] font-semibold text-ink-60">
                      {t('talentAvailability.status')}{' '}
                      {talentAvail?.status === 'reserved'
                        ? t('talentAvailability.reserved')
                        : t('talentAvailability.available')}
                    </span>
                    <Button
                      type="button"
                      variant={talentAvail?.status === 'available' ? 'dark' : 'outline'}
                      size="md"
                      disabled={availabilityBusy || talentAvail?.status === 'available'}
                      onClick={() => void onToggleAvailability('available')}
                    >
                      {t('talentAvailability.available')}
                    </Button>
                    <Button
                      type="button"
                      variant={talentAvail?.status === 'reserved' ? 'dark' : 'outline'}
                      size="md"
                      disabled={availabilityBusy || talentAvail?.status === 'reserved'}
                      onClick={() => void onToggleAvailability('reserved')}
                    >
                      {t('talentAvailability.reserved')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-10 rounded-2xl border border-ink-10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink">{t('talentOnboarding.title')}</h2>
            <span className="rounded-full bg-ink-5 px-3 py-1 text-[11px] font-semibold text-ink-60">{statusBadge}</span>
          </div>
          <p className="mt-2 text-[14px] text-ink-60">{t('talentOnboarding.lead')}</p>

          {talentUiStatus === 'approved' ? (
            <div className="mt-4 rounded-xl border border-mint/40 bg-mint/15 p-4 text-[13px] text-ink-60">
              <p className="font-semibold text-mint-dark">{t('talentOnboarding.roleActive')}</p>
              <p className="mt-1">{t('talentOnboarding.roleActiveBody')}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {talentUiStatus === 'submitted' && (
                <div className="rounded-xl border border-lemon/50 bg-lemon/15 p-4 text-[13px] text-ink-60">
                  <p className="font-semibold text-ink">{t('talentOnboarding.submittedTitle')}</p>
                  <p className="mt-1">{t('talentOnboarding.submittedBody')}</p>
                </div>
              )}
              {talentUiStatus === 'rejected' && (
                <div className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-[13px] text-ink-60">
                  <p className="font-semibold text-coral">{t('talentOnboarding.rejectedTitle')}</p>
                  <p className="mt-1">
                    {t('talentOnboarding.reason')}{' '}
                    {typeof talentRejectionReason === 'string' && talentRejectionReason.trim().length > 0
                      ? talentRejectionReason
                      : t('talentOnboarding.rejectionFallback')}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.fullName')}</span>
                  <input
                    value={draft.fullName}
                    disabled={talentFormLocked}
                    onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.contactEmail')}</span>
                  <input
                    type="email"
                    value={draft.contactEmail}
                    disabled={talentFormLocked}
                    onChange={(e) => setDraft((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.contactPhone')}</span>
                  <input
                    value={draft.contactPhone}
                    disabled={talentFormLocked}
                    onChange={(e) => setDraft((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                    placeholder={t('talentOnboarding.contactPhonePlaceholder')}
                  />
                </label>
                <div className="sm:col-span-2">
                  <DraftProfileImageAvatarInput
                    value={draft.profileImage}
                    onChange={(url) => setDraft((prev) => ({ ...prev, profileImage: url }))}
                    displayName={draft.fullName.trim() || user?.name || t('defaultUser')}
                    disabled={talentFormLocked}
                  />
                </div>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.saudiRegion')}</span>
                  <select
                    value={draft.saudiRegionId}
                    disabled={talentFormLocked}
                    onChange={(e) => {
                      const id = e.target.value;
                      setDraft((prev) => ({ ...prev, saudiRegionId: id, city: '' }));
                    }}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px]"
                  >
                    <option value="">{t('info.selectRegion')}</option>
                    {talentRegionOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.city')}</span>
                  <select
                    value={draft.city}
                    disabled={talentFormLocked || !draft.saudiRegionId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] disabled:cursor-not-allowed disabled:bg-ink-5 disabled:text-ink-40"
                  >
                    <option value="">
                      {draft.saudiRegionId ? t('info.selectCity') : t('info.chooseRegionFirst')}
                    </option>
                    {talentCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.bio')}</span>
                    <span
                      className={
                        bioLen >= TALENT_BIO_MIN_CHARS
                          ? 'text-[11px] font-bold text-mint-dark'
                          : 'text-[11px] font-bold text-ink-40'
                      }
                    >
                      {t('talentOnboarding.bioMinChars', { count: bioLen, min: TALENT_BIO_MIN_CHARS })}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={draft.bio}
                    disabled={talentFormLocked}
                    onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                    placeholder={t('talentOnboarding.bioPlaceholder')}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-ink-10 bg-ink-5/50 p-4">
                <p className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.verificationTitle')}</p>
                <p className="mt-1 text-[12px] text-ink-40">{t('talentOnboarding.verificationHint')}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={mediaInput}
                    disabled={talentFormLocked}
                    onChange={(e) => setMediaInput(e.target.value)}
                    placeholder={t('talentOnboarding.urlPlaceholder')}
                    className="min-w-0 flex-1 rounded-xl border border-ink-10 bg-white px-4 py-2.5 text-[14px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={talentFormLocked}
                    onClick={() => {
                      appendVerificationItem(mediaInput);
                      setMediaInput('');
                    }}
                  >
                    {t('talentOnboarding.addUrl')}
                  </Button>
                </div>
                {!talentFormLocked && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer flex-col rounded-xl border border-dashed border-ink-20 bg-white px-4 py-3 text-[12px] font-semibold text-ink-60 hover:bg-ink-5">
                      <span>{t('talentOnboarding.videoFile')}</span>
                      <span className="mt-0.5 text-[11px] font-normal text-ink-40">{t('talentOnboarding.videoFormats')}</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) appendVerificationItem(`video:${f.name}`);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <label className="flex cursor-pointer flex-col rounded-xl border border-dashed border-ink-20 bg-white px-4 py-3 text-[12px] font-semibold text-ink-60 hover:bg-ink-5">
                      <span>{t('talentOnboarding.imageFile')}</span>
                      <span className="mt-0.5 text-[11px] font-normal text-ink-40">{t('talentOnboarding.imageFormats')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) appendVerificationItem(`image:${f.name}`);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <label className="flex cursor-pointer flex-col rounded-xl border border-dashed border-ink-20 bg-white px-4 py-3 text-[12px] font-semibold text-ink-60 hover:bg-ink-5 sm:col-span-2">
                      <span>{t('talentOnboarding.certificate')}</span>
                      <span className="mt-0.5 text-[11px] font-normal text-ink-40">{t('talentOnboarding.certificateFormats')}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) appendVerificationItem(`certificate:${f.name}`);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
                {draft.verificationMedia.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {draft.verificationMedia.map((item) => (
                      <li key={item} className="flex items-center justify-between rounded-lg border border-ink-10 bg-white px-3 py-2 text-[12px] text-ink-60">
                        <span className="truncate pr-3">{item}</span>
                        {!talentFormLocked && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                verificationMedia: prev.verificationMedia.filter((media) => media !== item),
                              }))
                            }
                            className="font-semibold text-coral"
                          >
                            {t('talentOnboarding.remove')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-lemon bg-lemon/15 p-4">
                <p className="text-[12px] font-semibold text-ink">{t('talentOnboarding.disclaimerTitle')}</p>
                <p className="mt-1 text-[12px] text-ink-60">{t('talentOnboarding.disclaimerBody')}</p>
                <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-ink-60">
                  <input
                    type="checkbox"
                    checked={draft.acceptedQualityDisclaimer}
                    disabled={talentFormLocked}
                    onChange={(e) => setDraft((prev) => ({ ...prev, acceptedQualityDisclaimer: e.target.checked }))}
                  />
                  {t('talentOnboarding.disclaimerAgree')}
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {!talentFormLocked && (
                  <>
                    <Button type="button" variant="outline" size="md" onClick={() => void onSaveTalentDraft()} loading={talentFormBusy}>
                      {t('talentOnboarding.saveDraft')}
                    </Button>
                    <Button
                      type="button"
                      variant="dark"
                      size="md"
                      onClick={() => void onSubmitTalentApplication()}
                      disabled={!requiredReady || talentFormBusy}
                      loading={talentFormBusy}
                    >
                      {t('talentOnboarding.submitForReview')}
                    </Button>
                  </>
                )}
              </div>

              {talentUiStatus === 'submitted' && talentAppId && (
                <div className="rounded-xl border border-ink-10 bg-white p-4">
                  <p className="text-[12px] font-semibold text-ink-60">{t('talentOnboarding.underReviewTitle')}</p>
                  <p className="mt-1 text-[12px] text-ink-60">{t('talentOnboarding.underReviewBody')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="md" onClick={() => void onWithdrawTalentApplication()}>
                      {t('otherRoles.withdraw')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>

            <div className="mt-10 rounded-2xl border border-ink-10 p-6">
          <h2 className="text-lg font-extrabold text-ink">{t('otherRoles.title')}</h2>
          <p className="mt-2 text-[14px] text-ink-60">{t('otherRoles.lead')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {renderVendorOrganizerCard('vendor', t('otherRoles.vendorTitle'), vendorSummary)}
            {renderVendorOrganizerCard('organizer', t('otherRoles.organizerTitle'), organizerSummary)}
          </div>
            </div>
          </>
        )}

        {activeTab === 'danger' && (
          <>
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-6">
              <h2 className="text-lg font-extrabold text-red-900">{t('delete.title')}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-red-900/80">{t('delete.warning')}</p>
              <Button
                variant="danger"
                size="md"
                className="mt-4"
                type="button"
                onClick={() => {
                  setDeleteOpen(true);
                  setDeleteSummary(null);
                  deleteForm.reset({ confirmation: '', reason: '' });
                }}
              >
                {t('delete.button')}
              </Button>
            </div>

            <p className="mt-10">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-[14px] font-semibold text-coral hover:underline"
              >
                {t('common:signOut')}
              </button>
            </p>
          </>
        )}
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
            {!deleteSummary ? (
              <>
                <h3 className="text-lg font-extrabold text-ink">{t('delete.title')}</h3>
                <p className="mt-2 text-[14px] text-ink-60">{t('delete.confirmLead')}</p>
                <form
                  className="mt-6 space-y-4"
                  onSubmit={deleteForm.handleSubmit((vals: DeleteAccountFormValues) => void onSubmitDeleteAccount(vals))}
                >
                  <label className="block">
                    <span className="text-[12px] font-semibold text-ink-60">{t('delete.confirmation')}</span>
                    <input
                      {...deleteForm.register('confirmation')}
                      placeholder={t('delete.confirmationPlaceholder')}
                      autoComplete="off"
                      className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 font-mono text-[14px]"
                    />
                    {deleteForm.formState.errors.confirmation && (
                      <p className="mt-1 text-[12px] font-semibold text-coral">
                        {deleteForm.formState.errors.confirmation.message}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-ink-60">{t('delete.reasonOptional')}</span>
                    <textarea
                      rows={3}
                      {...deleteForm.register('reason')}
                      className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
                    />
                    {deleteForm.formState.errors.reason && (
                      <p className="mt-1 text-[12px] font-semibold text-coral">
                        {deleteForm.formState.errors.reason.message}
                      </p>
                    )}
                  </label>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="flex-1"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteSummary(null);
                        deleteForm.reset();
                      }}
                    >
                      {t('common:cancel')}
                    </Button>
                    <Button type="submit" variant="danger" size="md" className="flex-1" disabled={deleteForm.formState.isSubmitting}>
                      {deleteForm.formState.isSubmitting ? t('delete.deleting') : t('delete.confirmDelete')}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-lg font-extrabold text-ink">{t('delete.scheduledTitle')}</h3>
                <p className="mt-3 text-[14px] text-ink-60">
                  {t('delete.ticketsQueued')}{' '}
                  <span className="font-bold text-ink">{deleteSummary.queued_resales}</span>
                </p>
                <p className="mt-2 text-[14px] text-ink-60">
                  {t('delete.scheduledPurge')}{' '}
                  <span className="font-bold text-ink">{formatSeenAt(deleteSummary.scheduled_purge_at, t('emDash'))}</span>
                </p>
                <p className="mt-4 text-[12px] text-ink-40">{t('delete.emailFollowUp')}</p>
                <Button
                  variant="dark"
                  size="md"
                  className="mt-6 w-full"
                  type="button"
                  onClick={() => {
                    signOut();
                    setDeleteOpen(false);
                    setDeleteSummary(null);
                    deleteForm.reset();
                  }}
                >
                  {t('common:signOut')}
                </Button>
              </>
            )}
            <p className="mt-4 text-center text-[12px]">
              <Link to="/terms" className="text-coral underline">
                {t('delete.terms')}
              </Link>
            </p>
          </div>
        </div>
      )}

      <EmailChangeDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        requestEmailChange={requestEmailChange}
        onSuccess={(msg) => {
          setSaveError(null);
          setSaveMessage(msg);
        }}
        onError={(m) => setSaveError(m)}
      />
    </div>
  );
}
