import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  House,
  WarningCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  parseEmailVerifiedStatus,
  type EmailVerifiedStatus,
} from '@/lib/emailVerifiedStatus';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

const STATUS_VISUAL: Record<
  EmailVerifiedStatus,
  {
    Icon: typeof CheckCircle;
    iconWeight: 'fill' | 'duotone';
    accent: string;
    accentSoft: string;
    accentRing: string;
    blob: string;
  }
> = {
  verified: {
    Icon: CheckCircle,
    iconWeight: 'fill',
    accent: 'text-teal-dark',
    accentSoft: 'bg-teal/15',
    accentRing: 'ring-teal/25',
    blob: 'bg-teal/20',
  },
  missing: {
    Icon: EnvelopeSimple,
    iconWeight: 'duotone',
    accent: 'text-amber-dark',
    accentSoft: 'bg-amber/15',
    accentRing: 'ring-amber/25',
    blob: 'bg-amber/20',
  },
  invalid: {
    Icon: WarningCircle,
    iconWeight: 'fill',
    accent: 'text-coral-dark',
    accentSoft: 'bg-coral/12',
    accentRing: 'ring-coral/25',
    blob: 'bg-coral/15',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function EmailVerifiedPage() {
  const { t } = useTranslation('authPages');
  const [searchParams] = useSearchParams();
  const status = useMemo(() => parseEmailVerifiedStatus(searchParams), [searchParams]);
  const visual = STATUS_VISUAL[status];
  const { Icon } = visual;

  return (
    <motion.article
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-[1.75rem] border border-ink-10/80 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
      aria-labelledby="email-verified-title"
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -end-16 -top-16 size-48 rounded-full blur-3xl',
          visual.blob,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
      />

      <motion.p
        variants={itemVariants}
        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-40"
      >
        {t(`emailVerified.eyebrow.${status}`)}
      </motion.p>

      <motion.div variants={itemVariants} className="mt-6 flex items-start gap-5">
        <div
          className={cn(
            'relative flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
            visual.accentSoft,
            visual.accentRing,
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
          )}
        >
          <Icon size={36} weight={visual.iconWeight} className={visual.accent} aria-hidden />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <motion.h1
            id="email-verified-title"
            variants={itemVariants}
            className="text-balance text-[1.65rem] font-extrabold leading-[1.1] tracking-tight text-ink md:text-[1.85rem]"
          >
            {t(`emailVerified.title.${status}`)}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="mt-3 max-w-[38ch] text-pretty text-[14px] leading-relaxed text-ink-60"
          >
            {t(`emailVerified.body.${status}`)}
          </motion.p>
        </div>
      </motion.div>

      {status === 'verified' ? (
        <motion.div
          variants={itemVariants}
          className="mt-6 rounded-2xl border border-teal/20 bg-teal/10 px-4 py-3.5"
        >
          <p className="text-[13px] font-medium text-ink-80">{t('emailVerified.verifiedHint')}</p>
        </motion.div>
      ) : null}

      <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <Link to="/login" className="flex-1">
          <Button
            type="button"
            variant="dark"
            size="md"
            className="h-11 w-full rounded-full active:scale-[0.96] transition-transform"
          >
            {t('emailVerified.signIn')}
            <ArrowRight size={16} weight="bold" className="ms-1.5" aria-hidden />
          </Button>
        </Link>
        <Link to="/" className="flex-1">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 w-full rounded-full border-2 border-ink-10 bg-transparent active:scale-[0.96] transition-transform hover:bg-ink-5"
          >
            <House size={16} weight="duotone" className="me-1.5" aria-hidden />
            {t('emailVerified.home')}
          </Button>
        </Link>
      </motion.div>

      {status !== 'verified' ? (
        <motion.p variants={itemVariants} className="mt-5 text-center text-[12px] text-ink-40">
          {t('emailVerified.supportHint')}{' '}
          <Link to="/support" className="font-semibold text-coral hover:underline">
            {t('emailVerified.supportLink')}
          </Link>
        </motion.p>
      ) : null}
    </motion.article>
  );
}
