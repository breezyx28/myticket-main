import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarBlank,
  CheckCircle,
  GlobeHemisphereWest,
  ImagesSquare,
  InstagramLogo,
  MapPin,
  Star,
  SuitcaseSimple,
  Ticket,
  UserCircle,
} from '@phosphor-icons/react';
import {
  useCreateEngagementMutation,
  useGetTalentBySlugQuery,
  useGetTalentRatingsQuery,
} from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { ContactEngagementDialog } from '@/components/marketplace/ContactEngagementDialog';
import { useAuth } from '@/contexts/AuthContext';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';
import { pickRecentRatings, talentToMarketplaceTalent } from '@/lib/marketplaceMappers';
import { createEngagementSchema } from '@/schemas/engagement';
import { cn, unsplash } from '@/lib/utils';

const PLACEHOLDER_PHOTO = unsplash('1544005313-94ddf0286df2');
const PLACEHOLDER_EVENT_IMAGE = unsplash('1493225457124-a3eb161ffa5f');

function textOr(value: string | null | undefined, fallback = 'Not provided'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function boolFromUnknown(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  return null;
}

export function TalentProfilePage() {
  const { t, i18n } = useTranslation(['marketplace', 'common', 'nav']);
  const { t: tValidation } = useTranslation('validation');
  const engagementSchema = useMemo(
    () => createEngagementSchema(tValidation),
    [tValidation, i18n.language],
  );
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const tp = (key: string, opts?: Record<string, unknown>) => t(`talentProfile.${key}`, opts);
  const { slug, id } = useParams();
  const talentSlug = slug ?? id;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fromMarketplace = location.pathname.startsWith('/marketplace');
  const backHref = fromMarketplace ? '/marketplace' : '/';
  const backLabel = fromMarketplace ? t('nav:marketplace') : t('common:home');
  const notFoundHref = fromMarketplace ? '/marketplace' : '/events';

  const [contactOpen, setContactOpen] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [createEngagement, { isLoading: contactSubmitting }] = useCreateEngagementMutation();

  const {
    data: apiTalent,
    isLoading: talentLoading,
    isError: talentError,
  } = useGetTalentBySlugQuery(
    { slug: talentSlug!, events_limit: 12 },
    { skip: !talentSlug },
  );

  const { data: ratingsSummary } = useGetTalentRatingsQuery({ slug: talentSlug! }, { skip: !talentSlug });

  const talent = useMemo(
    () => (apiTalent ? talentToMarketplaceTalent(apiTalent, null, language) : null),
    [apiTalent, language]
  );

  const recentRatings = useMemo(() => pickRecentRatings(ratingsSummary, 3), [ratingsSummary]);

  const summaryAverage =
    typeof ratingsSummary?.average === 'number' && !Number.isNaN(ratingsSummary.average)
      ? ratingsSummary.average
      : null;
  const displayRating = summaryAverage !== null ? summaryAverage : (talent?.rating ?? 0);
  const ratingsCount = ratingsSummary?.count ?? apiTalent?.rating_count ?? 0;
  const relatedEvents = apiTalent?.events ?? [];
  const categories = talent?.categories?.length ? talent.categories : [tp('generalTalent')];
  const bio = textOr(talent?.bio, tp('noBio'));
  const city = textOr(talent?.city, tp('cityNotShared'));
  const notProvided = tp('notProvided');
  const profileImage = talent?.image?.trim() || PLACEHOLDER_PHOTO;
  const instagramHandle = textOr(
    typeof apiTalent?.instagram_handle === 'string'
      ? apiTalent.instagram_handle.startsWith('@')
        ? apiTalent.instagram_handle
        : `@${apiTalent.instagram_handle}`
      : null,
    notProvided,
  );
  const websiteUrl = textOr(
    typeof apiTalent?.website_url === 'string' ? apiTalent.website_url : null,
    notProvided,
  );
  const travelReady = boolFromUnknown(apiTalent?.travel_ready);
  const locationPublic = boolFromUnknown(apiTalent?.location_public);
  const completedBookings = numberOr(apiTalent?.completed_bookings, 0);
  const availabilityRaw =
    typeof apiTalent?.availability_status === 'string' ? apiTalent.availability_status : talent?.availability;
  const availabilityLabel = availabilityRaw === 'reserved' ? tp('reserved') : tp('available');
  const availabilityTone =
    availabilityRaw === 'reserved'
      ? 'bg-amber/15 text-amber-dark border-amber/30'
      : 'bg-mint/15 text-mint-dark border-mint/30';

  if (!talentSlug) {
    return <Navigate to={notFoundHref} replace />;
  }

  if (talentLoading) {
    return <div className="px-6 py-24 text-center text-ink-40">{tp('loading')}</div>;
  }

  if (talentError || !talent) {
    return <Navigate to={notFoundHref} replace />;
  }

  return (
    <div className="bg-ink-5 pb-20 pt-10">
      <div className="mx-auto max-w-[960px] px-6 lg:px-8">
        <Link to={backHref} className="text-[13px] font-semibold text-coral hover:underline">
          ← {backLabel}
        </Link>

        <div className="mt-8 overflow-hidden rounded-3xl border border-ink-10 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-coral/10 via-lemon/25 to-sky/10 px-6 py-6 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src={profileImage}
                  alt={talent.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white md:h-24 md:w-24"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral">
                    {tp('eyebrow')}
                  </p>
                  <h1 className="truncate text-[30px] font-extrabold leading-tight text-ink">{talent.name}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-60">
                    <MapPin size={14} /> {city}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide',
                  availabilityTone,
                )}
              >
                <CheckCircle size={14} weight="fill" />
                {availabilityLabel}
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-4 md:px-8">
            <div className="rounded-2xl border border-ink-10 bg-ink-5/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('rating')}</p>
              <p className="mt-2 flex items-center gap-2 text-[26px] font-extrabold text-ink">
                <Star size={20} className="text-amber" weight="fill" />
                {displayRating.toFixed(1)}
              </p>
              <p className="mt-1 text-[12px] text-ink-60">
                {ratingsCount > 0 ? t('talentProfile.ratingCount', { count: ratingsCount }) : tp('noRatings')}
              </p>
            </div>
            <div className="rounded-2xl border border-ink-10 bg-ink-5/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('bookings')}</p>
              <p className="mt-2 text-[26px] font-extrabold text-ink">{completedBookings}</p>
              <p className="mt-1 text-[12px] text-ink-60">{tp('completedEngagements')}</p>
            </div>
            <div className="rounded-2xl border border-ink-10 bg-ink-5/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('travel')}</p>
              <p className="mt-2 flex items-center gap-2 text-[17px] font-bold text-ink">
                <SuitcaseSimple size={18} />
                {travelReady === null
                  ? notProvided
                  : travelReady
                    ? tp('travelReady')
                    : tp('localOnly')}
              </p>
              <p className="mt-1 text-[12px] text-ink-60">{tp('mobility')}</p>
            </div>
            <div className="rounded-2xl border border-ink-10 bg-ink-5/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('locationVisibility')}</p>
              <p className="mt-2 text-[17px] font-bold text-ink">
                {locationPublic === null
                  ? notProvided
                  : locationPublic
                    ? tp('publicProfile')
                    : tp('privateProfile')}
              </p>
              <p className="mt-1 text-[12px] text-ink-60">{tp('citySharing')}</p>
            </div>
          </div>

          <div className="border-t border-ink-10 px-6 py-6 md:px-8">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('categories')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-coral/25 bg-coral/10 px-3 py-1 text-[12px] font-semibold text-coral-dark"
                >
                  {category}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-60">{bio}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-10 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('instagram')}</p>
                <p className="mt-1 flex items-center gap-2 text-[14px] font-medium text-ink">
                  <InstagramLogo size={16} />
                  {instagramHandle}
                </p>
              </div>
              <div className="rounded-xl border border-ink-10 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-40">{tp('website')}</p>
                {websiteUrl === notProvided ? (
                  <p className="mt-1 flex items-center gap-2 text-[14px] font-medium text-ink">
                    <GlobeHemisphereWest size={16} />
                    {notProvided}
                  </p>
                ) : (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 text-[14px] font-semibold text-coral hover:underline"
                  >
                    <GlobeHemisphereWest size={16} />
                    {tp('visitWebsite')}
                  </a>
                )}
              </div>
            </div>
            {user?.role === 'organizer' && (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="mt-5"
                onClick={() => {
                  setContactError(null);
                  setContactOpen(true);
                }}
              >
                {tp('contactTalent')}
              </Button>
            )}
          </div>
        </div>

        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-coral" />
            <h2 className="text-lg font-extrabold text-ink">{tp('relatedEvents')}</h2>
          </div>
          {relatedEvents.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {relatedEvents.map((event) => (
                <li key={String(event.id)}>
                  <Link
                    to={`/events/${encodeURIComponent(event.code)}`}
                    className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-ink-10 bg-white p-4 transition-colors hover:border-coral/40 hover:bg-coral/5 sm:flex-row"
                  >
                    <img
                      src={textOr(event.cover_image_url, PLACEHOLDER_EVENT_IMAGE)}
                      alt={event.title}
                      className="h-28 w-full rounded-xl object-cover sm:w-44"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <p className="text-[16px] font-bold text-ink">{textOr(event.title, tp('untitledEvent'))}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-60">
                          {textOr(event.excerpt as string | null | undefined, tp('eventDetailsSoon'))}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink-60">
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-5 px-2.5 py-1">
                          <MapPin size={12} />
                          {textOr(event.venue_name, tp('venueTba'))}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-5 px-2.5 py-1">
                          <CalendarBlank size={12} />
                          {event.starts_at
                            ? new Date(event.starts_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : tp('dateTba')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-5 px-2.5 py-1">
                          {textOr(event.proficiency as string | null | undefined, tp('performer'))}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-ink-20 bg-white px-5 py-6 text-center text-[14px] text-ink-60">
              {tp('noRelatedEvents')}
            </div>
          )}
        </section>

        {canBrowseMarketplace(user) ? (
          <p className="mt-8 text-[13px] text-ink-60">
            <Link to="/marketplace?type=talent" className="font-semibold text-coral hover:underline">
              {tp('browseMore')}
            </Link>
          </p>
        ) : null}

        <section className="mt-12 rounded-2xl border border-ink-10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-ink">{tp('verificationTitle')}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-[14px] text-ink-60">
            <li>{tp('verifyIdentity')}</li>
            <li>{tp('verifyLiability')}</li>
            <li>{tp('verifyPortfolio')}</li>
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-2">
            <ImagesSquare size={18} className="text-coral" />
            <h2 className="text-lg font-extrabold text-ink">{tp('gallery')}</h2>
          </div>
          {talent.gallery.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {talent.gallery.map((src) => (
                <img key={src} src={src} alt="" className="aspect-video rounded-xl object-cover" />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-ink-20 bg-white px-5 py-6 text-center text-[14px] text-ink-60">
              {tp('noGallery')}
            </div>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
          <h2 className="text-lg font-extrabold text-ink">{tp('ratings')}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink">
            <Star size={22} className="text-amber" weight="fill" />
            <span className="font-bold">{displayRating.toFixed(1)}</span>
            <span className="text-[13px] font-medium text-ink-60">
              {ratingsCount > 0
                ? t('talentProfile.fromRatings', { count: ratingsCount })
                : tp('noPublicRatings')}
            </span>
          </p>
          {recentRatings.length > 0 ? (
            <ul className="mt-4 space-y-3 border-t border-ink-10 pt-4">
              {recentRatings.map((r) => (
                <li key={String(r.id)} className="rounded-xl bg-white/80 p-3 text-[13px] text-ink-60">
                  <p className="font-semibold text-ink">
                    <span className="inline-flex items-center gap-1">
                      <UserCircle size={16} />
                      {r.user_name?.trim() ? r.user_name : tp('anonymous')}
                    </span>{' '}
                    <span className="font-normal text-ink-40">· ★ {r.stars}</span>
                  </p>
                  {r.comment?.trim() ? (
                    <p className="mt-1 leading-relaxed">{r.comment}</p>
                  ) : (
                    <p className="mt-1 leading-relaxed text-ink-40">{tp('noComment')}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-ink-20 bg-white px-4 py-3 text-[13px] text-ink-60">
              {tp('noPublicRatings')}
            </p>
          )}
          <p className="mt-4 text-[13px] text-ink-60">
            {tp('mutualRatingsNote')}
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-full border border-dashed border-ink-20 bg-white px-5 py-3 text-[13px] font-semibold text-ink-40 sm:w-auto"
          >
            {tp('mutualRatingsCta')}
          </button>
        </section>
      </div>

      <ContactEngagementDialog
        open={contactOpen}
        targetKind="talent"
        targetName={talent.name}
        submitting={contactSubmitting}
        errorMessage={contactError}
        onClose={() => {
          if (contactSubmitting) return;
          setContactOpen(false);
          setContactError(null);
        }}
        onSubmit={async ({ topic, initial_message }) => {
          setContactError(null);
          try {
            await engagementSchema.validate({
              target_type: 'talent',
              target_id: talent.id,
              topic,
              initial_message: initial_message || undefined,
            });
          } catch (err) {
            setContactError(err instanceof Error ? err.message : tp('formReview'));
            return;
          }
          try {
            const created = await createEngagement({
              target_type: 'talent',
              target_id: talent.id,
              topic,
              ...(initial_message ? { initial_message } : {}),
            }).unwrap();
            setContactOpen(false);
            navigate(`/engagements?focus=${encodeURIComponent(String(created.id))}`);
          } catch (err) {
            const message =
              err && typeof err === 'object' && 'data' in err && err.data
                && typeof (err as { data: { message?: unknown } }).data.message === 'string'
                ? ((err as { data: { message: string } }).data.message)
                : tp('startEngagementError');
            setContactError(message);
          }
        }}
      />
    </div>
  );
}
