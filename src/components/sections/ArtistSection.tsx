import { Carousel } from '@/components/ui/Carousel';
import { HotArtistCard } from '@/components/cards/HotArtistCard';
import { useAuth } from '@/contexts/AuthContext';
import { HOT_ARTISTS } from '@/lib/images';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';

export function ArtistSection() {
  const { user } = useAuth();
  const viewAllHref = canBrowseMarketplace(user) ? '/marketplace?type=talent' : undefined;

  return (
    <section className="bg-[#0c0c0c] px-6 py-16 lg:px-8 lg:py-24">
      <div className="relative z-10 mx-auto max-w-[1280px]">
        <Carousel
          overline="Performing Soon"
          title="Hot Artists"
          viewAllHref={viewAllHref}
          variant="dark"
        >
          {HOT_ARTISTS.map((artist) => (
            <div key={artist.title} className="flex-shrink-0">
              <HotArtistCard {...artist} href={`/artists/${encodeURIComponent(artist.title)}`} />
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
