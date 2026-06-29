import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { CategorySection } from '@/components/sections/CategorySection';
import { TourismAdsSection } from '@/components/sections/TourismAdsSection';
import { RoleUpgradeBannersSection } from '@/components/sections/RoleUpgradeBannersSection';
import { FeaturedSection } from '@/components/sections/FeaturedSection';
import { UpcomingSection } from '@/components/sections/UpcomingSection';
import { ArtistSection } from '@/components/sections/ArtistSection';
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
