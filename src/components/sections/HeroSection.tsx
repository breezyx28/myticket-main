import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Marquee } from '@/components/ui/Marquee';
import { HERO_SLIDES, type HeroSlideTheme } from '@/data/heroBackgrounds';
import { PARTNER_LOGOS } from '@/data/partners';

const SLIDE_MS = 6000;
const CROSSFADE_SEC = 1.25;
const FOCUS_SEC = 5.5;

const EASE_OUT = [0.33, 1, 0.68, 1] as const;
const EASE_CROSS = [0.45, 0.05, 0.55, 0.95] as const;

type HeroThemeCopy = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  subtitle: string;
  searchPlaceholder: string;
};

function HeroBackground({ slideIndex }: { slideIndex: number }) {
  const slide = HERO_SLIDES[slideIndex] ?? HERO_SLIDES[0];

  useEffect(() => {
    for (const s of HERO_SLIDES) {
      const img = new Image();
      img.src = s.src;
    }
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          className="absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: CROSSFADE_SEC, ease: EASE_CROSS }}
        >
          <motion.img
            src={slide.src}
            alt=""
            className="h-full w-full object-cover"
            initial={{ scale: 1.12, filter: 'blur(8px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: FOCUS_SEC, ease: EASE_OUT }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-ink/85 via-ink/70 to-ink/90 sm:from-ink/80 sm:via-ink/65 sm:to-ink/85" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-ink/80 via-ink/50 to-ink/35 sm:from-ink/75 sm:via-ink/45 sm:to-ink/30" />
    </div>
  );
}

function HeroThemeContent({
  copy,
  signInPrompt,
  signInLabel,
  searchLabel,
  onSearchSubmit,
  keyword,
  setKeyword,
}: {
  copy: HeroThemeCopy;
  signInPrompt: string;
  signInLabel: string;
  searchLabel: string;
  onSearchSubmit: (e: React.FormEvent) => void;
  keyword: string;
  setKeyword: (value: string) => void;
}) {
  const { t } = useTranslation('landing');

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:max-w-[640px]">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-lemon sm:text-[12px] sm:tracking-[0.18em]">
        {copy.eyebrow}
      </span>

      <h1 className="text-[clamp(1.75rem,7vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
        {copy.titleLine1}
        <br />
        {copy.titleLine2}
        <br />
        {copy.titleLine3}
      </h1>

      <p className="max-w-[480px] text-[14px] leading-relaxed text-white/75 sm:text-[15px] lg:text-[16px]">
        {copy.subtitle}
      </p>

      <form
        onSubmit={onSearchSubmit}
        className="mt-1 flex w-full max-w-[480px] flex-col gap-2 rounded-2xl border border-white/15 bg-white p-2 shadow-card-md focus-within:border-white/30 sm:mt-2 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 sm:gap-3 sm:px-4">
          <MagnifyingGlass size={18} weight="bold" className="flex-shrink-0 text-ink-40" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label={searchLabel}
            placeholder={copy.searchPlaceholder}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-40 sm:py-2"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          icon={ArrowRight}
          className="w-full flex-shrink-0 rounded-xl sm:w-auto sm:rounded-full"
        >
          {t('hero.search')}
        </Button>
      </form>

      <p className="text-[12px] text-white/55 sm:text-[13px]">
        {signInPrompt}{' '}
        <a href="/login" className="font-semibold text-white underline-offset-2 hover:underline">
          {signInLabel}
        </a>
      </p>
    </div>
  );
}

export function HeroSection() {
  const { t } = useTranslation(['landing', 'common']);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlide = HERO_SLIDES[slideIndex] ?? HERO_SLIDES[0];

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  function themeCopy(theme: HeroSlideTheme): HeroThemeCopy {
    const themed = t(`landing:hero.themes.${theme}`, { returnObjects: true }) as Partial<HeroThemeCopy>;
    return {
      eyebrow: themed.eyebrow ?? t('landing:hero.eyebrow'),
      titleLine1: themed.titleLine1 ?? t('landing:hero.titleLine1'),
      titleLine2: themed.titleLine2 ?? t('landing:hero.titleLine2'),
      titleLine3: themed.titleLine3 ?? t('landing:hero.titleLine3'),
      subtitle: themed.subtitle ?? t('landing:hero.subtitle'),
      searchPlaceholder: themed.searchPlaceholder ?? t('landing:hero.searchPlaceholder'),
    };
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      navigate('/events');
      return;
    }
    navigate(`/events?keyword=${encodeURIComponent(q)}`);
  }

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <HeroBackground slideIndex={slideIndex} />

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 pb-8 pt-[76px] sm:px-6 sm:pb-10 sm:pt-[88px] lg:px-8 lg:pb-12 lg:pt-24">
        <div className="flex flex-1 flex-col justify-center gap-8 py-6 sm:gap-10 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12 lg:py-14 xl:gap-16">
          <div className="relative min-h-[min(520px,70vh)] sm:min-h-[480px] lg:min-h-[440px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeSlide.id}
                className="absolute inset-0 flex flex-col justify-center"
                initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
                transition={{ duration: CROSSFADE_SEC, ease: EASE_CROSS }}
              >
                <HeroThemeContent
                  copy={themeCopy(activeSlide.theme)}
                  signInPrompt={t('landing:hero.signInPrompt')}
                  signInLabel={t('common:signIn')}
                  searchLabel={t('landing:hero.searchLabel')}
                  onSearchSubmit={onSearchSubmit}
                  keyword={keyword}
                  setKeyword={setKeyword}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden lg:block" aria-hidden />
        </div>

        <div className="mt-8 border-t border-white/15 pt-6 sm:mt-auto sm:pt-8 lg:pt-10">
          <p className="mb-4 max-w-[200px] text-[12px] font-medium leading-snug text-white/60 sm:mb-6 sm:max-w-[220px] sm:text-[13px] lg:text-[14px]">
            {t('landing:trustedBy.title')}
          </p>
          <Marquee speed={32} gap={32} pauseOnHover className="py-1 sm:py-2">
            {PARTNER_LOGOS.map((p) => (
              <div
                key={p.name}
                className="flex h-10 flex-shrink-0 cursor-default items-center justify-center opacity-70 transition-opacity hover:opacity-100 sm:h-14 md:h-16"
                title={p.name}
              >
                <img
                  src={`/assets/partners/${encodeURIComponent(p.file)}`}
                  alt={p.name}
                  className="h-full w-auto max-w-[min(200px,45vw)] object-contain brightness-0 invert sm:max-w-[min(260px,60vw)]"
                />
              </div>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
