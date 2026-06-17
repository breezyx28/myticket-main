import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Starburst } from '@/components/shapes/Starburst';
import { StatsShapeCluster, type StatShapeCardConfig } from '@/components/ui/StatShapeCard';
import { STAT_SHAPE_FILES } from '@/lib/statShapes';

/** Time between shape changes (morph ~0.6s, then hold) */
const SHAPE_INTERVAL_MS = 3000;

export function StatsSection() {
  const { t, i18n } = useTranslation('landing');
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  const stats: StatShapeCardConfig[] = useMemo(
    () => [
      {
        label: t('stats.liveEvents'),
        bg: 'bg-lemon',
        text: 'text-ink',
        end: 8240,
        decimals: 0,
        format: (n) => `${Math.floor(n).toLocaleString(locale)}+`,
      },
      {
        label: t('stats.ticketsSold'),
        bg: 'bg-coral',
        text: 'text-white',
        end: 2.1,
        decimals: 1,
        format: (n) => `${n.toFixed(1)}M`,
      },
      {
        label: t('stats.cities'),
        bg: 'bg-mint',
        text: 'text-ink',
        end: 150,
        decimals: 0,
        format: (n) => `${Math.floor(n)}+`,
      },
      {
        label: t('stats.satisfaction'),
        bg: 'bg-lavender',
        text: 'text-ink',
        end: 98,
        decimals: 0,
        format: (n) => `${Math.floor(n)}%`,
      },
    ],
    [locale, t],
  );
  const [shapeIndex, setShapeIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setShapeIndex((i) => (i + 1) % STAT_SHAPE_FILES.length);
    }, SHAPE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-white px-6 py-16 lg:px-8 lg:py-24">
      <Starburst size={28} color="#0D0D0D" className="absolute right-16 top-16 opacity-10" />

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-40">
            {t('stats.eyebrow')}
          </span>
          <h2 className="mb-6 text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink md:text-[56px]">
            {t('stats.titleLine1')}
            <br />
            {t('stats.titleLine2')}
          </h2>
          <p className="max-w-[380px] text-[16px] leading-relaxed text-ink-60">{t('stats.subtitle')}</p>
          <Button variant="dark" size="lg" icon={ArrowRight} className="mt-8">
            {t('stats.cta')}
          </Button>
        </div>

        <StatsShapeCluster stats={stats} shapeIndex={shapeIndex} />
      </div>
    </section>
  );
}
