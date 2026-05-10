import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMarketplaceBrowse } from '@/components/auth/RequireMarketplaceBrowse';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ArtistRedirectPage } from '@/pages/ArtistRedirectPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { CookiesPage } from '@/pages/legal/CookiesPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { OrganizerPortalRedirectPage } from '@/pages/organizer/OrganizerPortalRedirectPage';

const EventsPage = lazy(() =>
  import('@/pages/events/EventsPage').then((m) => ({ default: m.EventsPage })),
);
const EventDetailPage = lazy(() =>
  import('@/pages/events/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const MarketplacePage = lazy(() =>
  import('@/pages/marketplace/MarketplacePage').then((m) => ({ default: m.MarketplacePage })),
);
const TalentProfilePage = lazy(() =>
  import('@/pages/marketplace/TalentProfilePage').then((m) => ({
    default: m.TalentProfilePage,
  })),
);
const VendorProfilePage = lazy(() =>
  import('@/pages/marketplace/VendorProfilePage').then((m) => ({
    default: m.VendorProfilePage,
  })),
);
const AuctionPage = lazy(() =>
  import('@/pages/auction/AuctionPage').then((m) => ({ default: m.AuctionPage })),
);
const AuctionEventPage = lazy(() =>
  import('@/pages/auction/AuctionEventPage').then((m) => ({ default: m.AuctionEventPage })),
);
const SupportPage = lazy(() =>
  import('@/pages/support/SupportPage').then((m) => ({ default: m.SupportPage })),
);
const CheckoutPage = lazy(() =>
  import('@/pages/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const SeatSelectionPage = lazy(() =>
  import('@/pages/checkout/SeatSelectionPage').then((m) => ({
    default: m.SeatSelectionPage,
  })),
);
const MyTicketsPage = lazy(() =>
  import('@/pages/tickets/MyTicketsPage').then((m) => ({ default: m.MyTicketsPage })),
);
const TicketDetailPage = lazy(() =>
  import('@/pages/tickets/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const EngagementsPage = lazy(() =>
  import('@/pages/marketplace/EngagementsPage').then((m) => ({ default: m.EngagementsPage })),
);

export function App() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-24 text-center text-[13px] text-ink-40">Loading…</div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/oauth/:provider/callback" element={<OAuthCallbackPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route element={<RequireMarketplaceBrowse />}>
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/talent/:id" element={<TalentProfilePage />} />
            <Route path="/marketplace/vendor/:id" element={<VendorProfilePage />} />
          </Route>
          <Route path="/artists/:slug" element={<ArtistRedirectPage />} />
          <Route path="/auction" element={<AuctionPage />} />
          <Route path="/auction/events/:eventId" element={<AuctionEventPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiesPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/checkout/:eventId/seats" element={<SeatSelectionPage />} />
            <Route path="/checkout/:eventId" element={<CheckoutPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/my-tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/organizer-portal" element={<OrganizerPortalRedirectPage />} />
            <Route path="/engagements" element={<EngagementsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
