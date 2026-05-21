/** Domain types for mock main-website flows (replace with API types later). */

export type LayoutType = 'seated' | 'free';
export type UserRole = 'guest' | 'talent' | 'vendor' | 'organizer';
export type TalentApplicationStatus = 'not_started' | 'draft' | 'submitted' | 'approved' | 'rejected';
export type RoleOnboardingStatus = TalentApplicationStatus;
export type OnboardingRole = 'talent' | 'vendor' | 'organizer';

export interface BaseRegistrationFields {
  fullName: string;
  email: string;
  password: string;
  contactPhone: string;
  agreeTerms: boolean;
}

export interface TalentOnboardingDraft {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  /** Optional profile photo URL or mock file name. */
  profileImage?: string;
  bio: string;
  /** Saudi administrative region id (see `SAUDI_REGIONS`). */
  saudiRegionId: string;
  /** City name from Saudi cities list for the selected region. */
  city: string;
  travelReady: boolean;
  locationPublic: boolean;
  /** URLs and/or mock file names (video, image, certificate). */
  verificationMedia: string[];
  certificateName?: string;
  acceptedQualityDisclaimer: boolean;
}

export interface VendorOnboardingDraft {
  profileName: string;
  contactEmail: string;
  contactPhone: string;
  bio: string;
  serviceCategories: string[];
  verificationDocuments: string[];
  gallery: string[];
  city: string;
  coverageArea: string;
}

export interface OrganizerOnboardingDraft {
  displayName: string;
  profileImage: string;
  bio: string;
  email: string;
  contactPhone: string;
  location: string;
  socialLinks: string[];
  optionalDocument?: string;
  isCompany: boolean;
  companyName?: string;
  companyInfo?: string;
  ownerName: string;
  ownerInfo: string;
}

export interface RoleOnboardingRecord<TDraft> {
  status: RoleOnboardingStatus;
  draft: TDraft;
  submittedAt?: string;
  rejectionReason?: string;
}

export interface OrganizerSummary {
  id: string;
  name: string;
  logo?: string;
  bio: string;
  slug?: string;
  code?: string;
  eventsCount?: number;
}

export interface MockEvent {
  id: string;
  title: string;
  excerpt: string;
  description: string;
  coverImage: string;
  city: string;
  venue: string;
  venueAddress?: string;
  category: string;
  dateStart: string;
  dateEnd: string;
  priceMin: number;
  priceMax: number;
  /** `null` when the API omits inventory (not the same as sold out). */
  ticketsLeft: number | null;
  layoutType: LayoutType;
  featured: boolean;
  organizer: OrganizerSummary;
  showTalents: boolean;
  showVendors: boolean;
  talents: { id: string; slug?: string; name: string; photo?: string; proficiency?: string }[];
  vendors: { id: string; slug?: string; name: string; serviceType: string }[];
  rating: number | null;
  /** API-backed total rating count (when available from `EventDetail`). */
  ratingCount?: number;
  /** Social attending count from `attending_count`. */
  attendingCount?: number;
  /** Primary sales from `tickets_sold` (shown as “tickets bought”). */
  ticketsSold?: number;
  attendeeAvatars?: string[];
  gallery: string[];
  ticketTypes: { id: string; name: string; price: number; remaining: number | null }[];
  /** Map embed / link (demo) */
  lat?: number;
  lng?: number;
  /** Shown in gallery area when set */
  videoUrl?: string;
  /** Optional note from organizer, shown in event details */
  organizerNotes?: string;
  /** Optional venue/place images shown separately from event gallery */
  venueImages?: string[];
}

/** Resale listing (auction area). */
export interface MockAuctionListing {
  id: string;
  eventId: string;
  /** Set when listed from a user ticket */
  ticketId?: string;
  price: number;
  originalPrice: number;
  endsAt: string;
  seatLabel?: string;
  sellerLabel: string;
  eventTitle: string;
  city: string;
  venue: string;
  layoutType: LayoutType;
  highestBid?: number;
  bidsCount?: number;
  /** Listing code from API (`code`). */
  listingCode?: string;
  currency?: string;
  commissionPct?: number;
  ticketTypeLabel?: string;
  startsAt?: string;
  /** Listing lifecycle: `active`, `sold`, `cancelled`, `expired`, … */
  listingStatus?: string;
}

export type TicketStatus =
  | 'active'
  | 'auction'
  | 'gifted'
  | 'used'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export interface MockTicket {
  id: string;
  /** Public ticket code from API (`code`), when present. */
  ticketCode?: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  city: string;
  dateStart: string;
  dateEnd: string;
  status: TicketStatus;
  typeName: string;
  seatLabel?: string;
  orderRef: string;
  qrPayload?: string;
  /** API `signed_qr_payload` on detail — not used for QR rendering (gate uses `ticketCode`). */
  signedQrPayload?: string;
  pricePaid: number;
  /** If true, overlap check uses this when booking another event same time */
  countsForOverlap?: boolean;
  /** Ticket was received as a gift — cannot re-gift or auction per product rules */
  receivedAsGift?: boolean;
  /** Purchased via auction — cannot gift */
  fromAuction?: boolean;
  /** Linked resale listing when status is auction */
  listedAuctionId?: string;
}

export type SupportCategory =
  | 'technical'
  | 'ticket'
  | 'dispute_organizer'
  | 'account'
  | 'other';

export type EngagementStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';
export type TalentAvailability = 'available' | 'reserved';

export interface MockOrganizerProfile {
  id: string;
  name: string;
  bio: string;
  city: string;
  organizerType: string;
  recentEvents: string[];
}

export interface MockEngagementMessage {
  id: string;
  sender: 'organizer' | 'talent';
  text: string;
  createdAt: string;
}

export interface MockEngagement {
  id: string;
  organizerName: string;
  organizerId: string;
  topic: string;
  preview: string;
  status: EngagementStatus;
  createdAt: string;
  /** Mock-only sidebar payload; absent on rows hydrated from the live API. */
  organizerProfile?: MockOrganizerProfile;
  messages: MockEngagementMessage[];
}

export interface MarketplaceTalent {
  id: string;
  slug: string;
  name: string;
  bio: string;
  city: string;
  categories: string[];
  rating: number;
  image: string;
  gallery: string[];
  availability: TalentAvailability;
}

export interface MarketplaceVendor {
  id: string;
  slug: string;
  name: string;
  bio: string;
  city: string;
  serviceCategories: string[];
  rating: number;
  image: string;
  gallery: string[];
}

export interface EventFilters {
  keyword?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  /** `'all'` = no filter */
  layoutType?: LayoutType | 'all';
  availabilityOnly?: boolean;
  featured?: boolean;
}
