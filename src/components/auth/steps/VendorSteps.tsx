import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { VendorOnboardingDraft } from "@/types/domain";
import { DraftProfileImageAvatarInput } from "@/components/auth/DraftProfileImageAvatarInput";
import {
  TALENT_BIO_MAX_CHARS,
  VENDOR_BIO_MIN_CHARS,
} from "@/lib/onboardingValidation";
import { CharCounter } from "@/components/ui/form/CharCounter";
import { Field } from "@/components/ui/form/Field";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import { Select, TextArea, TextInput } from "@/components/ui/form/inputs";
import { UploadTileInput } from "@/components/ui/form/UploadTileInput";
import { getCitiesForRegionFlexible, getRegionsFlexible, findRegionIdByCityName, canonicalPlaceName, resolveCitySelectValue } from "@/lib/saudiLocations";
import { pickLocalizedName } from "@/lib/localized";
import type { AppLanguage } from "@/lib/language";
import { useGetSaudiRegionsQuery } from "@/api/endpoints";

interface VendorStepsProps {
  step: number;
  draft: VendorOnboardingDraft;
  tempInput: string;
  setTempInput: (value: string) => void;
  onChange: (patch: Partial<VendorOnboardingDraft>) => void;
  deferProfileImageUpload?: boolean;
  onProfileImageFileChange?: (file: File | null) => void;
}

export function VendorSteps({
  step,
  draft,
  tempInput,
  setTempInput,
  onChange,
  deferProfileImageUpload,
  onProfileImageFileChange,
}: VendorStepsProps) {
  const { t, i18n } = useTranslation("authPages");
  const language = (i18n.language === "ar" ? "ar" : "en") as AppLanguage;
  const [docInput, setDocInput] = useState("");
  const [saudiRegionId, setSaudiRegionId] = useState("");
  const { data: regionsRes } = useGetSaudiRegionsQuery();
  const apiRegions = regionsRes?.data;
  const regions = getRegionsFlexible(apiRegions);
  const vendorCities = useMemo(
    () => getCitiesForRegionFlexible(saudiRegionId, apiRegions),
    [apiRegions, saudiRegionId],
  );
  const citySelectValue = resolveCitySelectValue(draft.city, vendorCities);
  const bioLen = draft.bio.trim().length;

  useEffect(() => {
    setSaudiRegionId(findRegionIdByCityName(draft.city, apiRegions));
  }, [apiRegions, draft.city]);

  if (step === 0) {
    return (
      <div className="space-y-4">
        <DraftProfileImageAvatarInput
          value={draft.profileImage}
          onChange={(url) => onChange({ profileImage: url })}
          displayName={draft.profileName.trim() || t("onboarding.vendor.profileNamePlaceholder")}
          deferUpload={deferProfileImageUpload}
          onFileChange={onProfileImageFileChange}
        />
        <Field label={t("onboarding.vendor.profileName")}>
          <TextInput
            value={draft.profileName}
            onChange={(e) => onChange({ profileName: e.target.value })}
            placeholder={t("onboarding.vendor.profileNamePlaceholder")}
          />
        </Field>

        <Field
          label={t("onboarding.vendor.bioLabel")}
          right={
            <CharCounter
              valueLength={bioLen}
              min={VENDOR_BIO_MIN_CHARS}
              max={TALENT_BIO_MAX_CHARS}
            />
          }
          helperText={t("onboarding.vendor.bioHelper")}
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder={t("onboarding.vendor.bioPlaceholder")}
          />
        </Field>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice variant="info" title={t("onboarding.vendor.categoriesTitle")}>
          <p className="text-[12px]">{t("onboarding.vendor.categoriesBody")}</p>
        </InlineNotice>
        <div className="flex gap-2">
          <TextInput
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            className="!py-2.5"
            placeholder={t("onboarding.vendor.categoryPlaceholder")}
          />
          <button
            type="button"
            onClick={() => {
              const value = tempInput.trim();
              if (!value) return;
              if (!draft.serviceCategories.includes(value)) {
                onChange({
                  serviceCategories: [...draft.serviceCategories, value],
                });
              }
              setTempInput("");
            }}
            className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
          >
            {t("onboarding.buttons.add")}
          </button>
        </div>
        <ul className="space-y-1">
          {draft.serviceCategories.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between rounded-lg border border-ink-10 px-3 py-2 text-[12px] text-ink-60"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    serviceCategories: draft.serviceCategories.filter(
                      (x) => x !== item,
                    ),
                  })
                }
                className="font-semibold text-coral"
              >
                {t("onboarding.buttons.remove")}
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
        <p className="text-[12px] font-semibold text-ink-60">
          {t("onboarding.vendor.verificationTitle")}
        </p>
        <p className="mt-1 text-[11px] text-ink-40">
          {t("onboarding.vendor.verificationBody")}
        </p>
        <div className="mt-3 flex gap-2">
          <TextInput
            value={docInput}
            onChange={(e) => setDocInput(e.target.value)}
            className="!py-2.5"
            placeholder={t("onboarding.vendor.licenseUrlPlaceholder")}
          />
          <button
            type="button"
            onClick={() => {
              const value = docInput.trim();
              if (!value || draft.verificationDocuments.includes(value)) return;
              onChange({
                verificationDocuments: [...draft.verificationDocuments, value],
              });
              setDocInput("");
            }}
            className="rounded-xl border border-ink-10 px-3 text-[12px] font-semibold hover:bg-ink-5"
          >
            {t("onboarding.buttons.add")}
          </button>
        </div>
        <UploadTileInput
          title={t("onboarding.vendor.uploadDocument")}
          subtitle={t("onboarding.vendor.uploadSubtitle")}
          accept="image/*,.pdf,application/pdf"
          className="mt-2 bg-white"
          onPick={(file) => {
            const url = URL.createObjectURL(file);
            const fileValue = `document:${file.name}|local:${url}`;
            if (!draft.verificationDocuments.includes(fileValue)) {
              onChange({
                verificationDocuments: [
                  ...draft.verificationDocuments,
                  fileValue,
                ],
              });
            }
          }}
        />
        {draft.verificationDocuments.length > 0 && (
          <ul className="mt-2 space-y-2">
            {draft.verificationDocuments.map((item) => {
              const [kind, rest] = item.split(":", 2);
              const localSplit = rest?.split("|local:");
              const name = localSplit?.[0] ?? rest;
              const localUrl = localSplit?.[1];
              return (
                <li
                  key={item}
                  className="rounded-lg border border-ink-10 bg-white px-3 py-2 text-[12px] text-ink-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      {localUrl ? (
                        rest?.toLowerCase().endsWith(".pdf") ? (
                          <a
                            href={localUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-coral font-semibold"
                          >
                            {t("onboarding.buttons.open", { name })}
                          </a>
                        ) : (
                          <img
                            src={localUrl}
                            alt={name}
                            className="max-h-24 object-contain"
                          />
                        )
                      ) : (
                        <div className="truncate">{item}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <label className="text-[12px] font-semibold text-ink-40">
                        <input
                          type="file"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const newUrl = URL.createObjectURL(file);
                            const replacement = `${kind}:${file.name}|local:${newUrl}`;
                            onChange({
                              verificationDocuments:
                                draft.verificationDocuments.map((x) =>
                                  x === item ? replacement : x,
                                ),
                            });
                            e.currentTarget.value = "";
                          }}
                        />
                        <span className="cursor-pointer text-coral">
                          {t("onboarding.buttons.replace")}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            verificationDocuments:
                              draft.verificationDocuments.filter(
                                (x) => x !== item,
                              ),
                          })
                        }
                        className="font-semibold text-coral"
                      >
                        {t("onboarding.buttons.remove")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Field label={t("onboarding.shared.saudiRegion")}>
        <Select
          value={saudiRegionId}
          onChange={(e) => {
            const id = e.target.value;
            setSaudiRegionId(id);
            onChange({ city: "" });
          }}
        >
          <option value="">{t("onboarding.shared.selectRegion")}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {pickLocalizedName(region, language)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("onboarding.shared.city")}>
        <Select
          value={citySelectValue}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!saudiRegionId}
        >
          <option value="">
            {saudiRegionId
              ? t("onboarding.shared.selectCity")
              : t("onboarding.shared.chooseRegionFirst")}
          </option>
          {vendorCities.map((city) => (
            <option key={city.id} value={canonicalPlaceName(city)}>
              {pickLocalizedName(city, language)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("onboarding.shared.coverageArea")}>
        <TextInput
          value={draft.coverageArea}
          onChange={(e) => onChange({ coverageArea: e.target.value })}
          placeholder={t("onboarding.shared.coverageAreaPlaceholder")}
        />
      </Field>
    </div>
  );
}
