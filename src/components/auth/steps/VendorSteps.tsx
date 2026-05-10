import { useEffect, useMemo, useState } from 'react';
import type { VendorOnboardingDraft } from '@/types/domain';
import { TALENT_BIO_MAX_CHARS, VENDOR_BIO_MIN_CHARS } from '@/lib/onboardingValidation';
import { CharCounter } from '@/components/ui/form/CharCounter';
import { Field } from '@/components/ui/form/Field';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { Select, TextArea, TextInput } from '@/components/ui/form/inputs';
import { UploadTileInput } from '@/components/ui/form/UploadTileInput';
import { getCitiesForRegion, SAUDI_REGIONS } from '@/lib/saudiLocations';

interface VendorStepsProps {
  step: number;
  draft: VendorOnboardingDraft;
  tempInput: string;
  setTempInput: (value: string) => void;
  onChange: (patch: Partial<VendorOnboardingDraft>) => void;
}

export function VendorSteps({ step, draft, tempInput, setTempInput, onChange }: VendorStepsProps) {
  const [docInput, setDocInput] = useState('');
  const [saudiRegionId, setSaudiRegionId] = useState('');
  const vendorCities = useMemo(() => getCitiesForRegion(saudiRegionId), [saudiRegionId]);
  const bioLen = draft.bio.trim().length;

  useEffect(() => {
    const match = SAUDI_REGIONS.find((region) =>
      getCitiesForRegion(region.id).some((city) => city.name.toLowerCase() === draft.city.trim().toLowerCase())
    );
    setSaudiRegionId(match?.id ?? '');
  }, [draft.city]);

  if (step === 0) {
    return (
      <div className="space-y-4">
        <Field label="Business / profile name *">
          <TextInput
            value={draft.profileName}
            onChange={(e) => onChange({ profileName: e.target.value })}
            placeholder="Your business name"
          />
        </Field>

        <Field
          label="Bio *"
          right={<CharCounter valueLength={bioLen} min={VENDOR_BIO_MIN_CHARS} max={TALENT_BIO_MAX_CHARS} />}
          helperText="Describe what you provide, typical scope, and what you’re best at."
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Share your services, experience, and specialties."
          />
        </Field>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice variant="info" title="Service categories *">
          <p className="text-[12px]">Add categories so organizers can find you (demo).</p>
        </InlineNotice>
        <div className="flex gap-2">
          <TextInput
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            className="!py-2.5"
            placeholder="e.g. Security, Lighting"
          />
          <button
            type="button"
            onClick={() => {
              const value = tempInput.trim();
              if (!value) return;
              if (!draft.serviceCategories.includes(value)) {
                onChange({ serviceCategories: [...draft.serviceCategories, value] });
              }
              setTempInput('');
            }}
            className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {draft.serviceCategories.map((item) => (
            <li key={item} className="flex items-center justify-between rounded-lg border border-ink-10 px-3 py-2 text-[12px] text-ink-60">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange({ serviceCategories: draft.serviceCategories.filter((x) => x !== item) })}
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
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-10 bg-ink-5/50 p-4">
        <p className="text-[12px] font-semibold text-ink-60">Verification document *</p>
        <p className="mt-1 text-[11px] text-ink-40">Add your license URL or upload a file (demo).</p>
        <div className="mt-3 flex gap-2">
          <TextInput
            value={docInput}
            onChange={(e) => setDocInput(e.target.value)}
            className="!py-2.5"
            placeholder="Business license URL"
          />
          <button
            type="button"
            onClick={() => {
              const value = docInput.trim();
              if (!value || draft.verificationDocuments.includes(value)) return;
              onChange({ verificationDocuments: [...draft.verificationDocuments, value] });
              setDocInput('');
            }}
            className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
          >
            Add
          </button>
        </div>
        <UploadTileInput
          title="Upload document"
          subtitle="pdf, image, or scan"
          accept="image/*,.pdf,application/pdf"
          className="mt-2 bg-white"
          onPick={(file) => {
            const fileValue = `document:${file.name}`;
            if (!draft.verificationDocuments.includes(fileValue)) {
              onChange({ verificationDocuments: [...draft.verificationDocuments, fileValue] });
            }
          }}
        />
        {draft.verificationDocuments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {draft.verificationDocuments.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between rounded-lg border border-ink-10 bg-white px-3 py-2 text-[12px] text-ink-60"
              >
                <span className="truncate pr-2">{item}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ verificationDocuments: draft.verificationDocuments.filter((x) => x !== item) })
                  }
                  className="font-semibold text-coral"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Field label="Saudi region *">
        <Select
          value={saudiRegionId}
          onChange={(e) => {
            const id = e.target.value;
            setSaudiRegionId(id);
            onChange({ city: '' });
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
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!saudiRegionId}
        >
          <option value="">{saudiRegionId ? 'Select city' : 'Choose a region first'}</option>
          {vendorCities.map((city) => (
            <option key={city.id} value={city.name}>
              {city.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Coverage area">
        <TextInput
          value={draft.coverageArea}
          onChange={(e) => onChange({ coverageArea: e.target.value })}
          placeholder="e.g. Riyadh + Eastern Province"
        />
      </Field>
    </div>
  );
}
