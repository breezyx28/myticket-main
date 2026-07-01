import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowSquareOut,
  Clock,
  Compass,
  EnvelopeSimple,
  Globe,
  MapPin,
  Phone,
  ShareNetwork,
  Star,
  WhatsappLogo,
} from '@phosphor-icons/react';
import type { TourismAdDetail } from '@/api/types/tourismAd';
import { Button } from '@/components/ui/Button';
import { TourismAdReadOnlyMap } from '@/components/tourism/TourismAdReadOnlyMap';
import { TOURISM_AD_WEEKDAYS, tourismWeekdayLabel } from '@/schemas/tourismAd';
import type { TourismAdWeekday } from '@/api/types/tourismAd';
import { cn } from '@/lib/utils';

const STAGGER = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function todayWeekdayKey(): TourismAdWeekday {
  const day = new Date().getDay();
  const map: TourismAdWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[day] ?? 'mon';
}

type TourismAdDetailViewProps = {
  ad: TourismAdDetail;
};

export function TourismAdDetailView({ ad }: TourismAdDetailViewProps) {
  const { t, i18n } = useTranslation('tourism');
  const reduceMotion = useReducedMotion();
  const isRtl = i18n.dir() === 'rtl';

  const images = useMemo(() => {
    const urls = [
      ...(ad.cover_image_url ? [ad.cover_image_url] : []),
      ...ad.gallery_urls.filter((u) => u !== ad.cover_image_url),
    ];
    return urls.length ? urls : [];
  }, [ad.cover_image_url, ad.gallery_urls]);

  const [activeImage, setActiveImage] = useState(0);
  const heroImage = images[activeImage] ?? images[0] ?? '';
  const todayKey = todayWeekdayKey();
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${ad.latitude},${ad.longitude}`)}`;

  const motionProps = reduceMotion
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'show' as const,
      };

  return (
    <div className="min-h-[100dvh] bg-ink-5">
      <section className="relative min-h-[min(72dvh,640px)] overflow-hidden bg-ink-90">
        {heroImage ? (
          <motion.img
            key={heroImage}
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? false : { scale: 1.06, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-80 to-ink-90 text-ink-40">
            <Compass size={64} weight="duotone" />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-90 via-ink-90/55 to-ink-90/15"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-90/80 via-transparent to-transparent rtl:bg-gradient-to-l" />

        <div className="relative mx-auto flex min-h-[min(72dvh,640px)] max-w-[1280px] flex-col justify-between px-6 pb-10 pt-8 lg:px-10">
          <motion.div {...motionProps} custom={0} variants={STAGGER}>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <ArrowLeft size={16} weight="bold" className={cn(isRtl && '-scale-x-100')} />
              {t('detail.backHome')}
            </Link>
          </motion.div>

          <div className="mt-auto max-w-3xl">
            <motion.div {...motionProps} custom={1} variants={STAGGER} className="flex flex-wrap items-center gap-2">
              {ad.is_pinned ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-lemon/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                  <Star size={12} weight="fill" />
                  {t('detail.featuredDestination')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
                  <Compass size={12} weight="fill" />
                  {t('detail.exploreDestination')}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                <MapPin size={14} weight="fill" className="text-coral" />
                {ad.location_name}
              </span>
            </motion.div>

            <motion.h1
              {...motionProps}
              custom={2}
              variants={STAGGER}
              className="mt-4 text-balance text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-tight text-white"
            >
              {ad.location_name}
            </motion.h1>

            {ad.services[0] ? (
              <motion.p
                {...motionProps}
                custom={3}
                variants={STAGGER}
                className="mt-2 text-[15px] font-medium text-white/65"
              >
                {ad.services[0]}
              </motion.p>
            ) : null}
          </div>
        </div>
      </section>

      {images.length > 1 ? (
        <div className="border-b border-ink-10 bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-4 lg:px-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-40">
              {t('detail.gallery')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-transform active:scale-[0.98]',
                    index === activeImage ? 'border-coral shadow-md' : 'border-transparent opacity-80 hover:opacity-100',
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
          <motion.div {...motionProps} custom={4} variants={STAGGER} className="space-y-10">
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">
                {t('detail.aboutPlace')}
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-pretty text-[16px] leading-relaxed text-ink-70 md:text-[17px]">
                {ad.description}
              </p>
            </section>

            {ad.services.length > 0 ? (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">
                  {t('detail.services')}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {ad.services.map((service, index) => (
                    <motion.li
                      key={service}
                      {...(reduceMotion
                        ? {}
                        : {
                            initial: { opacity: 0, scale: 0.92 },
                            whileInView: { opacity: 1, scale: 1 },
                            viewport: { once: true, margin: '-40px' },
                            transition: { delay: index * 0.04, duration: 0.35 },
                          })}
                      className="rounded-full border border-sky/25 bg-sky/10 px-4 py-2 text-[13px] font-semibold text-ink-70"
                    >
                      {service}
                    </motion.li>
                  ))}
                </ul>
              </section>
            ) : null}

            {ad.media_links.length > 0 ? (
              <section className="rounded-[1.75rem] border border-ink-10 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(26,26,26,0.12)]">
                <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">
                  <ShareNetwork size={16} weight="bold" />
                  {t('detail.socialLinks')}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {ad.media_links.map((link) => (
                    <li key={`${link.platform}-${link.url}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink-5 px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-ink-10 active:scale-[0.98]"
                      >
                        {link.platform}
                        <ArrowSquareOut size={14} className="rtl:-scale-x-100" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </motion.div>

          <motion.aside {...motionProps} custom={5} variants={STAGGER} className="space-y-6">
            <section className="overflow-hidden rounded-[1.75rem] border border-ink-10 bg-white shadow-[0_20px_40px_-24px_rgba(26,26,26,0.12)]">
              <div className="flex items-center gap-2 border-b border-ink-10 px-5 py-4">
                <Clock size={18} weight="bold" className="text-coral" />
                <h2 className="text-[15px] font-extrabold text-ink">{t('detail.openingHours')}</h2>
              </div>
              <ul className="divide-y divide-ink-10">
                {TOURISM_AD_WEEKDAYS.map((day) => {
                  const hours = ad.opening_hours?.[day];
                  const isToday = day === todayKey;
                  return (
                    <li
                      key={day}
                      className={cn(
                        'flex items-center justify-between gap-4 px-5 py-3.5 text-[13px]',
                        isToday && 'bg-coral/5',
                      )}
                    >
                      <span className={cn('font-semibold', isToday ? 'text-coral' : 'text-ink')}>
                        {tourismWeekdayLabel(t, day)}
                        {isToday ? (
                          <span className="ms-2 text-[10px] font-bold uppercase tracking-wide text-coral/80">
                            {t('detail.today')}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-ink-60">
                        {hours?.closed
                          ? t('openingHours.closed')
                          : `${hours?.opens ?? '—'} – ${hours?.closes ?? '—'}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-[1.75rem] border border-ink-10 bg-white p-5 shadow-[0_20px_40px_-24px_rgba(26,26,26,0.12)]">
              <h2 className="text-[15px] font-extrabold text-ink">{t('detail.contact')}</h2>
              <ul className="mt-4 space-y-3">
                {ad.contact?.phone ? (
                  <li>
                    <a
                      href={`tel:${ad.contact.phone}`}
                      className="flex items-center gap-3 rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3 transition-colors hover:border-coral/30 hover:bg-coral/5 active:scale-[0.99]"
                    >
                      <Phone size={20} weight="bold" className="shrink-0 text-coral" />
                      <span className="text-[14px] font-semibold text-ink">{ad.contact.phone}</span>
                    </a>
                  </li>
                ) : null}
                {ad.contact?.whatsapp ? (
                  <li>
                    <a
                      href={`https://wa.me/${ad.contact.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3 transition-colors hover:border-mint/40 hover:bg-mint/10 active:scale-[0.99]"
                    >
                      <WhatsappLogo size={20} weight="bold" className="shrink-0 text-mint-dark" />
                      <span className="text-[14px] font-semibold text-ink">{ad.contact.whatsapp}</span>
                    </a>
                  </li>
                ) : null}
                {ad.contact?.email ? (
                  <li>
                    <a
                      href={`mailto:${ad.contact.email}`}
                      className="flex items-center gap-3 rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3 transition-colors hover:border-sky/40 hover:bg-sky/10 active:scale-[0.99]"
                    >
                      <EnvelopeSimple size={20} weight="bold" className="shrink-0 text-sky-dark" />
                      <span className="truncate text-[14px] font-semibold text-ink">{ad.contact.email}</span>
                    </a>
                  </li>
                ) : null}
                {ad.contact?.website ? (
                  <li>
                    <a
                      href={ad.contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3 transition-colors hover:border-ink-20 hover:bg-ink-5 active:scale-[0.99]"
                    >
                      <Globe size={20} weight="bold" className="shrink-0 text-ink-50" />
                      <span className="truncate text-[14px] font-semibold text-ink">{ad.contact.website}</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          </motion.aside>
        </div>

        <motion.section
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 24 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, margin: '-80px' },
                transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              })}
          className="mt-14 overflow-hidden rounded-[1.75rem] border border-ink-10 bg-white shadow-[0_24px_48px_-28px_rgba(26,26,26,0.14)]"
        >
          <div className="flex flex-col gap-4 border-b border-ink-10 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">
                {t('detail.location')}
              </h2>
              <p className="mt-2 text-[18px] font-extrabold tracking-tight text-ink">{ad.location_name}</p>
              <p className="mt-1 font-mono text-[12px] text-ink-40">
                {ad.latitude}, {ad.longitude}
              </p>
            </div>
            <Button asChild variant="dark" size="md" icon={ArrowSquareOut} iconRtlFlip>
              <a href={mapUrl} target="_blank" rel="noreferrer">
                {t('detail.getDirections')}
              </a>
            </Button>
          </div>
          <TourismAdReadOnlyMap
            latitude={ad.latitude}
            longitude={ad.longitude}
            className="h-[min(52vw,320px)] w-full [&_.leaflet-container]:rounded-none"
          />
        </motion.section>
      </div>
    </div>
  );
}
