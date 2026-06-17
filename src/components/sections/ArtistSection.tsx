import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Carousel } from '@/components/ui/Carousel';
import { HotArtistCard } from '@/components/cards/HotArtistCard';
import { useGetTopTalentsQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';
import { topTalentToHotArtistCard } from '@/lib/talentMappers';

const TOP_TALENTS_LIMIT = 8;

export function ArtistSection() {
  const { i18n, t } = useTranslation(['landing', 'nav']);
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { user } = useAuth();
  const { data: talents = [], isLoading, isFetching } = useGetTopTalentsQuery({ limit: TOP_TALENTS_LIMIT });

  const cards = useMemo(
    () => talents.map((talent, index) => topTalentToHotArtistCard(talent, index, language)),
    [language, talents],
  );

  const viewAllHref = canBrowseMarketplace(user) ? '/marketplace?type=talent' : undefined;

  if (isLoading || (isFetching && talents.length === 0)) {
    return null;
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#0c0c0c] px-6 py-16 lg:px-8 lg:py-24">
      <div className="relative z-10 mx-auto max-w-[1280px]">
        <Carousel
          overline={t('landing:performingSoon', 'Performing Soon')}
          title={t('landing:hotArtists', 'Hot Artists')}
          viewAllHref={viewAllHref}
          variant="dark"
        >
          {cards.map((artist) => (
            <div key={artist.href} className="flex-shrink-0">
              <HotArtistCard {...artist} />
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
