import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '@/lib/language';
import type { OrganizerOnboardingDraft } from '@/types/domain';
import { DraftProfileImageAvatarInput } from '@/components/auth/DraftProfileImageAvatarInput';
import { TALENT_BIO_MAX_CHARS, TALENT_BIO_MIN_CHARS } from '@/lib/onboardingValidation';
import { CharCounter } from '@/components/ui/form/CharCounter';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { SaudiPhoneInput } from '@/components/ui/form/SaudiPhoneInput';
import { UploadTileInput } from '@/components/ui/form/UploadTileInput';
import { Select, TextArea, TextInput } from '@/components/ui/form/inputs';
import {
  canonicalPlaceName,
  findRegionIdByCityName,
  getCitiesForRegionFlexible,
  getRegionsFlexible,
  resolveCitySelectValue,
} from '@/lib/saudiLocations';
import { pickLocalizedName } from '@/lib/localized';
import { useGetSaudiRegionsQuery } from '@/api/endpoints';

interface OrganizerStepsProps {
  step: number;
  draft: OrganizerOnboardingDraft;
  socialInput: string;
  setSocialInput: (value: string) => void;
  onChange: (patch: Partial<OrganizerOnboardingDraft>) => void;
  deferProfileImageUpload?: boolean;
  onProfileImageFileChange?: (file: File | null) => void;
}

export function OrganizerSteps({
  step,
  draft,
  socialInput,
  setSocialInput,
  onChange,
  deferProfileImageUpload,
  onProfileImageFileChange,
}: OrganizerStepsProps) {
  const { t, i18n } = useTranslation('authPages');
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;
  const [saudiRegionId, setSaudiRegionId] = useState('');
  const { data: regionsRes } = useGetSaudiRegionsQuery();
  const apiRegions = regionsRes?.data;
  const regions = getRegionsFlexible(apiRegions);
  const organizerCities = useMemo(
    () => getCitiesForRegionFlexible(saudiRegionId, apiRegions),
    [apiRegions, saudiRegionId],
  );
  const locationParts = draft.location.split(' · ');
  const locationCity = locationParts[locationParts.length - 1]?.trim() ?? draft.location.trim();
  const bioLen = draft.bio.trim().length;

  useEffect(() => {
    const matchId = findRegionIdByCityName(locationCity, apiRegions);
    setSaudiRegionId(matchId);
  }, [apiRegions, locationCity]);

  const citySelectValue = resolveCitySelectValue(locationCity, organizerCities);

  function addSocialLink() {
    const value = socialInput.trim();
    if (!value) return;
    if (!draft.socialLinks.includes(value)) {
      onChange({ socialLinks: [...draft.socialLinks, value] });
    }
    setSocialInput('');
  }

  if (step === 0) {
    return (
      <div className="space-y-4">
        <Field label={t('onboarding.organizer.displayName')}>
          <TextInput
            value={draft.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder={t('onboarding.organizer.displayNamePlaceholder')}
          />
        </Field>
        <DraftProfileImageAvatarInput
          value={draft.profileImage}
          onChange={(url) => onChange({ profileImage: url })}
          displayName={draft.displayName.trim() || t('onboarding.organizer.defaultDisplayName')}
          deferUpload={deferProfileImageUpload}
          onFileChange={onProfileImageFileChange}
        />
        <Field
          label={t('onboarding.organizer.bioLabel')}
          right={<CharCounter valueLength={bioLen} min={TALENT_BIO_MIN_CHARS} max={TALENT_BIO_MAX_CHARS} />}
          helperText={t('onboarding.organizer.bioHelper')}
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder={t('onboarding.organizer.bioPlaceholder')}
          />
        </Field>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice variant="info" title={t('onboarding.organizer.contactsTitle')}>
          <p className="text-[12px]">{t('onboarding.organizer.contactsBody')}</p>
        </InlineNotice>
        <Field label={t('onboarding.organizer.email')}>
          <TextInput
            type="email"
            value={draft.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={t('onboarding.organizer.emailPlaceholder')}
          />
        </Field>
        <Field label={t('onboarding.organizer.contactPhone')}>
          <SaudiPhoneInput
            value={draft.contactPhone}
            onChange={(next) => onChange({ contactPhone: next })}
          />
        </Field>
        <Field label={t('onboarding.shared.saudiRegion')}>
          <Select
            value={saudiRegionId}
            onChange={(e) => {
              const id = e.target.value;
              setSaudiRegionId(id);
              onChange({ location: '' });
            }}
          >
            <option value="">{t('onboarding.shared.selectRegion')}</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {pickLocalizedName(region, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('onboarding.shared.city')}>
          <Select
            value={citySelectValue}
            onChange={(e) => {
              const region = regions.find((item) => item.id === saudiRegionId);
              const regionName = region ? canonicalPlaceName(region) : '';
              const cityName = e.target.value;
              onChange({ location: regionName ? `${regionName} · ${cityName}` : cityName });
            }}
            disabled={!saudiRegionId}
          >
            <option value="">
              {saudiRegionId ? t('onboarding.shared.selectCity') : t('onboarding.shared.chooseRegionFirst')}
            </option>
            {organizerCities.map((city) => (
              <option key={city.id} value={canonicalPlaceName(city)}>
                {pickLocalizedName(city, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('onboarding.organizer.documentOptional')} helperText={t('onboarding.organizer.documentHelper')}>
          <div className="space-y-2">
            <UploadTileInput
              title={t('onboarding.organizer.uploadOptionalDocument')}
              subtitle={t('onboarding.vendor.uploadSubtitle')}
              accept="image/*,.pdf,application/pdf"
              onPick={(file) => onChange({ optionalDocument: `document:${file.name}` })}
            />
            {draft.optionalDocument ? (
              <div className="flex items-center justify-between rounded-lg border border-ink-10 bg-white px-3 py-2 text-[12px] text-ink-60">
                <span className="truncate pr-2">{draft.optionalDocument}</span>
                <button
                  type="button"
                  className="font-semibold text-coral"
                  onClick={() => onChange({ optionalDocument: '' })}
                >
                  {t('onboarding.buttons.remove')}
                </button>
              </div>
            ) : null}
          </div>
        </Field>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="space-y-3">
        <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
          <input
            type="checkbox"
            checked={draft.isCompany}
            onChange={(e) => onChange({ isCompany: e.target.checked })}
          />
          {t('onboarding.organizer.companyRegistration')}
        </label>
        {draft.isCompany ? (
          <>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">{t('onboarding.organizer.companyName')}</span>
              <input
                value={draft.companyName ?? ''}
                onChange={(e) => onChange({ companyName: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">{t('onboarding.organizer.companyInfo')}</span>
              <textarea
                rows={3}
                value={draft.companyInfo ?? ''}
                onChange={(e) => onChange({ companyInfo: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
              />
            </label>
          </>
        ) : null}
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-60">{t('onboarding.organizer.ownerName')}</span>
          <input
            value={draft.ownerName}
            onChange={(e) => onChange({ ownerName: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-60">{t('onboarding.organizer.ownerInfo')}</span>
          <textarea
            rows={3}
            value={draft.ownerInfo}
            onChange={(e) => onChange({ ownerInfo: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
          />
        </label>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-ink-60">{t('onboarding.organizer.socialTitle')}</p>
      <div className="flex gap-2">
        <input
          value={socialInput}
          onChange={(e) => setSocialInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSocialLink();
            }
          }}
          className="w-full rounded-xl border border-ink-10 px-4 py-2.5 text-[14px]"
          placeholder={t('onboarding.organizer.socialPlaceholder')}
        />
        <button
          type="button"
          onClick={addSocialLink}
          className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
        >
          {t('onboarding.buttons.add')}
        </button>
      </div>
      <ul className="space-y-1">
        {draft.socialLinks.map((item) => (
          <li key={item} className="flex items-center justify-between rounded-lg border border-ink-10 px-3 py-2 text-[12px] text-ink-60">
            <span className="truncate pr-2">{item}</span>
            <button
              type="button"
              onClick={() => onChange({ socialLinks: draft.socialLinks.filter((x) => x !== item) })}
              className="font-semibold text-coral"
            >
              {t('onboarding.buttons.remove')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
