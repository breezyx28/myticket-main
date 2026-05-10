import { useEffect, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Starburst } from '@/components/shapes/Starburst';
import { StatsShapeCluster, type StatShapeCardConfig } from '@/components/ui/StatShapeCard';
import { STAT_SHAPE_FILES } from '@/lib/statShapes';

const stats: StatShapeCardConfig[] = [
  {
    label: 'Live Events',
    bg: 'bg-lemon',
    text: 'text-ink',
    end: 8240,
    decimals: 0,
    format: (n) => `${Math.floor(n).toLocaleString('en-US')}+`,
  },
  {
    label: 'Tickets Sold',
    bg: 'bg-coral',
    text: 'text-white',
    end: 2.1,
    decimals: 1,
    format: (n) => `${n.toFixed(1)}M`,
  },
  {
    label: 'Cities',
    bg: 'bg-mint',
    text: 'text-ink',
    end: 150,
    decimals: 0,
    format: (n) => `${Math.floor(n)}+`,
  },
  {
    label: 'Satisfaction',
    bg: 'bg-lavender',
    text: 'text-ink',
    end: 98,
    decimals: 0,
    format: (n) => `${Math.floor(n)}%`,
  },
];

/** Time between shape changes (morph ~0.6s, then hold) */
const SHAPE_INTERVAL_MS = 3000;

export function StatsSection() {
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
            By the numbers
          </span>
          <h2 className="mb-6 text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink md:text-[56px]">
            The Kingdom&apos;s
            <br />
            biggest events
          </h2>
          <p className="max-w-[380px] text-[16px] leading-relaxed text-ink-60">
            Join millions of fans who discover, book, and experience live events through MyTicket across Saudi
            Arabia.
          </p>
          <Button variant="dark" size="lg" icon={ArrowRight} className="mt-8">
            Explore Events
          </Button>
        </div>

        <StatsShapeCluster stats={stats} shapeIndex={shapeIndex} />
      </div>
    </section>
  );
}
