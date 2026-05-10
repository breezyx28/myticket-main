import type { TalentOnboardingDraft } from '@/types/domain';
import { ProfileImageAvatarInput } from '@/components/auth/ProfileImageAvatarInput';
import { TALENT_BIO_MAX_CHARS, TALENT_BIO_MIN_CHARS } from '@/lib/onboardingValidation';
import { CharCounter } from '@/components/ui/form/CharCounter';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { Select, TextArea, TextInput } from '@/components/ui/form/inputs';
import { UploadTileInput } from '@/components/ui/form/UploadTileInput';
import { getCitiesForRegionFlexible, getRegionsFlexible } from '@/lib/saudiLocations';
import { useGetSaudiRegionsQuery } from '@/api/endpoints';

interface TalentStepsProps {
  step: number;
  draft: TalentOnboardingDraft;
  mediaInput: string;
  setMediaInput: (value: string) => void;
  onChange: (patch: Partial<TalentOnboardingDraft>) => void;
}

function appendMedia(draft: TalentOnboardingDraft, value: string, onChange: (patch: Partial<TalentOnboardingDraft>) => void) {
  const v = value.trim();
  if (!v || draft.verificationMedia.includes(v)) return;
  onChange({ verificationMedia: [...draft.verificationMedia, v] });
}

export function TalentSteps({ step, draft, mediaInput, setMediaInput, onChange }: TalentStepsProps) {
  const bioLen = draft.bio.trim().length;
  const { data: regionsRes } = useGetSaudiRegionsQuery();
  const apiRegions = regionsRes?.data;
  const regions = getRegionsFlexible(apiRegions);
  const cities = getCitiesForRegionFlexible(draft.saudiRegionId, apiRegions);

  if (step === 0) {
    return (
      <div className="space-y-4">
        <ProfileImageAvatarInput
          value={draft.profileImage}
          onChange={(next) => onChange({ profileImage: next })}
          displayName={draft.fullName.trim() || 'User'}
        />

        <Field
          label="Talent bio *"
          right={<CharCounter valueLength={bioLen} min={TALENT_BIO_MIN_CHARS} max={TALENT_BIO_MAX_CHARS} />}
          helperText="Write a short overview of what you do and what makes you a great fit."
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Share your skills, experience, and specialties."
          />
        </Field>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice
          variant="info"
          title="Verification uploads *"
        >
          <p className="text-[12px]">
            Add at least one item: video, image, URL, or certificate document (demo).
          </p>
        </InlineNotice>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextInput
            value={mediaInput}
            onChange={(e) => setMediaInput(e.target.value)}
            className="min-w-0 flex-1 !py-2.5"
            placeholder="Paste URL (https://…)"
          />
          <button
            type="button"
            onClick={() => {
              appendMedia(draft, mediaInput, onChange);
              setMediaInput('');
            }}
            className="shrink-0 rounded-xl border border-ink-10 px-4 py-2.5 text-[12px] font-semibold hover:bg-ink-5"
          >
            Add URL
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <UploadTileInput
            title="Video file"
            subtitle="mp4, webm, mov…"
            accept="video/*"
            onPick={(file) => appendMedia(draft, `video:${file.name}`, onChange)}
          />
          <UploadTileInput
            title="Image file"
            subtitle="jpg, png, webp…"
            accept="image/*"
            onPick={(file) => appendMedia(draft, `image:${file.name}`, onChange)}
          />
          <UploadTileInput
            title="Certificate or document"
            subtitle="pdf, image, or scan"
            accept="image/*,.pdf,application/pdf"
            className="sm:col-span-2"
            onPick={(file) => appendMedia(draft, `certificate:${file.name}`, onChange)}
          />
        </div>

        {draft.verificationMedia.length > 0 && (
          <ul className="space-y-1">
            {draft.verificationMedia.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-10 px-3 py-2 text-[12px] text-ink-60"
              >
                <span className="min-w-0 truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => onChange({ verificationMedia: draft.verificationMedia.filter((x) => x !== item) })}
                  className="shrink-0 font-semibold text-coral"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Saudi region *">
        <Select
          value={draft.saudiRegionId}
          onChange={(e) => {
            const id = e.target.value;
            onChange({ saudiRegionId: id, city: '' });
          }}
        >
          <option value="">Select region</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="City *">
        <Select
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!draft.saudiRegionId}
        >
          <option value="">{draft.saudiRegionId ? 'Select city' : 'Choose a region first'}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
        <input
          type="checkbox"
          checked={draft.locationPublic}
          onChange={(e) => onChange({ locationPublic: e.target.checked })}
        />
        Show my city publicly
      </label>
      <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
        <input
          type="checkbox"
          checked={draft.acceptedQualityDisclaimer}
          onChange={(e) => onChange({ acceptedQualityDisclaimer: e.target.checked })}
        />
        I acknowledge upload quality requirements.
      </label>
    </div>
  );
}
