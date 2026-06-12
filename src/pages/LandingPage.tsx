import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { CategorySection } from '@/components/sections/CategorySection';
import { TourismAdsSection } from '@/components/sections/TourismAdsSection';
import { FeaturedSection } from '@/components/sections/FeaturedSection';
import { UpcomingSection } from '@/components/sections/UpcomingSection';
import { ArtistSection } from '@/components/sections/ArtistSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { CTASection } from '@/components/sections/CTASection';
import { TrustedBySection } from '@/components/sections/TrustedBySection';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <TrustedBySection />
        <CategorySection />
        <TourismAdsSection />
        <FeaturedSection />
        <UpcomingSection />
        <ArtistSection />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
