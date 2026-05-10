import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Calendar,
  Heart,
  MapPin,
  ShareNetwork,
  Star,
  Ticket,
} from '@phosphor-icons/react';
import {
  useListMyFavoritesQuery,
  useListMyRatingsQuery,
  useSubmitRatingMutation,
  useToggleFavoriteMutation,
} from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SaudiRiyalIcon } from '@/components/icons/SaudiRiyalIcon';
import { formatAttendingLabel } from '@/lib/attendingFormat';
import { formatSaudiRiyalAmountLatin } from '@/lib/saudiCurrency';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function defaultAttendingCount(seed: string): number {
  return 120 + (hashString(seed) % 180_000);
}

function defaultAvatars(seed: string): string[] {
  return [0, 1, 2].map(
    (i) => `https://picsum.photos/seed/${encodeURIComponent(seed)}-av${i}/64/64`
  );
}

function StarDisplay({ value }: { value: number }) {
  const v = Math.min(5, Math.max(0, value));
  return (
    <div className="flex items-center gap-px" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.min(1, Math.max(0, v - (i - 1)));
        return (
          <span key={i} className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <Star weight="fill" className="absolute text-amber-400/25" size={14} />
            <span
              className="absolute left-0 top-0 h-full overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star weight="fill" className="text-amber-400 drop-shadow-sm" size={14} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export interface EventCardProps {
  eventId?: string;
  title: string;
  category: string;
  accentColor: string;
  image: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  priceFrom: number;
  /** Ignored — price uses Latin digits + `SaudiRiyalIcon` */
  currency?: string;
  rating?: number | null;
  attendingCount?: number;
  attendeeAvatars?: string[];
  /** Full URL for share / copy; defaults from `eventId` + origin */
  shareUrl?: string;
  isFeatured?: boolean;
  isSoldOut?: boolean;
  onSave?: () => void;
  onClick?: () => void;
  className?: string;
}

export function EventCard({
  eventId,
  title,
  category,
  accentColor,
  image,
  date,
  time,
  venue,
  city,
  priceFrom,
  rating = null,
  attendingCount: attendingCountProp,
  attendeeAvatars: attendeeAvatarsProp,
  shareUrl: shareUrlProp,
  isFeatured,
  isSoldOut,
  onSave,
  onClick,
  className,
}: EventCardProps) {
  const reduceMotion = useReducedMotion();
  const dialogTitleId = useId();

  const storageKey = eventId ?? `anon-${hashString(title)}`;
  const attendingSeed = storageKey;

  const attendingCount = attendingCountProp ?? defaultAttendingCount(attendingSeed);
  const attendeeAvatars = useMemo(() => {
    const av = attendeeAvatarsProp?.length
      ? attendeeAvatarsProp.slice(0, 3)
      : defaultAvatars(attendingSeed);
    return av.slice(0, 3);
  }, [attendeeAvatarsProp, attendingSeed]);

  const attendingLabel = formatAttendingLabel(attendingCount);

  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const canRate = isAuthenticated && Boolean(eventId);
  const { data: favoritesPaged } = useListMyFavoritesQuery(
    { per_page: 200 },
    { skip: !isAuthenticated }
  );
  const [toggleFavorite, { isLoading: togglingFavorite }] = useToggleFavoriteMutation();
  const { data: myRatingsForEvent } = useListMyRatingsQuery(
    { subject_type: 'event', subject_id: eventId ?? '' },
    { skip: !canRate }
  );
  const existingRatingStars = myRatingsForEvent?.data?.[0]?.stars ?? 0;
  const [submitRatingMutation, { isLoading: ratingSubmitting }] = useSubmitRatingMutation();

  const apiFavoriteState = useMemo(() => {
    if (!eventId || !favoritesPaged?.data) return null;
    return favoritesPaged.data.some((f) => String(f.id) === String(eventId));
  }, [favoritesPaged, eventId]);

  const [liked, setLiked] = useState(false);
  useEffect(() => {
    if (apiFavoriteState != null) setLiked(apiFavoriteState);
  }, [apiFavoriteState]);

  const [cardHover, setCardHover] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [ratePick, setRatePick] = useState(0);
  const [ratePhase, setRatePhase] = useState<'pick' | 'thanks'>('pick');

  const resolvedShareUrl = useMemo(() => {
    if (shareUrlProp) return shareUrlProp;
    if (typeof window !== 'undefined' && eventId) {
      return `${window.location.origin}/events/${eventId}`;
    }
    return typeof window !== 'undefined' ? window.location.href : '';
  }, [shareUrlProp, eventId]);

  const toggleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isAuthenticated || !eventId || togglingFavorite) return;
      const previous = liked;
      setLiked(!previous);
      try {
        const res = await toggleFavorite({ eventId }).unwrap();
        setLiked(Boolean(res.is_favorited));
        onSave?.();
      } catch {
        setLiked(previous);
      }
    },
    [eventId, isAuthenticated, liked, onSave, toggleFavorite, togglingFavorite]
  );

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = resolvedShareUrl;
      if (!url) return;
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, text: title, url });
          setShareHint('Shared');
          window.setTimeout(() => setShareHint(null), 2000);
          return;
        } catch {
          /* fall through */
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setShareHint('Copied');
        window.setTimeout(() => setShareHint(null), 2000);
      } catch {
        setShareHint(null);
      }
    },
    [resolvedShareUrl, title]
  );

  const openRate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRatePick(existingRatingStars);
    setRatePhase('pick');
    setRateOpen(true);
  }, [existingRatingStars]);

  const submitRate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (ratePick < 1 || !canRate || !eventId || ratingSubmitting) return;
      try {
        await submitRatingMutation({
          subject_type: 'event',
          subject_id: eventId,
          stars: ratePick,
        }).unwrap();
        setRatePhase('thanks');
        window.setTimeout(() => {
          setRateOpen(false);
          setRatePhase('pick');
        }, 1800);
      } catch {
        /* keep dialog open so the user can retry */
      }
    },
    [ratePick, canRate, eventId, ratingSubmitting, submitRatingMutation]
  );

  useEffect(() => {
    if (!rateOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setRateOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rateOpen]);

  const lightAccent = /lemon|lime|mint|sky|lavender|blush|amber|teal/.test(accentColor);
  const contentTextClass = lightAccent ? 'text-ink' : 'text-white';

  const actionBarClasses = reduceMotion
    ? 'translate-y-0 opacity-100 pointer-events-auto'
    : 'pointer-events-none -translate-y-1 opacity-0 group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100';

  const showMirage = !reduceMotion && !cardHover;
  /** Faster slide, longer fade/mask blend. */
  const moveMs = 200;
  const fadeMs = 360;
  const panelEase = cardHover ? 'ease-in' : 'ease-out';
  const panelMoveTransition = `transform ${moveMs}ms ${panelEase}`;
  const panelFadeTransition = `opacity ${fadeMs}ms ease-in-out, mask-image ${fadeMs}ms ease-in-out, -webkit-mask-image ${fadeMs}ms ease-in-out`;

  const priceAmount = formatSaudiRiyalAmountLatin(priceFrom);

  return (
    <>
      <motion.div
        role="group"
        className={cn(
          'group/card relative h-[400px] min-h-[400px] max-h-[400px] w-full flex-shrink-0 cursor-pointer overflow-hidden rounded-3xl bg-white shadow-card-sm transition-shadow duration-200 hover:shadow-card-lg',
          className
        )}
        onClick={() => onClick?.()}
        onPointerEnter={() => setCardHover(true)}
        onPointerLeave={() => setCardHover(false)}
      >
        <div className="absolute inset-0 p-3">
          <div className={cn('relative h-full w-full overflow-hidden rounded-2xl', accentColor)}>
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-[200ms] ease-in-out group-hover/card:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/50 bg-white/40 px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-sm backdrop-blur-md backdrop-saturate-150">
                {category}
              </span>
              {isFeatured && (
                <span className="rounded-full border border-lemon/60 bg-lemon/45 px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-sm backdrop-blur-md">
                  Featured
                </span>
              )}
            </div>

            {/* Instagram-style actions */}
            <div
              className={cn(
                'absolute right-2.5 top-2.5 z-30 flex items-center gap-1.5 transition-all duration-[200ms] ease-in-out',
                actionBarClasses
              )}
            >
              <button
                type="button"
                aria-label="Share"
                onClick={handleShare}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/45 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white/75"
              >
                <ShareNetwork size={18} weight="bold" />
              </button>
              {isAuthenticated && eventId && (
                <button
                  type="button"
                  aria-label={liked ? 'Remove from favorites' : 'Save to favorites'}
                  aria-pressed={liked}
                  onClick={toggleLike}
                  disabled={togglingFavorite}
                  className={cn(
                    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/50 shadow-sm backdrop-blur-md transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                    liked ? 'bg-coral text-white' : 'bg-white/45 text-ink hover:bg-white/75'
                  )}
                >
                  <Heart size={18} weight={liked ? 'fill' : 'bold'} />
                </button>
              )}
              {canRate && (
                <button
                  type="button"
                  aria-label="Rate this event"
                  onClick={openRate}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/45 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white/75"
                >
                  <Star size={18} weight="bold" />
                </button>
              )}
            </div>
            {shareHint && (
              <div className="absolute left-1/2 top-14 z-30 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1 text-[10px] font-semibold text-white">
                {shareHint}
              </div>
            )}

            {isSoldOut && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center bg-ink/55 backdrop-blur-[2px]">
                <span className="rotate-[-8deg] rounded-full bg-white px-4 py-1.5 text-[12px] font-black text-ink shadow-lg">
                  SOLD OUT
                </span>
              </div>
            )}

            {/* Bottom content — inside image clip; mirage + top→bottom fade mask */}
            <div
              className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 max-w-full"
              style={{
                transform: reduceMotion ? 'translateY(0)' : showMirage ? 'translateY(46%)' : 'translateY(0)',
                transition: reduceMotion ? undefined : panelMoveTransition,
              }}
            >
              <div
                className={cn(
                  'pointer-events-auto overflow-hidden rounded-2xl p-3 shadow-md ring-1 ring-black/10',
                  accentColor,
                  contentTextClass
                )}
                style={
                  reduceMotion
                    ? undefined
                    : {
                        transition: panelFadeTransition,
                        opacity: showMirage ? 0.92 : 1,
                        WebkitMaskImage: showMirage
                          ? 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)'
                          : 'none',
                        maskImage: showMirage
                          ? 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)'
                          : 'none',
                      }
                }
              >
            <h3 className="mb-1.5 line-clamp-2 text-[14px] font-bold leading-snug">{title}</h3>

            <div className="mb-2 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {attendeeAvatars.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className="h-5 w-5 rounded-full border border-white/90 object-cover ring-1 ring-black/10"
                  />
                ))}
              </div>
              <span
                className={cn(
                  'text-[9px] font-bold tabular-nums',
                  lightAccent ? 'text-ink/70' : 'text-white/85'
                )}
              >
                {attendingLabel}
              </span>
            </div>

            {rating != null && (
              <div className="mb-2 flex items-center gap-2">
                <StarDisplay value={rating} />
                <span
                  className={cn(
                    'text-[11px] font-bold tabular-nums',
                    lightAccent ? 'text-ink/90' : 'text-white'
                  )}
                >
                  {rating.toFixed(1)}
                </span>
              </div>
            )}

            <div className="mb-2.5 flex flex-col gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[10px]',
                  lightAccent ? 'text-ink/80' : 'text-white/85'
                )}
              >
                <Calendar size={11} weight="bold" className="shrink-0" />
                <span className="line-clamp-1 min-w-0">
                  {date} · {time}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[10px]',
                  lightAccent ? 'text-ink/80' : 'text-white/85'
                )}
              >
                <MapPin size={11} weight="bold" className="shrink-0" />
                <span className="line-clamp-1 min-w-0">
                  {venue}, {city}
                </span>
              </div>
            </div>

            <div
              className={cn(
                'flex items-end justify-between gap-2 border-t pt-2.5',
                lightAccent ? 'border-ink/15' : 'border-white/25'
              )}
            >
              <div className="min-w-0">
                <span
                  className={cn(
                    'mb-0.5 block text-[9px] font-semibold uppercase tracking-wide',
                    lightAccent ? 'text-ink/50' : 'text-white/70'
                  )}
                >
                  From
                </span>
                <span className="inline-flex items-baseline gap-0.5 font-mono text-[16px] font-black leading-none tracking-tight" dir="ltr">
                  <span>{priceAmount}</span>
                  <SaudiRiyalIcon className="h-[1.05em] w-[1.05em] translate-y-[0.06em]" />
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-ink px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-ink-80"
              >
                <Ticket size={11} weight="fill" />
                {isSoldOut ? 'Sold Out' : 'Get Tickets'}
              </button>
            </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {rateOpen && (
              <motion.div
                key="rate-overlay"
                role="presentation"
                className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  type="button"
                  aria-label="Close"
                  className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRateOpen(false);
                  }}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={dialogTitleId}
                  className="relative z-10 w-full max-w-sm rounded-2xl border border-ink-10 bg-white p-6 shadow-xl"
                  initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  {ratePhase === 'thanks' ? (
                    <motion.div
                      className="flex flex-col items-center py-4 text-center"
                      initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 22 }
                      }
                    >
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-lemon text-ink">
                        <Star size={32} weight="fill" />
                      </div>
                      <p className="text-[18px] font-extrabold text-ink">Thank you!</p>
                      <p className="mt-1 text-[13px] text-ink-60">Your rating has been saved.</p>
                    </motion.div>
                  ) : (
                    <>
                      <h2 id={dialogTitleId} className="text-[17px] font-extrabold text-ink">
                        Rate this event
                      </h2>
                      <p className="mt-1 text-[12px] text-ink-60 line-clamp-2">{title}</p>
                      <div className="mt-5 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRatePick(n)}
                            className="rounded-lg p-1 transition-transform hover:scale-110"
                            aria-label={`${n} stars`}
                          >
                            <Star
                              size={32}
                              weight="fill"
                              className={n <= ratePick ? 'text-amber-400' : 'text-ink/15'}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="mt-6 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-full border border-ink-10 py-2.5 text-[13px] font-semibold text-ink hover:bg-ink-5 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setRateOpen(false)}
                          disabled={ratingSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={ratePick < 1 || ratingSubmitting}
                          className="flex-1 rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white transition-colors enabled:hover:bg-ink-80 disabled:opacity-40"
                          onClick={submitRate}
                        >
                          {ratingSubmitting ? 'Saving…' : 'Submit'}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
