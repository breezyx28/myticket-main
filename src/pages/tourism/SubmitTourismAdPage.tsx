import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Trash, UploadSimple, X } from '@phosphor-icons/react';
import type { Id } from '@/api/types/common';
import type { TourismAdDetail, TourismAdMediaLink } from '@/api/types/tourismAd';
import {
  useCreateMyTourismAdMutation,
  useGetMyTourismAdQuery,
  useListMyTourismAdsQuery,
  useSubmitMyTourismAdMutation,
  useUpdateMyTourismAdMutation,
  useUploadFileMutation,
  useWithdrawMyTourismAdMutation,
} from '@/api/endpoints';
import { OnboardingHeader } from '@/components/auth/OnboardingHeader';
import { LocationMapPicker } from '@/components/tourism/LocationMapPicker';
import { OpeningHoursEditor } from '@/components/tourism/OpeningHoursEditor';
import { Button } from '@/components/ui/Button';
import { FormSectionCard } from '@/components/ui/form/FormSectionCard';
import { Field } from '@/components/ui/form/Field';
import { TextInput, TextArea } from '@/components/ui/form/inputs';
import { SaudiPhoneInput } from '@/components/ui/form/SaudiPhoneInput';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import { toAuthApiError } from '@/lib/authErrors';
import {
  defaultTourismAdOpeningHours,
  EMPTY_TOURISM_AD_FORM,
  normalizeOpeningHours,
  SAUDI_DEFAULT_LAT,
  SAUDI_DEFAULT_LNG,
  createTourismAdContactStepSchema,
  createTourismAdGalleryStepSchema,
  createTourismAdHoursStepSchema,
  createTourismAdLocationStepSchema,
  type TourismAdFormValues,
} from '@/schemas/tourismAd';

const DRAFT_ID_KEY = 'myticket_tourism_ad_draft_id';
const STEP_KEYS = [
  'submit.steps.location',
  'submit.steps.hoursAndServices',
  'submit.steps.contact',
  'submit.steps.galleryAndReview',
] as const;

function readStoredDraftId(): Id | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_ID_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredDraftId(id: Id | null) {
  try {
    if (id == null) sessionStorage.removeItem(DRAFT_ID_KEY);
    else sessionStorage.setItem(DRAFT_ID_KEY, String(id));
  } catch {
    /* ignore */
  }
}

function hasValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function detailToForm(ad: TourismAdDetail): TourismAdFormValues {
  const lat = Number(ad.latitude);
  const lng = Number(ad.longitude);
  return {
    location_name: ad.location_name ?? '',
    latitude: hasValidCoords(lat, lng) ? lat : SAUDI_DEFAULT_LAT,
    longitude: hasValidCoords(lat, lng) ? lng : SAUDI_DEFAULT_LNG,
    description: ad.description ?? '',
    opening_hours: ad.opening_hours ?? defaultTourismAdOpeningHours(),
    services: ad.services ?? [],
    contact: {
      phone: ad.contact?.phone ?? '',
      email: ad.contact?.email ?? '',
      website: ad.contact?.website ?? '',
      whatsapp: ad.contact?.whatsapp ?? '',
    },
    media_links: ad.media_links ?? [],
    gallery_urls: ad.gallery_urls ?? [],
  };
}

function formToPayload(values: TourismAdFormValues) {
  return {
    location_name: values.location_name.trim(),
    latitude: values.latitude,
    longitude: values.longitude,
    description: values.description.trim(),
    opening_hours: normalizeOpeningHours(values.opening_hours),
    services: values.services.filter((s): s is string => Boolean(s?.trim())),
    contact: {
      phone: values.contact.phone?.trim() || undefined,
      email: values.contact.email?.trim() || undefined,
      website: values.contact.website?.trim() || undefined,
      whatsapp: values.contact.whatsapp?.trim() || undefined,
    },
    media_links: values.media_links.filter((l) => l.platform.trim() && l.url.trim()),
    gallery_urls: values.gallery_urls,
  };
}

export function SubmitTourismAdPage() {
  const { t } = useTranslation(['tourism', 'common']);
  const { t: tValidation, i18n } = useTranslation('validation');
  const tourismAdLocationStepSchema = useMemo(
    () => createTourismAdLocationStepSchema(tValidation),
    [tValidation, i18n.language],
  );
  const tourismAdHoursStepSchema = useMemo(
    () => createTourismAdHoursStepSchema(tValidation),
    [tValidation, i18n.language],
  );
  const tourismAdContactStepSchema = useMemo(
    () => createTourismAdContactStepSchema(tValidation),
    [tValidation, i18n.language],
  );
  const tourismAdGalleryStepSchema = useMemo(
    () => createTourismAdGalleryStepSchema(tValidation),
    [tValidation, i18n.language],
  );
  const navigate = useNavigate();
  const steps = useMemo(() => STEP_KEYS.map((key) => t(key)), [t]);
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<Id | null>(() => readStoredDraftId());
  const [form, setForm] = useState<TourismAdFormValues>(EMPTY_TOURISM_AD_FORM);
  const [serviceInput, setServiceInput] = useState('');
  const [mediaPlatform, setMediaPlatform] = useState('instagram');
  const [mediaUrl, setMediaUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [locationPicked, setLocationPicked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: draftList } = useListMyTourismAdsQuery({ status: 'draft', per_page: 1 });
  const { data: loadedAd, isFetching: loadingAd } = useGetMyTourismAdQuery(
    draftId ?? '',
    { skip: !draftId },
  );

  const [createAd] = useCreateMyTourismAdMutation();
  const [updateAd, { isLoading: saving }] = useUpdateMyTourismAdMutation();
  const [submitAd, { isLoading: submitting }] = useSubmitMyTourismAdMutation();
  const [withdrawAd, { isLoading: withdrawing }] = useWithdrawMyTourismAdMutation();
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation();

  const status = loadedAd?.status;
  const isEditable = !status || status === 'draft';
  const isPending = status === 'pending_review';
  const isRejected = status === 'rejected';
  const isPublished = status === 'published';

  useEffect(() => {
    if (initialized) return;
    if (draftId && loadingAd) return;

    if (loadedAd) {
      const nextForm = detailToForm(loadedAd);
      setForm(nextForm);
      setLocationPicked(
        hasValidCoords(nextForm.latitude, nextForm.longitude) &&
          loadedAd.location_name?.trim() !== 'Untitled location',
      );
      if (loadedAd.status !== 'draft') {
        setStep(steps.length - 1);
      }
      setInitialized(true);
      return;
    }

    if (!draftId && draftList?.data?.[0]) {
      const existing = draftList.data[0];
      const nextForm = detailToForm(existing);
      setDraftId(existing.id);
      writeStoredDraftId(existing.id);
      setForm(nextForm);
      setLocationPicked(
        hasValidCoords(nextForm.latitude, nextForm.longitude) &&
          existing.location_name?.trim() !== 'Untitled location',
      );
      setInitialized(true);
      return;
    }

    if (!draftId && !loadingAd) {
      void (async () => {
        try {
          const created = await createAd({}).unwrap();
          setDraftId(created.id);
          writeStoredDraftId(created.id);
          setForm(detailToForm(created));
        } catch (e) {
          setError(toAuthApiError(e, t('submit.draftStartFailed')).message);
        } finally {
          setInitialized(true);
        }
      })();
      return;
    }

    if (draftId && !loadingAd && !loadedAd) {
      setInitialized(true);
    }
  }, [
    initialized,
    draftId,
    loadedAd,
    loadingAd,
    draftList,
    createAd,
  ]);

  const patchForm = useCallback(
    (patch: Partial<TourismAdFormValues>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const saveDraft = useCallback(async () => {
    if (!draftId || !isEditable) return true;
    try {
      await updateAd({ id: draftId, body: formToPayload(form) }).unwrap();
      return true;
    } catch (e) {
      const err = toAuthApiError(e, t('submit.saveFailed'));
      setError(err.message);
      const next: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(err.fieldErrors)) {
        if (msgs[0]) next[key] = msgs[0];
      }
      setFieldErrors(next);
      return false;
    }
  }, [draftId, form, isEditable, updateAd, t]);

  async function validateStep(idx: number): Promise<boolean> {
    setError(null);
    setFieldErrors({});
    if (idx === 0 && !locationPicked) {
      const msg = t('submit.pickLocation');
      setFieldErrors({ location: msg });
      setError(msg);
      return false;
    }
    try {
      if (idx === 0) await tourismAdLocationStepSchema.validate(form, { abortEarly: false });
      if (idx === 1) await tourismAdHoursStepSchema.validate(form, { abortEarly: false });
      if (idx === 2) await tourismAdContactStepSchema.validate(form, { abortEarly: false });
      if (idx === 3) await tourismAdGalleryStepSchema.validate(form, { abortEarly: false });
      return true;
    } catch (e) {
      if (e && typeof e === 'object' && 'inner' in e) {
        const inner = (e as { inner: { path?: string; message: string }[] }).inner;
        const next: Record<string, string> = {};
        for (const item of inner) {
          if (item.path && !next[item.path]) next[item.path] = item.message;
        }
        setFieldErrors(next);
        setError(inner[0]?.message ?? t('submit.correctFields'));
      } else {
        setError(t('submit.completeStep'));
      }
      return false;
    }
  }

  async function onNext() {
    if (!isEditable) return;
    const valid = await validateStep(step);
    if (!valid) return;
    const saved = await saveDraft();
    if (!saved) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  async function onSubmitForReview() {
    if (!draftId || !isEditable) return;
    const valid = await validateStep(3);
    if (!valid) return;
    const saved = await saveDraft();
    if (!saved) return;
    setError(null);
    try {
      await submitAd(draftId).unwrap();
      writeStoredDraftId(null);
    } catch (e) {
      setError(toAuthApiError(e, t('submit.submitFailed')).message);
    }
  }

  async function onWithdraw() {
    if (!draftId) return;
    setError(null);
    try {
      await withdrawAd(draftId).unwrap();
    } catch (e) {
      setError(toAuthApiError(e, t('submit.withdrawFailed')).message);
    }
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draftId) return;
    setError(null);
    try {
      const uploaded = await uploadFile({ file, context: 'tourism_ad_gallery' }).unwrap();
      const nextUrls = [...form.gallery_urls, uploaded.url];
      patchForm({ gallery_urls: nextUrls });
      await updateAd({
        id: draftId,
        body: { gallery_urls: nextUrls },
      }).unwrap();
    } catch (err) {
      setError(toAuthApiError(err, t('submit.uploadFailed')).message);
    }
  }

  function removeGalleryUrl(url: string) {
    patchForm({ gallery_urls: form.gallery_urls.filter((u) => u !== url) });
  }

  function addService() {
    const tag = serviceInput.trim();
    if (!tag || form.services.includes(tag) || form.services.length >= 20) return;
    patchForm({ services: [...form.services, tag] });
    setServiceInput('');
  }

  function addMediaLink() {
    const url = mediaUrl.trim();
    const platform = mediaPlatform.trim();
    if (!url || !platform || form.media_links.length >= 10) return;
    const link: TourismAdMediaLink = { platform, url };
    patchForm({ media_links: [...form.media_links, link] });
    setMediaUrl('');
  }

  const summary = useMemo(
    () => (
      <div className="space-y-2 rounded-xl border border-ink-10 bg-ink-5/30 p-4 text-[13px] text-ink-70">
        <p>
          <strong className="text-ink">{t('submit.summaryLocation')}</strong> {form.location_name || '—'}
        </p>
        <p>
          <strong className="text-ink">{t('submit.summaryServices')}</strong>{' '}
          {form.services.length ? form.services.join(', ') : '—'}
        </p>
        <p>
          <strong className="text-ink">{t('submit.summaryGallery')}</strong>{' '}
          {t('submit.summaryImageCount', { count: form.gallery_urls.length })}
        </p>
      </div>
    ),
    [form, t],
  );

  if (!initialized || (draftId && loadingAd && !loadedAd)) {
    return (
      <div className="px-6 py-24 text-center text-[13px] text-ink-40">{t('submit.loading')}</div>
    );
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[760px] px-6 lg:px-8">
        <Link to="/" className="text-[13px] font-semibold text-coral hover:underline">
          {t('submit.backHome')}
        </Link>

        <FormSectionCard
          eyebrow={t('submit.eyebrow')}
          title={t('submit.title')}
          description={t('submit.description')}
          className="mt-6 overflow-hidden"
        >
          {isPending ? (
            <InlineNotice variant="info" title={t('submit.pendingTitle')}>
              <p className="text-[13px] text-ink-70">{t('submit.pendingBody')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                loading={withdrawing}
                onClick={() => void onWithdraw()}
              >
                {t('submit.withdraw')}
              </Button>
            </InlineNotice>
          ) : null}

          {isRejected ? (
            <InlineNotice variant="warning" title={t('submit.rejectedTitle')}>
              <p className="text-[13px] text-ink-70">
                {loadedAd?.rejection_reason ?? t('submit.rejectedFallback')}
              </p>
            </InlineNotice>
          ) : null}

          {isPublished ? (
            <InlineNotice variant="success" title={t('submit.publishedTitle')}>
              <p className="text-[13px] text-ink-70">{t('submit.publishedBody')}</p>
              <Button
                type="button"
                variant="dark"
                size="sm"
                className="mt-3"
                onClick={() => navigate(`/tourism-ads/${draftId}`)}
              >
                {t('submit.viewPublicAd')}
              </Button>
            </InlineNotice>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] font-medium text-coral"
            >
              {error}
            </div>
          ) : null}

          {isEditable ? (
            <>
              <OnboardingHeader
                title={steps[step] ?? t('submit.steps.review')}
                description={t('submit.draftSavedHint')}
                steps={[...steps]}
                activeIdx={step}
              />

              {step === 0 ? (
                <div className="space-y-4">
                  <Field label={t('submit.pinDestination')} errorText={fieldErrors.location}>
                    <LocationMapPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      locationName={form.location_name}
                      errorText={fieldErrors.location}
                      onChange={(patch) => {
                        setLocationPicked(true);
                        patchForm({
                          latitude: patch.latitude,
                          longitude: patch.longitude,
                          ...(patch.location_name
                            ? { location_name: patch.location_name }
                            : {}),
                        });
                      }}
                    />
                  </Field>
                  <Field label={t('submit.locationName')} errorText={fieldErrors.location_name}>
                    <TextInput
                      value={form.location_name}
                      onChange={(e) => patchForm({ location_name: e.target.value })}
                      placeholder={t('submit.locationNamePlaceholder')}
                    />
                  </Field>
                  <Field
                    label={t('submit.descriptionLabel')}
                    helperText={t('submit.descriptionHelper')}
                    errorText={fieldErrors.description}
                  >
                    <TextArea
                      rows={6}
                      value={form.description}
                      onChange={(e) => patchForm({ description: e.target.value })}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <Field
                    label={t('submit.openingHoursLabel')}
                    helperText={t('submit.openingHoursHelper')}
                  >
                    <OpeningHoursEditor
                      value={form.opening_hours}
                      fieldErrors={fieldErrors}
                      onChange={(opening_hours) => patchForm({ opening_hours })}
                    />
                  </Field>
                  <Field label={t('submit.servicesLabel')} errorText={fieldErrors.services}>
                    <div className="flex gap-2">
                      <TextInput
                        value={serviceInput}
                        placeholder={t('submit.servicesPlaceholder')}
                        onChange={(e) => setServiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addService();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="md" onClick={addService}>
                        {t('submit.add')}
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.services.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full bg-sky/15 px-2.5 py-1 text-[12px] font-semibold"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              patchForm({
                                services: form.services.filter((x) => x !== s),
                              })
                            }
                            aria-label={t('submit.removeService', { service: s })}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </Field>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <Field label={t('submit.phone')} errorText={fieldErrors['contact.phone']}>
                    <SaudiPhoneInput
                      value={form.contact.phone ?? ''}
                      onChange={(phone) =>
                        patchForm({ contact: { ...form.contact, phone } })
                      }
                    />
                  </Field>
                  <Field label={t('submit.email')} errorText={fieldErrors['contact.email']}>
                    <TextInput
                      type="email"
                      value={form.contact.email ?? ''}
                      onChange={(e) =>
                        patchForm({ contact: { ...form.contact, email: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label={t('submit.website')}>
                    <TextInput
                      type="url"
                      value={form.contact.website ?? ''}
                      onChange={(e) =>
                        patchForm({ contact: { ...form.contact, website: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label={t('submit.whatsapp')}>
                    <SaudiPhoneInput
                      value={form.contact.whatsapp ?? ''}
                      onChange={(whatsapp) =>
                        patchForm({ contact: { ...form.contact, whatsapp } })
                      }
                    />
                  </Field>
                  <Field label={t('submit.mediaLinks')}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextInput
                        value={mediaPlatform}
                        placeholder={t('submit.platformPlaceholder')}
                        onChange={(e) => setMediaPlatform(e.target.value)}
                      />
                      <TextInput
                        value={mediaUrl}
                        placeholder={t('submit.urlPlaceholder')}
                        onChange={(e) => setMediaUrl(e.target.value)}
                      />
                      <Button type="button" variant="outline" size="md" onClick={addMediaLink}>
                        {t('submit.addLink')}
                      </Button>
                    </div>
                    <ul className="mt-2 space-y-1 text-[13px]">
                      {form.media_links.map((link, idx) => (
                        <li key={`${link.platform}-${idx}`} className="flex items-center justify-between">
                          <span>
                            {link.platform}: {link.url}
                          </span>
                          <button
                            type="button"
                            className="text-coral"
                            onClick={() =>
                              patchForm({
                                media_links: form.media_links.filter((_, i) => i !== idx),
                              })
                            }
                          >
                            <Trash size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Field>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <Field label={t('submit.galleryLabel')} errorText={fieldErrors.gallery_urls}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void onGalleryPick(e)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      loading={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <UploadSimple size={18} className="mr-1.5" />
                      {t('submit.uploadImage')}
                    </Button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.gallery_urls.map((url) => (
                        <div key={url} className="relative">
                          <img
                            src={url}
                            alt=""
                            className="h-24 w-32 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-coral"
                            onClick={() => removeGalleryUrl(url)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Field>
                  {summary}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="sm:flex-1"
                  disabled={saving || submitting}
                  onClick={() => {
                    if (step === 0) {
                      navigate('/');
                      return;
                    }
                    setStep((s) => Math.max(0, s - 1));
                  }}
                >
                  {step === 0 ? t('common:cancel') : t('submit.back')}
                </Button>
                {step < steps.length - 1 ? (
                  <Button
                    type="button"
                    variant="dark"
                    size="md"
                    className="sm:flex-1"
                    loading={saving}
                    onClick={() => void onNext()}
                  >
                    {t('submit.next')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="dark"
                    size="md"
                    className="sm:flex-1"
                    loading={submitting || saving}
                    onClick={() => void onSubmitForReview()}
                  >
                    {t('submit.submitForReview')}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </FormSectionCard>
      </div>
    </div>
  );
}
