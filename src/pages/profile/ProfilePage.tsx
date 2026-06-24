import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { AccountProfileAvatar } from '@/components/profile/AccountProfileAvatar';
import { RoleUpgradeBannersSection } from '@/components/sections/RoleUpgradeBannersSection';
import {
  canonicalPlaceName,
  findRegionIdByName,
  getCitiesForRegionFlexible,
  getRegionsFlexible,
  resolveCitySelectValue,
} from '@/lib/saudiLocations';
import { pickLocalizedName, type AppLanguage } from '@/i18n';
import { isOrganizerUser } from '@/lib/organizerPortal';
import { isTalentUser } from '@/lib/talentPortal';
import { isVendorUser } from '@/lib/vendorPortal';
import type { UserSession } from '@/api/types/user';
import {
  useGetPreferencesQuery,
  useGetSaudiRegionsQuery,
  useListDevicesQuery,
  useListSavedCardsQuery,
  useListSessionsQuery,
  useRemoveDeviceMutation,
  useRevokeSessionMutation,
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

type DeleteAccountFormValues = {
  confirmation: string;
  reason: string;
};

export function ProfilePage() {
  const { t } = useTranslation(['profile', 'common']);
  const { t: tValidation, i18n } = useTranslation('validation');
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;
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
  const {
    user,
    signOut,
    updateAccountInfo,
    updatePreferences,
    updateSecuritySettings,
    changePassword,
    requestEmailChange,
    requestAccountDeletion,
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

  const { data: savedCardsRaw, isFetching: savedCardsLoading, isError: savedCardsError } =
    useListSavedCardsQuery(undefined, { skip: !user });
  const savedCards: SavedCard[] = useMemo(() => {
    if (!savedCardsRaw) return [];
    if (Array.isArray(savedCardsRaw)) return savedCardsRaw;
    return savedCardsRaw.data ?? [];
  }, [savedCardsRaw]);

  const { data: saudiRegionsRes } = useGetSaudiRegionsQuery();
  const apiSaudiRegions = saudiRegionsRes?.data;

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<{
    queued_resales: number;
    scheduled_purge_at: string;
  } | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.security.twoFactorEnabled ?? false);

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
      email_notifications: true,
      push_notifications: true,
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

  const regionOptions = getRegionsFlexible(apiSaudiRegions);

  useEffect(() => {
    if (!user) return;
    setTwoFactorEnabled(user.security.twoFactorEnabled);
  }, [user?.security.twoFactorEnabled, user]);

  useEffect(() => {
    if (!user) return;
    const mappedRegion =
      findRegionIdByName(user.region ?? '', apiSaudiRegions) ||
      (user.region && /^\d+$/.test(String(user.region)) ? String(user.region) : '');
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
  }, [user, profileForm, apiSaudiRegions]);

  useEffect(() => {
    if (!prefsFromApi) return;
    preferencesForm.reset({
      language: prefsFromApi.language,
      email_notifications: prefsFromApi.email_notifications,
      push_notifications: prefsFromApi.push_notifications,
    });
  }, [prefsFromApi, preferencesForm]);

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
        emailNotifications: Boolean(values.email_notifications),
        pushNotifications: Boolean(values.push_notifications),
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
                      {regionOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {pickLocalizedName(r, language)}
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
                      value={resolveCitySelectValue(field.value ?? '', accountCities)}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      disabled={!profileRegion}
                      className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] disabled:cursor-not-allowed disabled:bg-ink-5 disabled:text-ink-40"
                    >
                      <option value="">
                        {profileRegion ? t('info.selectCity') : t('info.chooseRegionFirst')}
                      </option>
                      {accountCities.map((c) => (
                        <option key={c.id} value={canonicalPlaceName(c)}>
                          {pickLocalizedName(c, language)}
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
            <div className="grid gap-4">
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
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('email_notifications')} />
                {t('preferences.emailNotifications')}
              </label>
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-60">
                <input type="checkbox" {...preferencesForm.register('push_notifications')} />
                {t('preferences.pushNotifications')}
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
          <RoleUpgradeBannersSection variant="profile" />
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
