import { useTranslation } from 'react-i18next';
import { ArrowRight, Ticket } from '@phosphor-icons/react';
import { Starburst } from '@/components/shapes/Starburst';
import { CrossPattern } from '@/components/shapes/CrossOrnament';
import { Button } from '@/components/ui/Button';

export function CTASection() {
  const { t } = useTranslation('landing');

  return (
    <section className="bg-ink px-6 lg:px-8 py-16 lg:py-24 relative overflow-hidden">
      <Starburst size={56} color="#FFFFFF" className="absolute top-8 end-32 opacity-10" />
      <Starburst size={28} color="#F5E642" filled className="absolute bottom-12 start-20 opacity-40" />
      <div className="w-48 h-48 rounded-full bg-coral/10 absolute -bottom-16 end-0 blur-xl" />

      <div className="max-w-[800px] mx-auto text-center relative z-10">
        <CrossPattern className="justify-center mb-6" />
        <div className="w-16 h-16 rounded-2xl bg-lemon flex items-center justify-center mx-auto mb-8">
          <Ticket size={32} weight="bold" className="text-ink" />
        </div>
        <h2 className="font-extrabold text-[36px] md:text-[52px] text-white leading-[1.05] tracking-[-0.02em] mb-4">
          {t('cta.titleLine1')}
          <br />
          <span className="text-lemon">{t('cta.titleAccent')}</span>
        </h2>
        <p className="text-[16px] lg:text-[18px] text-ink-20 max-w-[500px] mx-auto mb-8 leading-relaxed">
          {t('cta.subtitle')}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button variant="primary" size="xl" icon={ArrowRight}>
            {t('cta.getStarted')}
          </Button>
          <Button variant="outline" size="xl" className="border-ink-40 text-white hover:bg-ink-80">
            {t('cta.browseEvents')}
          </Button>
        </div>
      </div>
    </section>
  );
}
