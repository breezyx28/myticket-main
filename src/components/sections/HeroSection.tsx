import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { PhotoCluster } from '@/components/shapes/PhotoCluster';

export function HeroSection() {
  const { t } = useTranslation(['landing', 'common']);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

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
    <section className="bg-[#F7F6F2] px-6 lg:px-8 py-12 lg:py-20 relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-10 lg:gap-6 relative z-10">
        <div className="flex flex-col gap-5 md:max-w-[540px] flex-shrink-0">
          <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.18em] text-lemon-dark">
            {t('landing:hero.eyebrow')}
          </span>

          <h1 className="font-extrabold text-[40px] sm:text-[50px] lg:text-[60px] xl:text-[68px] text-ink leading-[1.05] tracking-[-0.03em]">
            {t('landing:hero.titleLine1')}
            <br />
            {t('landing:hero.titleLine2')}
            <br />
            {t('landing:hero.titleLine3')}
          </h1>

          <p className="text-[15px] lg:text-[17px] text-ink-60 max-w-[420px] leading-relaxed">
            {t('landing:hero.subtitle')}
          </p>

          <form
            onSubmit={onSearchSubmit}
            className="flex items-center w-full max-w-[480px] bg-white rounded-full p-1.5 mt-2 shadow-card-md border border-ink-10 focus-within:border-ink-20 transition-colors"
          >
            <div className="flex items-center flex-1 gap-3 px-4">
              <MagnifyingGlass size={18} weight="bold" className="text-ink-40 flex-shrink-0" />
              <input
                type="text"
                placeholder={t('landing:hero.searchPlaceholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-transparent text-ink text-[14px] placeholder:text-ink-40 outline-none w-full py-2"
              />
            </div>
            <Button type="submit" variant="primary" size="md" icon={ArrowRight} className="flex-shrink-0 rounded-full">
              {t('landing:hero.search')}
            </Button>
          </form>

          <p className="text-[13px] text-ink-40 mt-1">
            {t('landing:hero.signInPrompt')}{' '}
            <a href="/login" className="text-ink font-semibold hover:underline underline-offset-2">
              {t('common:signIn')}
            </a>
          </p>
        </div>

        <div className="hidden md:flex justify-end items-center">
          <PhotoCluster />
        </div>
      </div>
    </section>
  );
}
