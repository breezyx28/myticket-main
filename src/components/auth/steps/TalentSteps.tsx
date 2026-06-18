import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TalentOnboardingDraft } from "@/types/domain";
import { DraftProfileImageAvatarInput } from "@/components/auth/DraftProfileImageAvatarInput";
import {
  TALENT_BIO_MAX_CHARS,
  TALENT_BIO_MIN_CHARS,
} from "@/lib/onboardingValidation";
import { CharCounter } from "@/components/ui/form/CharCounter";
import { Field } from "@/components/ui/form/Field";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import { Select, TextArea, TextInput } from "@/components/ui/form/inputs";
import { UploadTileInput } from "@/components/ui/form/UploadTileInput";
import {
  getCitiesForRegionFlexible,
  getRegionsFlexible,
} from "@/lib/saudiLocations";
import { useGetSaudiRegionsQuery } from "@/api/endpoints";

interface TalentStepsProps {
  step: number;
  draft: TalentOnboardingDraft;
  mediaInput: string;
  setMediaInput: (value: string) => void;
  onChange: (patch: Partial<TalentOnboardingDraft>) => void;
}

function appendMedia(
  draft: TalentOnboardingDraft,
  value: string,
  onChange: (patch: Partial<TalentOnboardingDraft>) => void,
) {
  const v = value.trim();
  if (!v || draft.verificationMedia.includes(v)) return;
  onChange({ verificationMedia: [...draft.verificationMedia, v] });
}

export function TalentSteps({
  step,
  draft,
  mediaInput,
  setMediaInput,
  onChange,
}: TalentStepsProps) {
  const { t } = useTranslation("authPages");
  const bioLen = draft.bio.trim().length;
  const { data: regionsRes } = useGetSaudiRegionsQuery();
  const apiRegions = regionsRes?.data;
  const regions = getRegionsFlexible(apiRegions);
  const cities = getCitiesForRegionFlexible(draft.saudiRegionId, apiRegions);

  if (step === 0) {
    return (
      <div className="space-y-4">
        <DraftProfileImageAvatarInput
          value={draft.profileImage}
          onChange={(url) => onChange({ profileImage: url })}
          displayName={draft.fullName.trim() || t("onboarding.talent.defaultDisplayName")}
        />

        <Field
          label={t("onboarding.talent.bioLabel")}
          right={
            <CharCounter
              valueLength={bioLen}
              min={TALENT_BIO_MIN_CHARS}
              max={TALENT_BIO_MAX_CHARS}
            />
          }
          helperText={t("onboarding.talent.bioHelper")}
        >
          <TextArea
            rows={5}
            maxLength={TALENT_BIO_MAX_CHARS}
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder={t("onboarding.talent.bioPlaceholder")}
          />
        </Field>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <InlineNotice variant="info" title={t("onboarding.talent.verificationTitle")}>
          <p className="text-[12px]">{t("onboarding.talent.verificationBody")}</p>
        </InlineNotice>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextInput
            value={mediaInput}
            onChange={(e) => setMediaInput(e.target.value)}
            className="min-w-0 flex-1 !py-2.5"
            placeholder={t("onboarding.talent.urlPlaceholder")}
          />
          <button
            type="button"
            onClick={() => {
              appendMedia(draft, mediaInput, onChange);
              setMediaInput("");
            }}
            className="shrink-0 rounded-xl border border-ink-10 px-4 py-2.5 text-[12px] font-semibold hover:bg-ink-5"
          >
            {t("onboarding.buttons.addUrl")}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <UploadTileInput
            title={t("onboarding.talent.videoFile")}
            subtitle={t("onboarding.talent.videoSubtitle")}
            accept="video/*"
            onPick={(file) => {
              const url = URL.createObjectURL(file);
              appendMedia(draft, `video:${file.name}|local:${url}`, onChange);
            }}
          />
          <UploadTileInput
            title={t("onboarding.talent.imageFile")}
            subtitle={t("onboarding.talent.imageSubtitle")}
            accept="image/*"
            onPick={(file) => {
              const url = URL.createObjectURL(file);
              appendMedia(draft, `image:${file.name}|local:${url}`, onChange);
            }}
          />
          <UploadTileInput
            title={t("onboarding.talent.certificateFile")}
            subtitle={t("onboarding.talent.certificateSubtitle")}
            accept="image/*,.pdf,application/pdf"
            className="sm:col-span-2"
            onPick={(file) => {
              const url = URL.createObjectURL(file);
              appendMedia(
                draft,
                `certificate:${file.name}|local:${url}`,
                onChange,
              );
            }}
          />
        </div>
        {draft.verificationMedia.length > 0 && (
          <ul className="space-y-2">
            {draft.verificationMedia.map((item, idx) => {
              const [kind, rest] = item.split(":", 2);
              const localSplit = rest?.split("|local:");
              const name = localSplit?.[0] ?? rest;
              const localUrl = localSplit?.[1];
              return (
                <li
                  key={item + idx}
                  className="rounded-lg border border-ink-10 px-3 py-2 text-[12px] text-ink-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-[88px] max-w-[240px] flex-1">
                      {kind === "image" && localUrl ? (
                        // image preview
                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                        <img
                          src={localUrl}
                          alt={name}
                          className="w-full rounded-md object-cover"
                        />
                      ) : kind === "video" && localUrl ? (
                        <video
                          src={localUrl}
                          controls
                          className="w-full rounded-md"
                        />
                      ) : kind === "certificate" && localUrl ? (
                        <a
                          href={localUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-coral font-semibold"
                        >
                          {t("onboarding.buttons.open", { name })}
                        </a>
                      ) : rest?.startsWith("http") ? (
                        <UrlPreview url={rest} />
                      ) : (
                        <div className="truncate">{item}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
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
                                verificationMedia: draft.verificationMedia.map(
                                  (x) => (x === item ? replacement : x),
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
                              verificationMedia: draft.verificationMedia.filter(
                                (x) => x !== item,
                              ),
                            })
                          }
                          className="font-semibold text-coral"
                        >
                          {t("onboarding.buttons.remove")}
                        </button>
                      </div>
                      <div className="text-[11px] text-ink-40">{name}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function UrlPreview({ url }: { url: string }) {
    const [meta, setMeta] = useState<{
      title?: string;
      description?: string;
      image?: string;
    } | null>(null);
    const [err, setErr] = useState<string | null>(null);
    useEffect(() => {
      let mounted = true;
      async function fetchMeta() {
        try {
          const res = await fetch(url, { method: "GET" });
          const text = await res.text();
          if (!mounted) return;
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          const title =
            doc
              .querySelector('meta[property="og:title"]')
              ?.getAttribute("content") ?? doc.title;
          const description =
            doc
              .querySelector('meta[property="og:description"]')
              ?.getAttribute("content") ??
            doc
              .querySelector('meta[name="description"]')
              ?.getAttribute("content") ??
            undefined;
          const image =
            doc
              .querySelector('meta[property="og:image"]')
              ?.getAttribute("content") ?? undefined;
          setMeta({ title, description, image });
        } catch {
          setErr(t("onboarding.talent.previewUnavailable"));
        }
      }
      fetchMeta();
      return () => {
        mounted = false;
      };
    }, [url]);

    if (err)
      return (
        <div className="rounded-md border p-2 text-[12px] text-ink-40">
          {url}
        </div>
      );
    if (!meta)
      return (
        <div className="rounded-md border p-2 text-[12px] text-ink-40">
          {t("onboarding.talent.loadingPreview")}
        </div>
      );
    return (
      <div className="flex items-center gap-2">
        {meta.image && (
          <img
            src={meta.image}
            alt={meta.title}
            className="h-12 w-20 rounded-md object-cover"
          />
        )}
        <div>
          <div className="font-semibold text-ink">{meta.title ?? url}</div>
          {meta.description && (
            <div className="text-[12px] text-ink-40">{meta.description}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label={t("onboarding.shared.saudiRegion")}>
        <Select
          value={draft.saudiRegionId}
          onChange={(e) => {
            const id = e.target.value;
            onChange({ saudiRegionId: id, city: "" });
          }}
        >
          <option value="">{t("onboarding.shared.selectRegion")}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("onboarding.shared.city")}>
        <Select
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!draft.saudiRegionId}
        >
          <option value="">
            {draft.saudiRegionId
              ? t("onboarding.shared.selectCity")
              : t("onboarding.shared.chooseRegionFirst")}
          </option>
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
        {t("onboarding.talent.showCityPublicly")}
      </label>
      <label className="inline-flex items-center gap-2 text-[12px] text-ink-60">
        <input
          type="checkbox"
          checked={draft.acceptedQualityDisclaimer}
          onChange={(e) =>
            onChange({ acceptedQualityDisclaimer: e.target.checked })
          }
        />
        {t("onboarding.talent.qualityDisclaimer")}
      </label>
    </div>
  );
}
