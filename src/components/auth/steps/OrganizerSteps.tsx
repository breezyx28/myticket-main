import { useEffect, useMemo, useState } from 'react';
import type { OrganizerOnboardingDraft } from '@/types/domain';
import { ProfileImageAvatarInput } from '@/components/auth/ProfileImageAvatarInput';
import { TALENT_BIO_MAX_CHARS, TALENT_BIO_MIN_CHARS } from '@/lib/onboardingValidation';
import { CharCounter } from '@/components/ui/form/CharCounter';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { SaudiPhoneInput } from '@/components/ui/form/SaudiPhoneInput';
import { UploadTileInput } from '@/components/ui/form/UploadTileInput';
import { Select, TextArea, TextInput } from '@/components/ui/form/inputs';
import { getCitiesForRegion, SAUDI_REGIONS } from '@/lib/saudiLocations';

interface OrganizerStepsProps {
  step: number;
  draft: OrganizerOnboardingDraft;
  socialInput: string;
  setSocialInput: (value: string) => void;
  onChange: (patch: Partial<OrganizerOnboardingDraft>) => void;
}

export function OrganizerSteps({ step, draft, socialInput, setSocialInput, onChange }: OrganizerStepsProps) {
  const [saudiRegionId, setSaudiRegionId] = useState('');
  const organizerCities = useMemo(() => getCitiesForRegion(saudiRegionId), [saudiRegionId]);
  const locationParts = draft.location.split(' · ');
  const locationCity = locationParts[locationParts.length - 1]?.trim() ?? draft.location.trim();
  const bioLen = draft.bio.trim().length;

  useEffect(() => {
    const match = SAUDI_REGIONS.find((region) =>
      getCitiesForRegion(region.id).some((city) => city.name.toLowerCase() === locationCity.toLowerCase())
    );
    setSaudiRegionId(match?.id ?? '');
  }, [locationCity]);

  if (step === 0) {
    return (
      <div className="space-y-4">
        <Field label="Display name *">
          <TextInput
            value={draft.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="Your organizer name"
          />
        </Field>
        <ProfileImageAvatarInput
          value={draft.profileImage}
          onChange={(next) => onChange({ profileImage: next })}
          displayName={draft.displayName.trim() || 'Organizer'}
        />
        <Field
          label="Bio *"
          right={<CharCounter valueLength={bioLen} min={TALENT_BIO_MIN_CHARS} max={TALENT_BIO_MAX_CHARS} />}
          helperText="Tell attendees what you organize and what they should expect."
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Describe your events, audience, and experience."
          />
        </Field>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice variant="info" title="Contacts">
          <p className="text-[12px]">These are used for verification and organizer communications (demo).</p>
        </InlineNotice>
        <Field label="Organizer email *">
          <TextInput
            type="email"
            value={draft.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Contact phone (optional)">
          <SaudiPhoneInput
            value={draft.contactPhone}
            onChange={(next) => onChange({ contactPhone: next })}
          />
        </Field>
        <Field label="Saudi region *">
          <Select
            value={saudiRegionId}
            onChange={(e) => {
              const id = e.target.value;
              setSaudiRegionId(id);
              onChange({ location: '' });
            }}
          >
            <option value="">Select region</option>
            {SAUDI_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City *">
          <Select
            value={locationCity}
            onChange={(e) => {
              const regionName = SAUDI_REGIONS.find((region) => region.id === saudiRegionId)?.name ?? '';
              const cityName = e.target.value;
              onChange({ location: regionName ? `${regionName} · ${cityName}` : cityName });
            }}
            disabled={!saudiRegionId}
          >
            <option value="">{saudiRegionId ? 'Select city' : 'Choose a region first'}</option>
            {organizerCities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Document (optional)" helperText="Upload an optional supporting document (demo).">
          <div className="space-y-2">
            <UploadTileInput
              title="Upload optional document"
              subtitle="pdf, image, or scan"
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
                  Remove
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
          This registration is for a company organizer
        </label>
        {draft.isCompany ? (
          <>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">Company name *</span>
              <input
                value={draft.companyName ?? ''}
                onChange={(e) => onChange({ companyName: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">Company information *</span>
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
          <span className="text-[12px] font-semibold text-ink-60">Owner name *</span>
          <input
            value={draft.ownerName}
            onChange={(e) => onChange({ ownerName: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px]"
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-60">Owner info *</span>
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
      <p className="text-[12px] font-semibold text-ink-60">Social media (optional)</p>
      <div className="flex gap-2">
        <input
          value={socialInput}
          onChange={(e) => setSocialInput(e.target.value)}
          className="w-full rounded-xl border border-ink-10 px-4 py-2.5 text-[14px]"
          placeholder="https://instagram.com/..."
        />
        <button
          type="button"
          onClick={() => {
            const value = socialInput.trim();
            if (!value) return;
            if (!draft.socialLinks.includes(value)) {
              onChange({ socialLinks: [...draft.socialLinks, value] });
            }
            setSocialInput('');
          }}
          className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
        >
          Add
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
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
