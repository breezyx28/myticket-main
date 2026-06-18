import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { usePathMorph } from '@/hooks/usePathMorph';
import { loadAllStatShapePaths } from '@/lib/shapePathLoader';
import { STAT_SHAPE_FILES } from '@/lib/statShapes';

export type StatShapeCardConfig = {
  label: string;
  bg: string;
  text: string;
  end: number;
  decimals: number;
  format: (n: number) => string;
};

export type StatShapeFile = (typeof STAT_SHAPE_FILES)[number];

function StatCell({
  stat,
  enabled,
}: {
  stat: StatShapeCardConfig;
  enabled: boolean;
}) {
  const counted = useCountUp(stat.end, {
    duration: 1600,
    decimals: stat.decimals,
    enabled,
  });
  const displayValue = useMemo(() => stat.format(counted), [counted, stat]);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col items-center justify-center gap-0 px-0.5 py-1 text-center sm:px-1 sm:py-1.5',
        stat.bg,
        stat.text
      )}
    >
      <span className="max-w-[100%] text-[5px] font-semibold leading-none opacity-70 sm:text-[6px]">
        {stat.label}
      </span>
      <span className="font-mono text-[clamp(0.28rem,0.65vw,0.36rem)] font-black leading-none tracking-tight sm:text-[clamp(0.3rem,0.58vw,0.4rem)]">
        {displayValue}
      </span>
    </div>
  );
}

type StatsShapeClusterProps = {
  stats: StatShapeCardConfig[];
  shapeIndex: number;
};

const MORPH_MS = 600;

/** Single 2×2 stat grid clipped by one SVG path that morphs (flubber) between shape assets. */
export function StatsShapeCluster({ stats, shapeIndex }: StatsShapeClusterProps) {
  const { t } = useTranslation('landing');
  const maskId = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rootRef, { once: true, margin: '-12% 0px' });

  const [paths, setPaths] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAllStatShapePaths()
      .then((p) => {
        if (!cancelled) setPaths(p);
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pathD = usePathMorph(paths, shapeIndex, MORPH_MS);

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[min(100%,440px)]">
      <div className="relative aspect-square w-full drop-shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        {!paths?.length ? (
          <div className="absolute inset-0 animate-pulse rounded-[28px] bg-ink-10" aria-hidden />
        ) : (
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={t('stats.ariaLabel')}
          >
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100"
                height="100"
              >
                <path d={pathD} fill="white" />
              </mask>
            </defs>
            <foreignObject width="100" height="100" x="0" y="0" mask={`url(#${maskId})`} className="overflow-hidden">
              {/* XHTML wrapper required inside foreignObject; xmlns is valid in SVG/XML */}
              <div
                style={xhtmlGridStyle}
                className="grid h-full w-full grid-cols-2 grid-rows-2"
                {...({ xmlns: 'http://www.w3.org/1999/xhtml' } as HTMLAttributes<HTMLDivElement>)}
              >
                {stats.map((stat) => (
                  <StatCell key={stat.label} stat={stat} enabled={isInView} />
                ))}
              </div>
            </foreignObject>
          </svg>
        )}
      </div>
    </div>
  );
}

const xhtmlGridStyle = {
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
} as CSSProperties;
