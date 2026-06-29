import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/sections/HeroSection';
import { CategorySection } from '@/components/sections/CategorySection';
import { TourismAdsSection } from '@/components/sections/TourismAdsSection';
import { RoleUpgradeBannersSection } from '@/components/sections/RoleUpgradeBannersSection';
import { FeaturedSection } from '@/components/sections/FeaturedSection';
import { UpcomingSection } from '@/components/sections/UpcomingSection';
import { ArtistSection } from '@/components/sections/ArtistSection';
import { CTASection } from '@/components/sections/CTASection';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar variant="hero" />
      <main className="flex-1">
        <HeroSection />
        <CategorySection />
        <TourismAdsSection />
        <RoleUpgradeBannersSection />
        <FeaturedSection />
        <UpcomingSection />
        <ArtistSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
