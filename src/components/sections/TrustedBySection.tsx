import { useTranslation } from 'react-i18next';
import { Marquee } from '@/components/ui/Marquee';

const partners: { name: string; file: string }[] = [
  { name: 'STC', file: 'STC-01.png' },
  { name: 'Seven Saudi Entertainment', file: 'Seven Saudi Entertainment Ventures2-01.png' },
  { name: 'NEOM', file: 'neom (2).png' },
  { name: 'Red Sea Global', file: 'Red Sea Global-01.png' },
  { name: 'Roshn', file: 'Roshn Group01.png' },
  { name: 'Saudi Aramco', file: 'Saudi-Aramco-01.png' },
  { name: 'Vision 2030', file: 'Vision 2030-01.png' },
];

export function TrustedBySection() {
  const { t } = useTranslation('landing');
  return (
    <section className="bg-[#F7F6F2] px-6 lg:px-8 pb-12 lg:pb-16">
      <div className="max-w-[1280px] mx-auto">
        <div className="border-t border-ink-10 pt-10">
          <p className="text-center text-[13px] sm:text-[14px] font-semibold text-ink-60 mb-8">
            {t('trustedBy.title')}
          </p>
        </div>
      </div>

      <Marquee speed={35} gap={48} pauseOnHover className="py-4">
        {partners.map((p) => (
          <div
            key={p.name}
            className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity cursor-default grayscale hover:grayscale-0 flex items-center justify-center h-16 sm:h-20 md:h-24"
            title={p.name}
          >
            <img
              src={`/assets/partners/${encodeURIComponent(p.file)}`}
              alt={p.name}
              className="h-full w-auto max-w-[min(280px,70vw)] sm:max-w-[min(320px,55vw)] md:max-w-[min(360px,45vw)] object-contain object-center"
            />
          </div>
        ))}
      </Marquee>
    </section>
  );
}
