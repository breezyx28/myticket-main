# MyTicket — Main Website Flow

> **Type:** Main Website (Public-Facing)  
> **URL:** `myticket.com`  
> **Users:** Guest (unauthenticated), Guest (registered), Talent, Vendor, Organizer (browsing/buying only)  
> **Shared Flows:** See `myticket_shared_flow.md` for authentication, notifications, payment, localization, and ticket format  
> **Master Reference:** `myticket_platform_flow.md`  
> **Last Updated:** April 30, 2026

This document is split into two parts:

1. **§§1–14 — Product flow.** Narrative description of every user-facing surface (auth, discovery, booking, tickets, gifting, auction, waitlist, marketplace, ratings, sharing, profile, support). Each section now includes the underlying form fields and entity shapes, anchored to the source files in `src/`.
2. **§§15–20 — Code-derived reference.** Compact tables intended as the source spec for the future shared MySQL schema:
   - §15 Data Model — Entity Reference (every entity, columns, FKs, enums)
   - §16 Forms & Validation Reference (one row per form)
   - §17 Constants & Enumerations (every literal-union type + lookup lists)
   - §18 Frontend Persistence Map (the 14 `localStorage`/`sessionStorage` keys → target tables)
   - §19 Routes & Access Control (every `<Route>` with auth/role gates)
   - §20 Cross-App Ownership Hints (Admin / Organizer / Scanner ownership)

---

## 1. Overview

The Main Website is the public-facing entry point to the MyTicket platform. It includes a landing page, event discovery, the full booking flow, ticket management, the Marketplace (browsing and Talent/Vendor response), ratings, support, and account management. This is the only app where user registration is available.

---

## 2. Authentication

The Main Website has its own login and registration pages.

### Login Page

- Email/password login and Google Social Login.
- All roles (Guest, Talent, Vendor, Organizer) can log in.
- See `myticket_shared_flow.md` Section 3.6 for login flow details.
- Source: [src/pages/auth/LoginPage.tsx](src/pages/auth/LoginPage.tsx).

#### Login form fields

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `email` | VARCHAR(255) | Yes | HTML5 email; `autoComplete="email"`. |
| `password` | VARCHAR | Yes | Free length client-side; backend should enforce ≥ 8. `autoComplete="current-password"`. |

Auxiliary actions on this form: "Continue with Google" (OAuth — see derived shape below), "Forgot password?" link.

### Registration Page

- Registration is **only available on the Main Website**.
- Email/password registration and Google Social Login.
- See `myticket_shared_flow.md` Sections 3.1–3.5 for full registration flow, required fields, verification, and Terms of Service.
- Implemented as a multi-stage wizard (`basic` → `role-selection` → `onboarding`) in [src/pages/auth/RegisterPage.tsx](src/pages/auth/RegisterPage.tsx).

#### Register — Basic step (`BaseRegistrationFields`)

Source: [src/components/auth/steps/SharedBasicStep.tsx](src/components/auth/steps/SharedBasicStep.tsx) and [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) (`isBasicValid`).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `fullName` | VARCHAR(120) | Yes | `trim().length >= 3`. |
| `email` | VARCHAR(255) | Yes | Must contain `@`. |
| `password` | VARCHAR | Yes | `length >= 8`. |
| `contactPhone` | VARCHAR(20) | Yes | Saudi format with `+966` country code via `SaudiPhoneInput`. Local number digits only. |
| `agreeTerms` | BOOLEAN | Yes | Must be `true` to proceed. Records consent to ToS. |

#### Role selection step

Choice of one role: `guest | talent | vendor | organizer`. Selecting a non-guest role enters the role onboarding wizard (see §10 and §13). Choosing **Guest** completes registration immediately and redirects to the originally requested page (`from` location state) or `/`.

### Forgot Password / Reset Password

- Available on the login page.
- See `myticket_shared_flow.md` Section 3.7 for the full password reset flow.
- Sources: [src/pages/auth/ForgotPasswordPage.tsx](src/pages/auth/ForgotPasswordPage.tsx), [src/pages/auth/ResetPasswordPage.tsx](src/pages/auth/ResetPasswordPage.tsx).

#### Forgot password form

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `email` | VARCHAR(255) | Yes | HTML5 email. Always returns a generic "if an account exists…" success message (no enumeration). |

#### Reset password form

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `token` | VARCHAR(128) | Yes | Read from URL `?token=…`. Server-issued, single-use, expiring. Becomes the `password_reset_tokens` table. |
| `password` (new) | VARCHAR | Yes | `minLength={8}`. `autoComplete="new-password"`. |

### Google OAuth — derived user shape

When a user signs in / registers with Google (see `signInGoogle` in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)), the system seeds a `MockUser` from the Google identity. In production this maps to an `oauth_identities` row that links a provider account to a `users` row.

| Field | Type | Required | Notes |
|---|---|---|---|
| `provider` | ENUM('google') | Yes | Currently only Google. |
| `provider_user_id` | VARCHAR(128) | Yes | Provider-issued subject id. |
| `email` | VARCHAR(255) | Yes | Provider-asserted email (demo seeds `google.user@example.com`). |
| `name` | VARCHAR(120) | Yes | Provider-asserted display name (demo seeds `Google User`). |
| `linked_user_id` | FK → `users.id` | Yes | The platform user the identity authenticates as. |
| `linked_at` | TIMESTAMP | Yes | When the link was established. |

### Guest Browsing Mode

- Non-registered visitors can browse events, view event details, and explore the platform freely.
- Any action that requires identity (buying tickets, gifting, rating, accessing the Marketplace) triggers a **registration/login prompt**.
- After registering (via Google or email/password), the user is redirected back to continue the action they initiated.

---

## 3. Landing Page & Home

The landing page is the main entry point for the platform. It includes:

- **Hero section** with a prominent search bar and featured event highlights.
- **Featured Events** section — uses an **algorithmic mode by default** (most sold, most viewed). The Admin can override manually from the Admin Dashboard.
- **Category browsing** — category cards/tabs displayed prominently for quick filtering.
- **Navigation** to all major sections: events, marketplace, my tickets, profile.

---

## 4. Event Discovery, Search & Categories

### Event Card (Browse View)

When browsing events (home page, search results, category pages), each event is displayed as a **card** showing the most important information at a glance:

| Element | Description |
|---|---|
| **Cover image** | Primary event image / banner |
| **Event name** | Title of the event |
| **Location** | Venue name and/or city |
| **Description** | Short summary / excerpt |
| **Available tickets** | Number of tickets still available (e.g., "42 tickets left") |
| **CTA button** | Primary action button (e.g., "View Event" or "Get Tickets") |

### Event Detail Page (Full View)

Clicking on an event card opens a **dedicated event page** with comprehensive information:

| Section | Content |
|---|---|
| **Event info** | Full title, complete description, date & time, location with map, category |
| **Cover & gallery** | Cover image + additional event images/videos uploaded by the Organizer |
| **Ticket options** | All available ticket types with prices; **layout tag** on hero and in the tickets card: **No seats** when sold out, otherwise **Free seating** (`layoutType === 'free'`) or **Assigned seats** (`layoutType === 'seated'`). For **seated** events, a seat-map preview plus CTA to **seat selection** (`/checkout/:eventId/seats`); for **free** layout, CTA goes straight to checkout (`/checkout/:eventId`) |
| **Organizer info** | Organizer profile summary (name, logo, bio, link to full profile) |
| **Talents** | List of Talents associated with the event (name, photo, link to profile) — **shown only if the Organizer enables it** (per-event toggle) |
| **Vendors** | List of Vendors associated with the event (name, service type, link to profile) — **shown only if the Organizer enables it** (per-event toggle) |
| **Ratings** | Average star rating from past attendees (for recurring or past events) |
| **Share** | Social media sharing buttons and copy-link option |

### Search & Filters

Users can search and filter events using the following criteria:

| Filter | Type | Description |
|---|---|---|
| **Keyword** | Text search | Search by event title, description, or artist name |
| **Category** | Dropdown / tags | Filter by admin-defined event categories |
| **Date range** | Date picker | From date → to date |
| **Location / City** | Dropdown or map | Filter by city or geographic area |
| **Price range** | Slider / min-max | Filter by ticket price range |
| **Layout type** | Toggle / checkbox | Seated (Grid/Section) vs. Free-layout |
| **Availability** | Toggle | Show only events with available tickets |

### Event Categories

Event categories are **managed by the Admin** (see Admin Dashboard flow) and used to classify events across the platform.

| Property | Required | Description |
|---|---|---|
| Name | Yes | Category display name (e.g., "Concerts", "Sports", "Theater") |
| Icon | Yes | Visual icon representing the category |
| Color | No | Optional accent color for UI presentation |

- Categories are displayed on the home page and in search filters for discovery.
- Each event belongs to at least one category.

### Event entity — full field model (`MockEvent`)

Source: [src/types/domain.ts](src/types/domain.ts) (`MockEvent`), seed data in [src/data/mockEvents.ts](src/data/mockEvents.ts).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | e.g. `evt-1`. |
| `title` | VARCHAR(160) | Yes | Display title. |
| `excerpt` | VARCHAR(255) | Yes | Short card summary. |
| `description` | TEXT | Yes | Long-form description. |
| `coverImage` | VARCHAR(500) | Yes | Primary image URL. |
| `category` | VARCHAR(64) | Yes | Must be one of `EVENT_CATEGORIES` (Admin-managed). |
| `city` | VARCHAR(80) | Yes | Free text in seed data; `EventFilters.city` is constrained to `EVENT_CITIES`. |
| `venue` | VARCHAR(160) | Yes | Venue name or "Online (Zoom)" for virtual events. |
| `lat` | DECIMAL(10,7) | No | Map embed uses lat/lng if both set; falls back to venue+city geocode. |
| `lng` | DECIMAL(10,7) | No | See `lat`. |
| `dateStart` | DATETIME (ISO) | Yes | UTC ISO string. |
| `dateEnd` | DATETIME (ISO) | Yes | UTC ISO string. Used by `eventsOverlap()` to detect scheduling conflicts. |
| `priceMin` | INT (SAR) | Yes | Display price floor. |
| `priceMax` | INT (SAR) | Yes | Display price ceiling (= max ticket type price). |
| `ticketsLeft` | INT | Yes | Aggregate availability across all ticket types. `0` ⇒ sold out (waitlist + auction CTAs). |
| `layoutType` | ENUM('seated','free') | Yes | Drives checkout flow (seat picker vs. quantity input). |
| `featured` | BOOLEAN | Yes | Set by Admin override or algorithmic mode. Surfaced via `?featured=true`. |
| `rating` | DECIMAL(2,1) NULL | No | Seed average; used as prior in `getDisplayRating()` (`n=12` weight). |
| `attendingCount` | INT | No | Card stat. |
| `attendeeAvatars` | JSON (string[]) | No | URLs for the avatar stack on cards. |
| `organizerNotes` | TEXT | No | "Note from organizer" callout on detail page. |
| `videoUrl` | VARCHAR(500) | No | Embedded iframe (e.g. YouTube embed URL). |
| `gallery` | JSON (string[]) | Yes (may be `[]`) | Event gallery images. |
| `venueImages` | JSON (string[]) | No | Distinct from `gallery`; rendered as a separate "Images of the event place" block. |
| `showTalents` | BOOLEAN | Yes | Per-event toggle for the Talents section visibility. |
| `showVendors` | BOOLEAN | Yes | Per-event toggle for the Vendors section visibility. |
| `organizer` | OBJECT (`OrganizerSummary`) | Yes | `{ id, name, logo?, bio }`. Becomes `events.organizer_id` FK + cached snapshot. |
| `talents` | ARRAY of `{ id, name, photo?, proficiency? }` | Yes (may be `[]`) | Becomes `event_talents` link table; `proficiency` is the role description shown on the card. |
| `vendors` | ARRAY of `{ id, name, serviceType }` | Yes (may be `[]`) | Becomes `event_vendors` link table; `serviceType` is a free-text label. |
| `ticketTypes` | ARRAY of `EventTicketType` | Yes | One row per tier; see below. |

#### Event ticket type (`event.ticketTypes[]`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | e.g. `tt-1a`. |
| `name` | VARCHAR(80) | Yes | "General Admission", "VIP", "Backstage", … |
| `price` | INT (SAR) | Yes | Per-ticket price. `0` = free entry pass. |
| `remaining` | INT | Yes | Available count for this tier. Drives the "X left" label and disables sold-out tiers in the dropdown. |

### Search & Filters — form (`EventFilters`)

Source: [src/pages/events/EventsPage.tsx](src/pages/events/EventsPage.tsx) — filters are passed as query params to `useListEventsQuery` ([src/api/endpoints/events.ts](src/api/endpoints/events.ts)); the legacy in-memory `matchesEvent` predicate was retired with the mock services.

| Field | Type | Required | Notes |
|---|---|---|---|
| `keyword` | VARCHAR(160) | No | Searches `title + excerpt + description + talent names` (case-insensitive substring). |
| `category` | VARCHAR(64) | No | Value `'all'` ⇒ no filter. Otherwise must match an `EVENT_CATEGORIES` entry. |
| `city` | VARCHAR(80) | No | Value `'all'` ⇒ no filter. UI dropdown sourced from `EVENT_CITIES`. |
| `dateFrom` | DATE | No | Inclusive lower bound on `dateStart`. |
| `dateTo` | DATE | No | Inclusive upper bound on `dateStart` (treated as `…T23:59:59`). |
| `priceMin` | INT (SAR) | No | Excludes events whose `priceMax < priceMin`. |
| `priceMax` | INT (SAR) | No | Excludes events whose `priceMin > priceMax`. |
| `layoutType` | ENUM('all','seated','free') | No | Default `'all'`. |
| `availabilityOnly` | BOOLEAN | No | When true, hides events with `ticketsLeft <= 0`. |
| `featured` | BOOLEAN | No | URL query `?featured=true`. |

### Lookup data — backend reference taxonomies

Source: `useGetEventCategoriesQuery` and `useGetEventCitiesQuery` ([src/api/endpoints/reference.ts](src/api/endpoints/reference.ts)) call `GET /events/categories` and `GET /events/cities`.

- **Categories** (10 today): `Music`, `Sports`, `Arts & Culture`, `Comedy`, `Online`, `Family`, `Food & Drink`, `Fashion`, `Tech`, `Theatre`.
- **Cities** (4 today): `Riyadh`, `Jeddah`, `Khobar`, `Dubai`.

These are server-side rows in the `event_categories` and `event_cities` lookup tables (Admin-owned).

---

## 5. Booking Flow

### Main Website route order (implemented)

The Main Website uses **`event.layoutType`** to branch. Implementation: [src/pages/events/EventDetailPage.tsx](src/pages/events/EventDetailPage.tsx) (purchase CTA), [src/pages/checkout/SeatSelectionPage.tsx](src/pages/checkout/SeatSelectionPage.tsx), [src/pages/checkout/CheckoutPage.tsx](src/pages/checkout/CheckoutPage.tsx) (redirect if seated without seats), [src/App.tsx](src/App.tsx) (nested routes under `RequireAuth`).

#### A. Seated events (`layoutType === 'seated'`)

1. User opens the **event detail** page (`/events/:eventId`).
2. User taps **Choose seats** — navigates to **`/checkout/:eventId/seats`** (seat selection page), **not** the payment screen yet.
3. On the seat selection page the user:
   - Picks a **ticket type / section** (drives which seats appear on the map).
   - Selects **one or more seats** on the blueprint or raw grid (one ticket = one seat).
   - Taps **Continue to checkout** — navigates to **`/checkout/:eventId`** with **router state** carrying `selectedSeats[]` (`seatId`, `label`, `section`, `ticketTypeId`) and `selectedTicketTypeId`.
4. **Checkout (payment)** shows a **review** step first (step 2 in the UI): line items reflect the selected seat count and labels; the ticket-type step (step 1) is skipped for seated because type and quantity come from the seat selection. User enters card details and pays.
5. **If the user is not logged in:** `RequireAuth` sends them to `/login` with `state.from` pointing at the URL they tried (e.g. `/checkout/:eventId/seats`). After login, they return to that path and continue the same branch.
6. **Direct deep-link guard:** If someone opens **`/checkout/:eventId`** for a seated event **without** passing selected seats (no state / empty selection), [CheckoutPage.tsx](src/pages/checkout/CheckoutPage.tsx) **redirects** them back to **`/checkout/:eventId/seats`** so payment never runs without a seat choice.
7. Selected seats are **locked** while payment is being processed (see Seat Locking Logic below).
8. Payment is processed via Payment Gateway (simulated in the demo).
9. On **payment success:** booking created; each seat **BOOKED**; one **QR ticket per seat**; email + in-app notification; success UI with link to ticket(s).
10. On **payment failure:** locks **released**; user may retry from checkout or return to seat selection to change seats.

#### B. Free-layout events (`layoutType === 'free'`)

1. User opens the **event detail** page.
2. User taps **Proceed to checkout** — navigates directly to **`/checkout/:eventId`** (no seat map route).
3. On checkout **step 1**, user picks **ticket type** and **quantity** (up to per-tier and global caps), then continues to review and payment.
4. Same **auth**, **payment**, **success/failure** behavior as above (no per-seat map; `qty` drives ticket count).

### Legacy summary (same rules, shorter)

- **Seated:** event detail → **seat selection** (`/checkout/.../seats`) → **checkout** (`/checkout/...` + state) → pay.
- **Free layout:** event detail → **checkout** → choose type + qty → pay.
- **Unauthenticated users** are prompted to log in; after login they resume the same URL (seat page or checkout as applicable).

### Booking Confirmation

After a successful purchase, the user sees a **success dialog modal** with:

- **Celebration animation** — party/confetti effect to create a positive purchase moment.
- **Order summary** — event name, number of tickets, total amount paid, order/receipt number.
- **"View My Tickets" link** — redirects to the user's **ticket details page** within their profile.

The ticket details page (within the user's profile) shows:

| Element | Description |
|---|---|
| **Order/receipt number** | Unique reference for this booking |
| **Event details** | Event name, date, time, location |
| **Ticket list** | Each ticket with seat info, ticket type, QR code preview |
| **Download options** | PDF download button, "Add to Wallet" button (Apple/Google) |
| **Actions** | "Gift Ticket", "Drop to Auction" buttons per ticket |
| **Payment summary** | Ticket prices, fees, total paid, payment method |

### Overlapping Event Warning

If a user attempts to purchase tickets for an event that **overlaps in date and time** with another event they already have tickets for, the system displays:

1. A clear **warning alert** informing the user that they already hold tickets for another event at the same time.
2. A **disclaimer statement**: _"MyTicket is not responsible for scheduling conflicts resulting from your decision to purchase overlapping event tickets."_
3. A **"Read here"** link that opens the relevant section of the Terms of Service explaining that overlapping-event purchases are **non-refundable**.
4. An **"Ignore & Continue"** button allowing the user to proceed with the purchase at their own risk.
5. If the user does not click "Ignore & Continue", the purchase is not completed and they are returned to the event page.

### Refund Policy (User-Initiated)

- There is **no direct refund** for change of mind. Users cannot cancel a ticket and request a refund simply because they no longer wish to attend.
- The **auction system is the only way** for a user to recover their ticket value — by listing the ticket for resale before the event day. The seller can set the auction price at the **original purchase price or less**.
- If the Organizer does not offer a direct bank refund, the user's recourse is to resell through the auction. A **disclaimer** explaining the refund duration and refund policy is displayed, and the ticket is **deactivated automatically** upon expiry.
- Refunds are only issued in the following cases:
  - **Event cancellation** by the Organizer or Admin — handled per the cancellation agreement with the organizer.
  - **Significant event edit** — the **Organizer is responsible** for issuing refunds when they make major changes (date, duration, location).
  - **Seat conflict** — payment reversed due to a race condition.

### Seat Locking Logic

- For **seated** events, seats are **locked when the user reaches the payment step** on checkout (after seat selection and review). The lock is held while the payment transaction is being processed.
- On **payment success**: the lock becomes a permanent booking — the seat is marked as BOOKED.
- On **payment failure**: the lock is **released immediately**, making the seat available to other users.
- Locks have a **timeout** — if a payment is not completed within a reasonable window, the lock expires and the seat is released.

### Race Condition Handling

When two users attempt to purchase the same seat at the same time (simultaneous checkout), the system uses a **fairness-first approach**:

1. **Both users' transactions are rejected** — neither user gets the seat.
2. Both users receive a clear **alert message**: _"A conflict occurred for the selected seat. Please try again."_
3. Both users are **redirected back to the seat selection view** with the seat map updated to reflect current availability.
4. The seats involved in the conflict are **released** so either user (or anyone else) can attempt to book them again.
5. Any payment holds or pre-authorizations for both transactions are released immediately.

### Group Booking & Ticket Assignment

When a user books multiple tickets in a single transaction, each ticket is generated **separately** (one ticket per seat, not a combined ticket). The buyer has two options:

- **Hold all tickets:** The buyer is the holder of all tickets. All QR codes are sent to the buyer's account. The group enters the event together using the buyer's tickets. No name assignment is required.
- **Gift individual tickets:** The buyer can send any individual ticket to another person via their **email address**. If the recipient is a **registered user**, they receive the ticket PDF + a link to their profile dashboard. If the recipient is **not registered**, the email includes a **registration link** — after registering, the ticket is claimed automatically to their account. See Section 7 (Ticket Gifting) for full gifting rules.

### Seat selection form (seated layout)

Source: [src/pages/checkout/SeatSelectionPage.tsx](src/pages/checkout/SeatSelectionPage.tsx) and [src/types/seating.ts](src/types/seating.ts).

| Field | Type | Required | Notes |
|---|---|---|---|
| `selectedTicketTypeId` | VARCHAR(40) (FK → `event_ticket_types.id`) | Yes | Drives which seat section is shown. Changing it clears the selection. |
| `selectedSeats[]` | ARRAY of `SelectedSeat` | Yes (≥ 1) | Each item: `{ seatId, label, section, ticketTypeId }`. Sent to checkout via router state. |
| `viewMode` | ENUM('blueprint','raw') | UI only | Toggles 3D layout vs. flat grid; not persisted. |

#### Seat record (`SeatRecord`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(80) PK | Yes | Composite: `${eventId}-${ticketTypeId}-${section}-${row}-${number}`. |
| `label` | VARCHAR(40) | Yes | Display label (e.g., `A-3-5`). |
| `section` | VARCHAR(8) | Yes | Demo seeds use `A`, `B`, `C` per ticket-type index. |
| `row` | TINYINT UNSIGNED | Yes | 1-based. |
| `number` | TINYINT UNSIGNED | Yes | 1-based. |
| `ticketTypeId` | FK → `event_ticket_types.id` | Yes | Tier the seat belongs to. |
| `status` | ENUM('available','held','booked') | Yes | Server-authoritative; transitions on hold / payment success / failure. |
| `position.x` | DECIMAL(6,2) | No | 3D scene coordinate. |
| `position.y` | DECIMAL(6,2) | No | 3D scene coordinate (height). |
| `position.z` | DECIMAL(6,2) | No | 3D scene coordinate. |

#### Seat lock — server contract (implied by flow)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `seat_id` | FK → `seats.id` | Yes | One active lock per seat enforced by unique partial index. |
| `held_by_user_id` | FK → `users.id` | Yes | The buyer attempting checkout. |
| `held_for_order_id` | FK → `orders.id` NULL | No | Once an order is created. |
| `expires_at` | TIMESTAMP | Yes | Server-side timeout — see "Seat Locking Logic" above. |
| `released_reason` | ENUM('paid','timeout','payment_failed','race_condition','user_abandoned') NULL | No | Audit trail. |

### Checkout payment form

Source: [src/pages/checkout/CheckoutPage.tsx](src/pages/checkout/CheckoutPage.tsx) — card validation primitives in [src/lib/cardPayment.ts](src/lib/cardPayment.ts) and [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts); the order is then created and confirmed via `useCreateOrderMutation` / `useConfirmOrderPaymentMutation` ([src/api/endpoints/orders.ts](src/api/endpoints/orders.ts)).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `ticketTypeId` | FK → `event_ticket_types.id` | Yes (free layout) | Defaults to first non-empty tier. Auto-derived for seated layouts from selected seats. |
| `qty` | TINYINT UNSIGNED | Yes (free layout) | `1..min(remaining, 10)`. For seated layouts equals `selectedSeats.length`. |
| `method` | ENUM('visa','mastercard','mada') | Yes | See `CARD_PAYMENT_METHODS`. |
| `cardholder` | VARCHAR(120) | Yes | `trim().length >= 3`. |
| `cardNumber` | VARCHAR(23) | Yes | 16–19 digits + Luhn check. Auto-detects network; mismatch with `method` is a validation error. Mada detection uses the `MADA_PREFIXES` BIN list. |
| `expiry` | CHAR(5) `MM/YY` | Yes | Must be a real future month (MM 01–12, end of month inclusive). |
| `cvv` | CHAR(3) | Yes | Exactly 3 digits (incl. Mada CVV per [`cardPaymentValidation.ts`](src/lib/cardPaymentValidation.ts)). |
| `saveCard` | BOOLEAN | No | UI-only toggle. Future: save tokenized card to `saved_cards`. |

#### Pricing

- **Subtotal** = `unitPrice * qty`
- **Fees (demo)** = `Math.round(subtotal * 0.05)` — 5% (mock).
- **Total** = `subtotal + fees`.
- Production should source the fee % from a server-side config (Admin-owned).

#### Payment process stages (`PaymentProcessStage`)

`idle → authorizing → three_ds (if tail % 3 === 0) → approved | declined`. Decline rule (mock): `cardNumber.endsWith('0000') || tail % 11 === 0` from `simulatePaymentOutcome()`.

#### ID / payload formats produced at success

| Identifier | Format | Generator | Notes |
|---|---|---|---|
| Order ref | `ORD-{base36-timestamp}` | `Date.now().toString(36).toUpperCase()` | Becomes `orders.reference`. Demo also uses `ORD-DEMO-…` and `ORD-DEMO-USED-1` etc. for seeds. |
| Ticket id | `tix-{uuid}` | `crypto.randomUUID()` | PK of `tickets`. |
| QR payload | `qr-{ticketId}` | Derived | The signed string encoded into the QR. Must rotate on gift / auction transfer per §7 / §8. |
| Auction listing id | `auc-{uuid}` | `crypto.randomUUID()` | PK of `auction_listings`. |

### Overlap detection

`useCheckTicketOverlapMutation` ([src/api/endpoints/tickets.ts](src/api/endpoints/tickets.ts)) calls `POST /me/tickets/check-overlap`; the backend returns `{ has_overlap, conflicts[] }` after intersecting the user's active tickets with the prospective event's `[dateStart, dateEnd]` window (excluding the same `eventId`). The "Ignore & Continue" path in the warning dialog flips `overlapDismissed=true` and proceeds to `completePurchase()`.

---

## 6. My Tickets Page

The **My Tickets** page in the user's profile provides a central view of all their tickets:

| Ticket Status | Description | Available Actions |
|---|---|---|
| **Active** | Valid, upcoming event, not yet used | Gift, Auction, Download PDF, Add to Wallet |
| **In Auction** | Currently listed for resale | View listing, Cancel auction listing |
| **Gifted** | Transferred to another user | View gift confirmation (read-only) |
| **Used** | Scanned and admitted at event | View details, Rate event |
| **Expired** | Event has ended, ticket not used | View details (read-only) |
| **Cancelled** | Event was cancelled, refund issued | View refund details |

Filter chips on the page: `all | active | auction | gifted | used | expired | cancelled` (see [src/pages/tickets/MyTicketsPage.tsx](src/pages/tickets/MyTicketsPage.tsx)).

### Ticket entity — full field model (`MockTicket`)

Source: [src/types/domain.ts](src/types/domain.ts) (`MockTicket`), seed in [src/data/mockTickets.ts](src/data/mockTickets.ts).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | `tix-{uuid}`. |
| `eventId` | FK → `events.id` | Yes | |
| `eventTitle` | VARCHAR(160) | Yes | Cached snapshot at purchase (resilient to event renames). |
| `venue` | VARCHAR(160) | Yes | Cached snapshot. |
| `city` | VARCHAR(80) | Yes | Cached snapshot. |
| `dateStart` | DATETIME (ISO) | Yes | Cached snapshot. |
| `dateEnd` | DATETIME (ISO) | Yes | Cached snapshot. |
| `status` | ENUM(`TicketStatus`) | Yes | `active | auction | gifted | used | expired | cancelled`. |
| `typeName` | VARCHAR(80) | Yes | Cached label of the ticket type. |
| `seatLabel` | VARCHAR(80) NULL | No | Present only for seated layouts. Format like `Section A · Row 4 · Seat 12`. |
| `orderRef` | VARCHAR(40) | Yes | FK → `orders.reference`. Same value across sibling tickets in a multi-ticket order. |
| `qrPayload` | VARCHAR(255) NULL | No | The current QR payload. Rotates on gift / auction transfer. Absent for `auction` status (re-issued to buyer on sale). |
| `pricePaid` | INT (SAR) | Yes | Caps any subsequent auction listing price. |
| `countsForOverlap` | BOOLEAN NULL (default true) | No | When `false`, this ticket is excluded from `userHasOverlappingTicket()`. Useful for multi-day passes. |
| `receivedAsGift` | BOOLEAN NULL | No | If `true`, the ticket is **not** giftable and **not** auction-listable. |
| `fromAuction` | BOOLEAN NULL | No | If `true`, the ticket is **not** giftable (per §8). It **may** be re-auctioned. |
| `listedAuctionId` | FK → `auction_listings.id` NULL | No | Set while `status='auction'`; cleared when listing is cancelled or sells. |

Action gating (from [src/pages/tickets/TicketDetailPage.tsx](src/pages/tickets/TicketDetailPage.tsx)):

- `canGift` ⇔ `status === 'active' AND !receivedAsGift AND !fromAuction`.
- `canAuction` ⇔ `status === 'active' AND !receivedAsGift AND !fromAuction`.
- `canAct` (Download PDF / Add to Wallet) ⇔ `status === 'active'`.

---

## 7. Ticket Gifting & Direct Transfer

Users can gift (transfer) tickets directly to another person, outside of the auction system.

### Gifting Flow

1. User navigates to their tickets and selects **"Gift Ticket"** on one or more eligible tickets.
2. User enters the recipient's **email address** or **MyTicket username**.
3. The system checks if the recipient has a registered MyTicket account:
   - **If registered:** The gift is processed immediately. The recipient receives the ticket PDF via email + a link to their profile dashboard + in-app notification.
   - **If not registered:** The system sends an **invitation email** to the recipient containing a **registration link**. After the recipient registers, the ticket is **automatically claimed** to their new account.
4. On confirmation:
   - The sender's QR code for that ticket is **immediately invalidated**.
   - A **brand-new QR code** is generated for the recipient with fresh `ticketId`, `secureHash`, and updated ownership.
   - The sender receives a confirmation that the gift was delivered (or is pending registration for unregistered recipients).
5. The gifted ticket appears in the recipient's **My Tickets** section once claimed.

### Gifting Rules

- Only **valid** tickets can be gifted (not expired, not used, not cancelled, not currently listed in auction).
- Gifting is **free** — no platform fee is charged for direct transfers.
- Recipients do **not** need to have an existing MyTicket account. If unregistered, they receive an invitation email with a registration link to claim the ticket.
- Gifting does **not** involve any money exchange — it is a pure ownership transfer at no cost.
- **A gifted ticket cannot be re-gifted.** Once a ticket is received as a gift, the new holder cannot transfer it again to another user.
- **A gifted ticket cannot be listed in the auction.** The recipient must use the ticket themselves or let it expire — they cannot resell it.

### Gift form

Source: `Gift ticket` modal in [src/pages/tickets/TicketDetailPage.tsx](src/pages/tickets/TicketDetailPage.tsx).

| Field | Type | Required | Notes |
|---|---|---|---|
| `recipient` | VARCHAR(255) | Yes | Email or MyTicket username. `trim()` non-empty. Server resolves whether the recipient is registered. |

Server-side effects (per product rules):

- Sender's QR is invalidated immediately.
- A fresh `qrPayload` is issued for the new holder; `tickets.received_as_gift = true`, `tickets.from_auction = false`.
- A `gifts` row is written: `{ id, ticket_id, sender_user_id, recipient_email_or_username, recipient_user_id?, status, sent_at, claimed_at? }`.

---

## 8. Ticket Auction System

When a user can no longer attend an event, they may list their ticket(s) for resale via the platform's internal auction system.

### Auction Rules

- The seller can list a ticket at the **original purchase price or less** — no price increases above the original price are allowed.
- Auction is available **before the event day starts**.
- Once the event day begins, the auction window closes and no new listings are accepted.
- No refunds are available after the auction window closes.
- The auction has a **countdown timer** visible to buyers.
- Users can auction **individual tickets** from a multi-ticket booking — they are not required to auction all tickets at once. The user has full control: selectable, all, single, or custom selection.
- Only **valid** tickets can be listed for auction. Tickets that are expired, already used, or cancelled are not eligible.
- The platform takes a **commission** on auction sales (configurable by Admin). The seller receives the sale price minus the platform commission.
- **Auction-purchased tickets can be re-auctioned** — the buyer can list the ticket for resale again. However, **auction-purchased tickets cannot be gifted** — the buyer must use the ticket or re-auction it.

### Auction Flow

1. User navigates to their tickets and selects "Drop to Auction" on one or more eligible tickets.
2. Each selected ticket is listed individually in the Auction area at its original purchase price.
3. Another user purchases the auctioned ticket.
4. **QR Transfer:** The original seller's QR code is **immediately invalidated**. A **brand-new QR code** with a fresh `ticketId`, `secureHash`, and updated ownership is generated for the buyer. The old QR cannot be used for entry.
5. Original seller receives the sale proceeds automatically (sale price minus platform commission).
6. Buyer receives the newly generated QR ticket via email + in-app notification.
7. If the ticket is not sold before the auction deadline, it expires unsold — no refund issued to the seller.

### Auction UI

- **Auction area** displays event cards.
- Each event card shows the number of tickets currently available for resale.
- Buyers browse available tickets by event.
- Countdown timer displayed per listing and per event card.
- For seated events, the specific seat information (section, row, seat number, ticket type) is visible to potential buyers.

### Auction listing entity (`MockAuctionListing`)

Source: [src/types/domain.ts](src/types/domain.ts) for the `MockAuctionListing` UI shape; live data via `useListAuctionsQuery` / `useGetAuctionQuery` / `usePlaceBidMutation` / `useBuyNowMutation` / `useCreateMyAuctionMutation` / `useCancelAuctionMutation` ([src/api/endpoints/auctions.ts](src/api/endpoints/auctions.ts)), normalised by [src/lib/auctionMappers.ts](src/lib/auctionMappers.ts).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | `auc-{uuid}`. |
| `eventId` | FK → `events.id` | Yes | |
| `ticketId` | FK → `tickets.id` NULL | No | Set when listed from a user-owned ticket; null only for seed/demo listings. |
| `price` | INT (SAR) | Yes | Listing price. Must be `1..ticket.pricePaid` (`originalPrice`). |
| `originalPrice` | INT (SAR) | Yes | Cap = the buyer's original `pricePaid`. |
| `endsAt` | DATETIME (ISO) | Yes | Listing expiry. UI default at list-time = `now + 48h`. |
| `seatLabel` | VARCHAR(80) NULL | No | Cached snapshot of the seat label for seated events. |
| `sellerLabel` | VARCHAR(80) | Yes | Display label such as `Seller ****482`, `You`, or `Former account (demo)` (for account-deletion auto-listings). |
| `eventTitle` | VARCHAR(160) | Yes | Cached snapshot. |
| `city` | VARCHAR(80) | Yes | Cached snapshot. |
| `venue` | VARCHAR(160) | Yes | Cached snapshot. |
| `layoutType` | ENUM('seated','free') | Yes | Cached from event. |

### Drop-to-auction form

Source: `List for auction` modal in [src/pages/tickets/TicketDetailPage.tsx](src/pages/tickets/TicketDetailPage.tsx).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `price` | INT (SAR) | Yes | Range `1 ≤ price ≤ ticket.pricePaid`. Pre-populated with the original price. |
| `endsAt` | DATETIME | Auto | Set by client to `now + 48h` ISO string (demo). Production may make this configurable per Admin. |

### Platform commission

`PLATFORM_AUCTION_COMMISSION_PCT = 8` ([src/lib/constants.ts](src/lib/constants.ts)). Applied on successful auction sales (the seller receives `salePrice * (1 - commissionPct/100)`). Admin-configurable in production.

### Auction lifecycle — server contract (implied)

When a listing sells:

1. New ticket id (or rotated `qrPayload` + ownership) is issued for the buyer; `tickets.from_auction = true`.
2. Original ticket is marked transferred; `auction_listings.status = 'sold'`, `sold_at`, `sold_to_user_id`, `sale_price` recorded.
3. A payout row is created for the seller (sale price minus commission).

Cancellation / expiry:

- Seller cancellation ⇒ `auction_listings.status = 'cancelled'`; ticket flips back to `active`, `listedAuctionId = NULL` (handled by `cancelAuctionForTicket()`).
- Time expiry ⇒ `auction_listings.status = 'expired'`; ticket stays in `auction` until the next worker pass restores it to `active` (or `expired` if event has passed).

---

## 9. Waitlist & Event Reminders

### Waitlist System

- When an event is **sold out**, users can join a **waitlist** for that event.
- The waitlist **auto-notifies** users when tickets become available — either through new auction listings or booking cancellations.
- Notifications are sent in the order users joined the waitlist (first come, first served for notification priority).

### Event Reminders

- The system sends **event reminders** to ticket holders before the event.
- Reminder timing and channels are **configured by the Admin** — the Admin decides which notification channels to use for reminders (email, in-app, push notification, or all).
- Typical reminder intervals: 24 hours before and 1 hour before the event (configurable by Admin).

### Waitlist entity / persistence

- Membership is sourced from `useListMyWaitlistQuery` ([src/api/endpoints/waitlist.ts](src/api/endpoints/waitlist.ts)); join/leave use `useJoinWaitlistMutation` / `useLeaveWaitlistMutation`. The legacy `myticket_waitlist_event_ids` `sessionStorage` key was retired with the mock services.
- Production maps this to a `waitlist_entries` table:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `event_id` | FK → `events.id` | Yes | Unique together with `user_id`. |
| `joined_at` | TIMESTAMP | Yes | Position in queue is by `joined_at` ASC. |
| `notified_at` | TIMESTAMP NULL | No | Last time a "tickets returned" notification was pushed. |

The waitlist generates `notifications` rows of `kind = 'waitlist'` (see §15 Notification entity).

---

## 10. Marketplace — User Side

The Marketplace is the section where Organizers discover Talents and Vendors, and where Talents/Vendors manage their engagement responses.

### Browsing Profiles

- All users can browse **Talent** and **Vendor** profiles in the Marketplace.
- Profiles display: name, bio, location, verification media (Talents), service categories (Vendors), image gallery, ratings, and availability status.
- See `myticket_shared_flow.md` Section 2 for role definitions.

### Talent Profile Requirements

To be listed in the Marketplace, a Talent must complete their profile with:

- **Personal information:** full name, contact details.
- **Bio:** description of their skills, experience, and specialties.
- **Location details** *(optional)*: city/region, willingness to travel — shown publicly only if the Talent opts in.
- **Verification media:** at least one proof of talent — **video** and/or **images** demonstrating their work.
- **Certificate / approval document** *(optional)*: any official certification, license, or credential that validates their talent (e.g., music degree, performer license).

### Vendor Profile Requirements

To be listed in the Marketplace, a Vendor must complete their profile with:

- **Business/personal information:** full name or business name, contact details.
- **Bio:** description of the services offered and experience.
- **Service categories:** the types of services provided (Venue/Place, Security/Guards, Catering/Food, Staffing, Lighting, Sound Systems/AV, or custom).
- **Verification documents** *(required)*: business license, commercial registration, or equivalent proof of legitimacy.
- **Image gallery:** photos of past work, equipment, venues, or service demonstrations.
- **Location details:** city/region and service coverage area.

### Talent/Vendor — Receiving & Responding to Engagements

When an Organizer initiates a chat (from the Organizer Dashboard), the Talent/Vendor side of the conversation appears in the Main Website:

1. Talent/Vendor receives a **notification** that an Organizer has started a chat.
2. The Talent/Vendor can view the Organizer's full profile (organization details, venue, past events, gallery, etc.).
3. All negotiation happens within the **real-time chat** — pricing, terms, scheduling, event details.
4. The Talent/Vendor either **accepts** or **declines** the engagement through the chat.
   - On **accept**: the Talent/Vendor's availability status is automatically changed to **"Reserved"**.
   - On **decline**: the Organizer is notified. No status change occurs.
5. Post-acceptance, the Talent/Vendor can manually update their status back to **"Available"** or any other status at any time.

### Availability Status

| Status | Meaning |
|---|---|
| **Available** | Open to new offers and bookings |
| **Reserved** | Has accepted an offer and is committed (set automatically on accept, changeable by the user) |

### Financial Independence

- The platform does **not** handle, process, or escrow any payments between Talents/Vendors and Organizers.
- All financial arrangements (payment method, timing, invoicing) are handled **directly between the two parties** outside the platform.
- MyTicket's role is strictly limited to **discovery, profile verification, and connection facilitation**.

### Marketplace browse access

Source: [src/lib/marketplaceAccess.ts](src/lib/marketplaceAccess.ts) and `RequireMarketplaceBrowse` route guard.

- `canBrowseMarketplace(user)` ⇔ `user.role === 'organizer' || user.role === 'vendor'`. Guests and Talents are blocked from the `/marketplace` listings (and from clicking through to talent/vendor profiles from the event-detail page).
- `canAccessEngagementsInbox(user)` ⇔ `user.role` ∈ `('talent','vendor','organizer')`.
- "Contact talent" / "Contact vendor" CTA on profile pages is rendered **only** for `role === 'organizer'` (calls `useCreateEngagementMutation` in [src/api/endpoints/engagements.ts](src/api/endpoints/engagements.ts)).

### Talent entity (`MarketplaceTalent`)

Source: [src/types/domain.ts](src/types/domain.ts), seed in [src/data/mockMarketplace.ts](src/data/mockMarketplace.ts).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `slug` | VARCHAR(80) UNIQUE | Yes | URL slug used by `/artists/:slug` redirects (see `findTalentByArtistParam`). |
| `name` | VARCHAR(120) | Yes | |
| `bio` | TEXT | Yes | 30–500 chars (`TALENT_BIO_MIN/MAX_CHARS`). |
| `city` | VARCHAR(80) | Yes | Saudi city (talent profile is Saudi-region-aware). |
| `categories` | JSON (string[]) | Yes (≥1) | Free-text tags shown on cards (e.g. `Music`, `R&B`, `DJ`, `Comedy`). Becomes `talent_categories` link table. |
| `rating` | DECIMAL(2,1) | Yes | Average rating; see §11. |
| `image` | VARCHAR(500) | Yes | Profile image URL. |
| `gallery` | JSON (string[]) | Yes (may be `[]`) | Portfolio images. Becomes `talent_gallery` rows. |
| `availability` | ENUM(`TalentAvailability`) | Yes | `available | reserved`. Persisted client-side under `myticket_talent_availability`. |

### Vendor entity (`MarketplaceVendor`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `slug` | VARCHAR(80) UNIQUE | Yes | |
| `name` | VARCHAR(160) | Yes | Business or personal name. |
| `bio` | TEXT | Yes | 25–500 chars (`VENDOR_BIO_MIN_CHARS..TALENT_BIO_MAX_CHARS`). |
| `city` | VARCHAR(80) | Yes | |
| `serviceCategories` | JSON (string[]) | Yes (≥1) | Free-text categories (`Catering/Food`, `Security/Guards`, `Lighting`, `Sound Systems/AV`, …). Becomes `vendor_service_categories` link table. |
| `rating` | DECIMAL(2,1) | Yes | |
| `image` | VARCHAR(500) | Yes | |
| `gallery` | JSON (string[]) | Yes (may be `[]`) | |

### Talent onboarding wizard (3 steps)

Sources: [src/components/auth/steps/TalentSteps.tsx](src/components/auth/steps/TalentSteps.tsx), `TalentOnboardingDraft` in [src/types/domain.ts](src/types/domain.ts), validation in [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) (`isTalentDraftReady`).

#### Step 1 — Talent profile

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `fullName` | VARCHAR(120) | Yes | Pre-filled from registration `fullName`. `trim().length >= 3`. |
| `contactEmail` | VARCHAR(255) | Yes | Pre-filled from registration. Must contain `@`. |
| `contactPhone` | VARCHAR(20) | Yes | Saudi `+966` format. |
| `profileImage` | VARCHAR(500) | No | Avatar URL or data URL from upload. ≤ 2 MB image; uploaded via `ProfileImageAvatarInput`. |
| `bio` | TEXT | Yes | 30–500 chars (`TALENT_BIO_MIN_CHARS..TALENT_BIO_MAX_CHARS`). |

#### Step 2 — Verification uploads

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `verificationMedia` | JSON (string[]) | Yes (≥1) | Each item is either a URL (`https://…`) or a tagged file reference. Tag prefixes used today: `video:`, `image:`, `certificate:`. |
| `certificateName` | VARCHAR(160) | No | Optional credential title. |

#### Step 3 — Preferences

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `saudiRegionId` | VARCHAR(20) | Yes | Must be one of `SAUDI_REGIONS.id`. |
| `city` | VARCHAR(80) | Yes | Must be a city of `saudiRegionId` (validated via `isValidSaudiCity`). |
| `travelReady` | BOOLEAN | No | Optional; "willing to travel" marker. |
| `locationPublic` | BOOLEAN | No | If `true`, city is shown publicly on the marketplace. |
| `acceptedQualityDisclaimer` | BOOLEAN | Yes | Must be `true` to submit; records consent to upload-quality requirements. |

### Vendor onboarding wizard (3 steps)

Sources: [src/components/auth/steps/VendorSteps.tsx](src/components/auth/steps/VendorSteps.tsx), `VendorOnboardingDraft` in [src/types/domain.ts](src/types/domain.ts), validation `isVendorDraftReady`.

#### Step 1 — Vendor profile

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `profileName` | VARCHAR(160) | Yes | `trim().length >= 2`. |
| `contactEmail` | VARCHAR(255) | Yes | Pre-filled from registration. |
| `contactPhone` | VARCHAR(20) | Yes | Saudi `+966` format. |
| `bio` | TEXT | Yes | 25–500 chars. |

#### Step 2 — Services

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `serviceCategories` | JSON (string[]) | Yes (≥1) | Free-text tags entered by the vendor. |

#### Step 3 — Compliance

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `verificationDocuments` | JSON (string[]) | Yes (≥1) | URLs or tagged file refs (`document:`). At least one license/business doc required. |
| `gallery` | JSON (string[]) | No | Past-work / equipment images. |
| `city` | VARCHAR(80) | Yes | Saudi city. The form derives the region from the chosen city in the same lookup. |
| `coverageArea` | VARCHAR(160) | No | Free text (e.g. "Riyadh + Eastern Province"). |

### Organizer onboarding wizard (4 steps)

Sources: [src/components/auth/steps/OrganizerSteps.tsx](src/components/auth/steps/OrganizerSteps.tsx), `OrganizerOnboardingDraft` in [src/types/domain.ts](src/types/domain.ts), validation `isOrganizerDraftReady`.

#### Step 1 — Public profile

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `displayName` | VARCHAR(160) | Yes | `trim().length >= 2`. |
| `profileImage` | VARCHAR(500) | No | Same upload constraints as Talent. |
| `bio` | TEXT | Yes | 30–500 chars. |

#### Step 2 — Contacts

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `email` | VARCHAR(255) | Yes | Must contain `@`. |
| `contactPhone` | VARCHAR(20) | No | Saudi `+966` format if provided. |
| `location` | VARCHAR(160) | Yes | Stored as `"<Region name> · <City>"` (e.g. `Riyadh Region · Riyadh`). `trim().length >= 2`. |
| `optionalDocument` | VARCHAR(500) | No | URL or `document:<filename>` tag. |

#### Step 3 — Entity details

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `isCompany` | BOOLEAN | Yes | Toggles the company-only fields. |
| `companyName` | VARCHAR(160) | Yes when `isCompany` | `trim().length >= 2`. |
| `companyInfo` | TEXT | Yes when `isCompany` | `trim().length >= 10`. |
| `ownerName` | VARCHAR(160) | Yes | `trim().length >= 2`. |
| `ownerInfo` | TEXT | Yes | `trim().length >= 10`. |

#### Step 4 — Social

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `socialLinks` | JSON (string[]) | No | URLs (Instagram, X, etc.). Becomes `organizer_social_links` rows. |

### Engagement entity (`MockEngagement`)

Source: [src/types/domain.ts](src/types/domain.ts) for the UI shape; live data via `useListEngagementsQuery` / `useCreateEngagementMutation` / `useAcceptEngagementMutation` / `useDeclineEngagementMutation` / `usePostEngagementMessageMutation` / `useCompleteEngagementMutation` ([src/api/endpoints/engagements.ts](src/api/endpoints/engagements.ts)).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | e.g. `eng-1`, `eng-org-{ts}-{rand}` for organizer-initiated chats. |
| `organizerName` | VARCHAR(160) | Yes | Cached display name of the requester (organizer side). |
| `organizerId` | FK → `users.id` (organizer) | Yes | Demo seeds use `org-self-…` slugs. |
| `topic` | VARCHAR(255) | Yes | E.g. `Talent inquiry: <name>`, `Vendor inquiry: <name>`, or a free-form subject. Used as a uniqueness key for organizer-initiated threads. |
| `preview` | VARCHAR(500) | Yes | First-message excerpt. |
| `status` | ENUM(`EngagementStatus`) | Yes | `pending | accepted | declined`. On `accepted`, the responding talent is auto-marked `availability='reserved'`. |
| `createdAt` | TIMESTAMP | Yes | |
| `organizerProfile` | OBJECT (`MockOrganizerProfile`) | Yes | Snapshot — see below. |
| `messages[]` | ARRAY of `MockEngagementMessage` | Yes | Thread payload. |

#### Organizer profile snapshot (`MockOrganizerProfile`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) | Yes | |
| `name` | VARCHAR(160) | Yes | |
| `bio` | TEXT | Yes | |
| `city` | VARCHAR(80) | Yes | |
| `organizerType` | VARCHAR(80) | Yes | E.g. `Festival Organizer`, `Tour Producer`, `Event Organizer`. |
| `recentEvents` | JSON (string[]) | Yes (may be `[]`) | Cached list of recent event titles. |

#### Engagement message (`MockEngagementMessage`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | E.g. `eng-1-msg-1`, `eng-1-msg-{ts}`. |
| `engagement_id` | FK → `engagements.id` | Yes | (implicit in nesting). |
| `sender` | ENUM('organizer','talent') | Yes | "talent" is also used for vendor responses today; future split: `('organizer','talent','vendor')`. |
| `text` | TEXT | Yes | `trim()` non-empty before send. |
| `createdAt` | TIMESTAMP | Yes | |

---

## 11. Ratings

The platform uses a **star rating system only** — there are no written text reviews.

### Event Ratings

- Users who **attended an event** (ticket status = USED) can leave a **star rating** for the event after it concludes.
- The average star rating is displayed on the event page for future reference.

### Talent & Vendor Ratings (Mutual)

- **Organizers** can rate Talents and Vendors they have hired through the Marketplace.
- **Talents and Vendors** can rate Organizers they have worked with.
- Ratings are displayed on the respective Marketplace profiles and contribute to overall reputation.

### Rating Rules

- Ratings are available **only after** an event is attended (ticket USED) or after a hiring engagement is completed.
- Each user can rate only **once** per event or per engagement.
- Ratings are **public** and visible on the relevant profile or event page.

### Event rating form

Source: `Rate this event` block in [src/pages/events/EventDetailPage.tsx](src/pages/events/EventDetailPage.tsx) wired to `useSubmitRatingMutation` / `useListMyRatingsQuery` / `useUpdateMyRatingMutation` / `useDeleteMyRatingMutation` ([src/api/endpoints/ratings.ts](src/api/endpoints/ratings.ts)).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `stars` | TINYINT | Yes | Integer in `1..5`. Click on a star button to submit. |

Server contract:

- Uniqueness key: `(user_id, event_id)` — see `submitRating()` returning `false` if already rated.
- Rating storage today (frontend): `localStorage` key `myticket_event_ratings_v1` with shape `{ sums, counts, byUser, seeded }`.
- **Seed blend (display only)**: when an event has a non-null seeded `rating`, `getDisplayRating()` adds `rating * 12` to `sums` and `12` to `counts` once (`seeded` flag) so new events display a stable initial score before the first real rating.
- The Rate button only shows when the user has at least one ticket of `status='used'` for that event — derived in `EventDetailPage` from `useListMyTicketsQuery`.

### Ratings entity (`ratings`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `target_type` | ENUM('event','talent','vendor','organizer') | Yes | Today only `'event'` is wired; `talent`/`vendor`/`organizer` are placeholder UI. |
| `target_id` | VARCHAR(40) | Yes | The id of the rated entity. |
| `stars` | TINYINT | Yes | 1–5. |
| `created_at` | TIMESTAMP | Yes | |

Unique index: `(user_id, target_type, target_id)`.

### Mutual ratings (Talent/Vendor ↔ Organizer) — placeholder

The Marketplace profile pages render a disabled "Mutual ratings after completed work" CTA (see [src/pages/marketplace/TalentProfilePage.tsx](src/pages/marketplace/TalentProfilePage.tsx) and [src/pages/marketplace/VendorProfilePage.tsx](src/pages/marketplace/VendorProfilePage.tsx)). The DB design must support these even though they are not yet writable from the UI — covered by the same `ratings` table above with `target_type` ∈ `('talent','vendor','organizer')` and a uniqueness key per completed engagement (`engagement_id`) when introduced.

---

## 12. Event Sharing & Social

### Sharing Options

- Every event has **shareable links** that users can distribute through:
  - **Social media platforms** — direct sharing to popular platforms (Twitter/X, WhatsApp, Instagram, etc.).
  - **In-platform sharing** — users can share event links or invite friends directly within MyTicket.
  - **Copy link** — generate a shareable URL for any channel.

### Implemented share targets

`ShareRow` in [src/pages/events/EventDetailPage.tsx](src/pages/events/EventDetailPage.tsx) currently wires:

| Target | Mechanism |
|---|---|
| Copy link | `navigator.clipboard.writeText(url)` with a 2 s "Copied!" confirmation. |
| X / Twitter | `https://twitter.com/intent/tweet?url={url}&text={title}`. |
| WhatsApp | `https://wa.me/?text={title}%20{url}`. |
| Email | `mailto:?subject={title}&body={title}%0A{url}`. |
| Native share | `navigator.share({ title, url })` — falls back to copy when unavailable. |

No persistence is required for sharing. (Instagram is mentioned in product copy but is not wired on the client today.)

---

## 13. Profile & Account Management

### Profile Management

- See `myticket_shared_flow.md` Section 3.8 for profile editing, re-verification, and future ID verification.
- The page is tabbed: `info | preferences | security | roles | danger` — see [src/pages/profile/ProfilePage.tsx](src/pages/profile/ProfilePage.tsx). Organizer users are redirected to `/organizer-portal` instead.

#### Profile info form (`info` tab)

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `name` | VARCHAR(120) | Yes | Display name. |
| `email` | VARCHAR(255) | Yes | |
| `phone` | VARCHAR(20) | No | Stored with `+966` country code prefix; UI exposes only the local number. |
| `region` | VARCHAR(20) | No | Saudi region id (one of `SAUDI_REGIONS.id`). Changing it clears `city`. |
| `city` | VARCHAR(80) | No | Must be one of the cities of the chosen region. |
| `bio` | TEXT | No | Free-form. |
| `profileImage` | VARCHAR(500) | No | URL or data URL; ≤ 2 MB image. |

#### Preferences form (`preferences` tab)

Maps to `users.preferences` (or a normalized `user_preferences` row).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `language` | ENUM('en','ar') | Yes | Default `en`. |
| `theme` | ENUM('system','light','dark') | Yes | Default `system`. |
| `emailNotifications` | BOOLEAN | Yes | Default `true`. |
| `pushNotifications` | BOOLEAN | Yes | Default `true`. |
| `smsNotifications` | BOOLEAN | Yes | Default `false`. |
| `marketingEmails` | BOOLEAN | Yes | Default `false`. |

#### Security form (`security` tab)

Maps to `users.security` (or a normalized `user_security` row).

| Field | Type | Required | Notes |
|---|---|---|---|
| `twoFactorEnabled` | BOOLEAN | Yes | Default `false`. |
| `lastPasswordChangedAt` | TIMESTAMP | Yes | Updated by `changePasswordMock()` and the standard password-change flow. |

The "Change password" action triggers the password-update endpoint (out of band from this form).

### Role Application Flow

1. User registers as Guest (default role upon registration).
2. User submits a role application (Talent, Vendor, or Organizer) with supporting documents.
3. Admin reviews and approves or rejects the application (in Admin Dashboard).
4. On approval: role is granted **permanently** and user receives email + in-app notification. The role **cannot be changed** after approval.
5. On rejection: user receives email + in-app notification with reason. The user may revise and resubmit.
6. **Talent profiles** are subject to admin review — a **disclaimer about upload quality** is shown to Talents during profile setup (e.g., minimum resolution, clear content, professional presentation).

#### Role-onboarding state machine

The same five-state machine governs all three role applications (Talent, Vendor, Organizer). Source: `RoleOnboardingStatus` / `TalentApplicationStatus` in [src/types/domain.ts](src/types/domain.ts).

| Status | Meaning | Allowed transitions |
|---|---|---|
| `not_started` | User has not opened the wizard. | → `draft` (on save). |
| `draft` | Wizard in progress; saved locally. | → `submitted` (on submit). |
| `submitted` | Awaiting admin review. | → `approved` or `rejected` (Admin action). |
| `approved` | Role granted; `users.role` updated. | Terminal (role cannot be revoked from this side). |
| `rejected` | Sent back with `rejectionReason`. | → `draft` (`resetRoleOnboardingForResubmit`) → `submitted`. |

Per-application metadata stored alongside the draft: `submittedAt` (TIMESTAMP), `rejectionReason` (TEXT NULL).

### Account Deletion

Users can request to **delete their account** from the platform. Deletion results in **permanent loss of all account data**.

**Pre-Deletion Disclaimer:**

Before deletion, the system displays a **disclaimer alert** warning the user:

- All personal data, profile information, and account history will be **permanently deleted**.
- All **valid/active tickets** will be **automatically sent to the auction** for re-sell. The user may recover value if the tickets sell before the auction deadline.
- Tickets **already listed in auction** (pending auctions) will **not be affected** — they continue as-is until sold or expired.
- This action is **irreversible**. This policy is also documented in the **Terms of Service**.

**Deletion Execution:**

1. User reviews the disclaimer and acknowledges the consequences.
2. User confirms account deletion.
3. The system **automatically lists all valid/active tickets** in the auction for re-sell.
4. Account data is permanently removed (personal info, profile, credentials).
5. The user receives a final confirmation email that their account has been deleted.
6. Auction proceeds from any sold tickets are processed according to the standard auction flow (minus platform commission).

#### Auto-listing defaults (account deletion)

Account deletion is handled server-side via `DELETE /me` (`useDeleteMeMutation` in [src/api/endpoints/me.ts](src/api/endpoints/me.ts)). The server-side worker iterates the user's tickets where `status='active'` and creates auction listings with:

- `price = ticket.price_paid` (original).
- `ends_at = now + 7 days`.
- `seller_label = 'Former account'`.

The worker runs inside a transaction with the user-deletion job and skips ineligible tickets (gifted / from-auction). The response payload carries the `queued_resales` count for the UI receipt.

---

## 14. Support — User Side

### Chat Support

- The platform provides an **open chat support** feature accessible to all registered users.
- Users can initiate a live chat session with the support team for real-time assistance with any issue: event problems, ticket issues, technical bugs, disputes with organizers, etc.

### Text Box (Offline Support)

- In addition to live chat, users can submit a **text-based support message** describing their issue.
- This is useful when live support is unavailable or when the user prefers asynchronous communication.
- Each message is submitted to the **Admin support dashboard**.

### Status Updates

- Users receive a notification when their support request is reviewed or resolved.

### Support ticket form

Source: [src/pages/support/SupportPage.tsx](src/pages/support/SupportPage.tsx) ("Submit a request" tab).

| Field | Type | Required | Notes/Validation |
|---|---|---|---|
| `category` | ENUM(`SupportCategory`) | Yes | One of: `technical | ticket | dispute_organizer | account | other`. |
| `subject` | VARCHAR(160) | Yes | `trim()` non-empty. |
| `orderRef` | VARCHAR(40) | No | Optional, format `ORD-…`. Linked to `orders.reference` when present. |
| `message` | TEXT | Yes | `trim()` non-empty. |

On submit, the page emits a synthetic notification (`kind = 'support'`) with title `Support ticket received` and a confirmation `caseId` of the form `CSE-{randint}`. Production should write to a `support_cases` table.

### Support chat message (`SupportChatMessage`)

Stored in `localStorage` under `myticket_support_chat_thread`; persists per user in production as the `support_chat_messages` table.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | Generated via `crypto.randomUUID()`. |
| `role` | ENUM('user','agent') | Yes | "user" = customer, "agent" = support staff/bot. |
| `text` | TEXT | Yes | `trim()` non-empty. |
| `createdAt` | TIMESTAMP | Yes | ISO. |

#### Demo agent reply latency

The page schedules a stub agent acknowledgement via `setTimeout(…, 1800)` — i.e. **~1.8 s after the user's first message**. Replace with the real bot/agent dispatcher in production.

---

## 15. Data Model — Entity Reference

This is the canonical, code-derived entity catalogue for the Main Website. Use these tables as the seed for the future MySQL schema. Types use SQL-friendly names (TS literal-union types ⇒ `ENUM(…)`). PK / FK relationships are stated where they apply.

### 15.1 `users`

Source: `MockUser` in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `email` | VARCHAR(255) UNIQUE | Yes | |
| `password_hash` | VARCHAR(255) | Yes (for password users) | Hashed (e.g. argon2). Optional for OAuth-only accounts. |
| `name` | VARCHAR(120) | Yes | |
| `role` | ENUM('guest','talent','vendor','organizer') | Yes | Default `guest`. |
| `phone` | VARCHAR(20) | No | Saudi `+966` prefixed format. |
| `city` | VARCHAR(80) | No | |
| `region` | VARCHAR(20) | No | One of `SAUDI_REGIONS.id`. |
| `bio` | TEXT | No | |
| `profile_image` | VARCHAR(500) | No | URL or storage key. |
| `created_at` | TIMESTAMP | Yes | |
| `updated_at` | TIMESTAMP | Yes | |

### 15.2 `user_preferences` (1:1 with users)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | FK → `users.id` PK | Yes | |
| `language` | ENUM('en','ar') | Yes | Default `en`. |
| `theme` | ENUM('system','light','dark') | Yes | Default `system`. |
| `email_notifications` | BOOLEAN | Yes | Default `true`. |
| `push_notifications` | BOOLEAN | Yes | Default `true`. |
| `sms_notifications` | BOOLEAN | Yes | Default `false`. |
| `marketing_emails` | BOOLEAN | Yes | Default `false`. |

### 15.3 `user_security` (1:1 with users)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | FK → `users.id` PK | Yes | |
| `two_factor_enabled` | BOOLEAN | Yes | Default `false`. |
| `last_password_changed_at` | TIMESTAMP | Yes | |

### 15.4 `oauth_identities`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `provider` | ENUM('google') | Yes | Extensible (Apple, Facebook, …). |
| `provider_user_id` | VARCHAR(128) | Yes | |
| `linked_at` | TIMESTAMP | Yes | |

Unique: `(provider, provider_user_id)`.

### 15.5 `password_reset_tokens`

Inferred from the `?token=…` URL parameter handled by [src/pages/auth/ResetPasswordPage.tsx](src/pages/auth/ResetPasswordPage.tsx).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `token_hash` | VARCHAR(128) | Yes | Store hashed; raw token only emailed once. |
| `expires_at` | TIMESTAMP | Yes | E.g. 1h. |
| `used_at` | TIMESTAMP NULL | No | Single-use enforcement. |
| `created_at` | TIMESTAMP | Yes | |

### 15.6 `talent_applications`

Source: `RoleOnboardingRecord<TalentOnboardingDraft>` (the talent-specific fields live as denormalized columns of `talentSubmittedAt`, `talentRejectedReason`, `talentApplicationStatus`).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `status` | ENUM('not_started','draft','submitted','approved','rejected') | Yes | |
| `full_name` | VARCHAR(120) | Yes | |
| `contact_email` | VARCHAR(255) | Yes | |
| `contact_phone` | VARCHAR(20) | Yes | |
| `profile_image` | VARCHAR(500) | No | |
| `bio` | TEXT | Yes | 30–500 chars. |
| `saudi_region_id` | VARCHAR(20) | Yes | |
| `city` | VARCHAR(80) | Yes | |
| `travel_ready` | BOOLEAN | No | |
| `location_public` | BOOLEAN | No | |
| `certificate_name` | VARCHAR(160) | No | |
| `accepted_quality_disclaimer` | BOOLEAN | Yes | |
| `submitted_at` | TIMESTAMP NULL | No | |
| `rejection_reason` | TEXT NULL | No | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.7 `talent_verification_media`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `application_id` | FK → `talent_applications.id` | Yes | |
| `kind` | ENUM('url','video','image','certificate') | Yes | Derived from `video:`/`image:`/`certificate:` prefix; bare URLs ⇒ `url`. |
| `value` | VARCHAR(500) | Yes | URL or file storage key. |
| `position` | TINYINT | Yes | Display order. |

### 15.8 `vendor_applications`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `status` | ENUM('not_started','draft','submitted','approved','rejected') | Yes | |
| `profile_name` | VARCHAR(160) | Yes | |
| `contact_email` | VARCHAR(255) | Yes | |
| `contact_phone` | VARCHAR(20) | Yes | |
| `bio` | TEXT | Yes | 25–500 chars. |
| `city` | VARCHAR(80) | Yes | |
| `coverage_area` | VARCHAR(160) | No | |
| `submitted_at` | TIMESTAMP NULL | No | |
| `rejection_reason` | TEXT NULL | No | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.9 `vendor_service_categories` (link)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `application_id` | FK → `vendor_applications.id` | Yes | |
| `category` | VARCHAR(80) | Yes | Free-text tag (denormalized). Future: `category_id` FK to a managed list. |

### 15.10 `vendor_verification_documents`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `application_id` | FK → `vendor_applications.id` | Yes | |
| `kind` | ENUM('url','document') | Yes | `document:` prefix ⇒ `document`. |
| `value` | VARCHAR(500) | Yes | |
| `position` | TINYINT | Yes | |

### 15.11 `vendor_gallery`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `application_id` | FK → `vendor_applications.id` | Yes | |
| `image` | VARCHAR(500) | Yes | |
| `position` | TINYINT | Yes | |

### 15.12 `organizer_applications`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `status` | ENUM('not_started','draft','submitted','approved','rejected') | Yes | |
| `display_name` | VARCHAR(160) | Yes | |
| `profile_image` | VARCHAR(500) | No | |
| `bio` | TEXT | Yes | 30–500 chars. |
| `email` | VARCHAR(255) | Yes | |
| `contact_phone` | VARCHAR(20) | No | |
| `location` | VARCHAR(160) | Yes | `"<Region> · <City>"`. |
| `optional_document` | VARCHAR(500) | No | |
| `is_company` | BOOLEAN | Yes | |
| `company_name` | VARCHAR(160) | When `is_company` | |
| `company_info` | TEXT | When `is_company` | |
| `owner_name` | VARCHAR(160) | Yes | |
| `owner_info` | TEXT | Yes | |
| `submitted_at` | TIMESTAMP NULL | No | |
| `rejection_reason` | TEXT NULL | No | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.13 `organizer_social_links`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `application_id` | FK → `organizer_applications.id` | Yes | |
| `url` | VARCHAR(500) | Yes | |
| `position` | TINYINT | Yes | |

### 15.14 `organizers` (approved profile, owned by Organizer Portal)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | E.g. `org-1`. |
| `user_id` | FK → `users.id` | Yes | |
| `display_name` | VARCHAR(160) | Yes | |
| `bio` | TEXT | Yes | |
| `logo` | VARCHAR(500) | No | |
| `city` | VARCHAR(80) | Yes | |
| `organizer_type` | VARCHAR(80) | Yes | E.g. `Festival Organizer`. |

### 15.15 `talents` (approved marketplace profile)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `slug` | VARCHAR(80) UNIQUE | Yes | |
| `name` | VARCHAR(120) | Yes | |
| `bio` | TEXT | Yes | |
| `city` | VARCHAR(80) | Yes | |
| `image` | VARCHAR(500) | Yes | |
| `availability` | ENUM('available','reserved') | Yes | |

### 15.16 `talent_categories` (link)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `talent_id` | FK → `talents.id` | Yes | |
| `category` | VARCHAR(80) | Yes | |

### 15.17 `talent_gallery`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `talent_id` | FK → `talents.id` | Yes | |
| `image` | VARCHAR(500) | Yes | |
| `position` | TINYINT | Yes | |

### 15.18 `vendors` (approved marketplace profile)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `slug` | VARCHAR(80) UNIQUE | Yes | |
| `name` | VARCHAR(160) | Yes | |
| `bio` | TEXT | Yes | |
| `city` | VARCHAR(80) | Yes | |
| `image` | VARCHAR(500) | Yes | |

### 15.19 `events` (owned by Organizer Portal; consumed here)

Mirrors `MockEvent`. See §4 for column-level docs.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `organizer_id` | FK → `organizers.id` | Yes | |
| `title` | VARCHAR(160) | Yes | |
| `excerpt` | VARCHAR(255) | Yes | |
| `description` | TEXT | Yes | |
| `cover_image` | VARCHAR(500) | Yes | |
| `category` | VARCHAR(64) | Yes | |
| `city` | VARCHAR(80) | Yes | |
| `venue` | VARCHAR(160) | Yes | |
| `lat` | DECIMAL(10,7) NULL | No | |
| `lng` | DECIMAL(10,7) NULL | No | |
| `date_start` | DATETIME | Yes | |
| `date_end` | DATETIME | Yes | |
| `price_min` | INT | Yes | |
| `price_max` | INT | Yes | |
| `tickets_left` | INT | Yes | Aggregate from `event_ticket_types.remaining`. |
| `layout_type` | ENUM('seated','free') | Yes | |
| `featured` | BOOLEAN | Yes | |
| `rating` | DECIMAL(2,1) NULL | No | Seeded prior. |
| `attending_count` | INT | No | |
| `organizer_notes` | TEXT NULL | No | |
| `video_url` | VARCHAR(500) NULL | No | |
| `show_talents` | BOOLEAN | Yes | |
| `show_vendors` | BOOLEAN | Yes | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.20 `event_gallery`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `event_id` | FK → `events.id` | Yes | |
| `kind` | ENUM('gallery','venue_image','attendee_avatar') | Yes | Three logical buckets used in the UI. |
| `image` | VARCHAR(500) | Yes | |
| `position` | TINYINT | Yes | |

### 15.21 `event_ticket_types`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | E.g. `tt-1a`. |
| `event_id` | FK → `events.id` | Yes | |
| `name` | VARCHAR(80) | Yes | |
| `price` | INT | Yes | SAR. `0` ⇒ free. |
| `remaining` | INT | Yes | Updated atomically on hold/checkout. |
| `position` | TINYINT | Yes | UI ordering. |

### 15.22 `event_talents` (link)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `event_id` | FK → `events.id` | Yes | |
| `talent_id` | FK → `talents.id` | Yes | |
| `proficiency` | VARCHAR(80) NULL | No | E.g. "Headliner DJ". |
| `position` | TINYINT | Yes | |

### 15.23 `event_vendors` (link)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `event_id` | FK → `events.id` | Yes | |
| `vendor_id` | FK → `vendors.id` | Yes | |
| `service_type` | VARCHAR(80) | Yes | Free-text label (e.g. "Catering"). |
| `position` | TINYINT | Yes | |

### 15.24 `seats`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(80) PK | Yes | Composite id (see §5). |
| `event_id` | FK → `events.id` | Yes | |
| `ticket_type_id` | FK → `event_ticket_types.id` | Yes | |
| `label` | VARCHAR(40) | Yes | |
| `section` | VARCHAR(8) | Yes | |
| `row` | TINYINT UNSIGNED | Yes | |
| `number` | TINYINT UNSIGNED | Yes | |
| `position_x` | DECIMAL(6,2) NULL | No | |
| `position_y` | DECIMAL(6,2) NULL | No | |
| `position_z` | DECIMAL(6,2) NULL | No | |
| `status` | ENUM('available','held','booked') | Yes | Default `available`. |

### 15.25 `seat_locks`

See §5 for semantics.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `seat_id` | FK → `seats.id` | Yes | One active lock per seat. |
| `held_by_user_id` | FK → `users.id` | Yes | |
| `held_for_order_id` | FK → `orders.id` NULL | No | |
| `expires_at` | TIMESTAMP | Yes | |
| `released_reason` | ENUM('paid','timeout','payment_failed','race_condition','user_abandoned') NULL | No | |
| `created_at` | TIMESTAMP | Yes | |

### 15.26 `orders`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `reference` | VARCHAR(40) UNIQUE | Yes | `ORD-{base36-timestamp}`. |
| `user_id` | FK → `users.id` | Yes | |
| `event_id` | FK → `events.id` | Yes | |
| `ticket_type_id` | FK → `event_ticket_types.id` NULL | No | NULL for mixed-tier (seated multi-pick) orders. |
| `qty` | TINYINT UNSIGNED | Yes | |
| `subtotal` | INT | Yes | SAR. |
| `fees` | INT | Yes | 5 % demo. |
| `total` | INT | Yes | |
| `payment_method` | ENUM('visa','mastercard','mada') | Yes | |
| `payment_card_last4` | CHAR(4) | Yes | |
| `payment_status` | ENUM('authorizing','three_ds','approved','declined') | Yes | |
| `created_at` | TIMESTAMP | Yes | |

### 15.27 `tickets`

Mirrors `MockTicket`. See §6 for column-level docs.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | `tix-{uuid}`. |
| `order_id` | FK → `orders.id` | Yes | |
| `order_ref` | VARCHAR(40) | Yes | Cached `orders.reference`. |
| `user_id` | FK → `users.id` | Yes | Current holder. |
| `event_id` | FK → `events.id` | Yes | |
| `ticket_type_id` | FK → `event_ticket_types.id` | Yes | |
| `seat_id` | FK → `seats.id` NULL | No | |
| `event_title_cache` | VARCHAR(160) | Yes | |
| `venue_cache` | VARCHAR(160) | Yes | |
| `city_cache` | VARCHAR(80) | Yes | |
| `date_start_cache` | DATETIME | Yes | |
| `date_end_cache` | DATETIME | Yes | |
| `seat_label_cache` | VARCHAR(80) NULL | No | |
| `type_name_cache` | VARCHAR(80) | Yes | |
| `qr_payload` | VARCHAR(255) NULL | No | Rotates on transfers. |
| `price_paid` | INT | Yes | |
| `status` | ENUM('active','auction','gifted','used','expired','cancelled') | Yes | |
| `counts_for_overlap` | BOOLEAN | Yes | Default `true`. |
| `received_as_gift` | BOOLEAN | Yes | Default `false`. |
| `from_auction` | BOOLEAN | Yes | Default `false`. |
| `listed_auction_id` | FK → `auction_listings.id` NULL | No | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.28 `gifts`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `ticket_id` | FK → `tickets.id` | Yes | |
| `sender_user_id` | FK → `users.id` | Yes | |
| `recipient_email_or_username` | VARCHAR(255) | Yes | Raw input. |
| `recipient_user_id` | FK → `users.id` NULL | No | Resolved post-claim. |
| `status` | ENUM('pending','claimed','expired','cancelled') | Yes | |
| `sent_at` | TIMESTAMP | Yes | |
| `claimed_at` | TIMESTAMP NULL | No | |

### 15.29 `auction_listings`

Mirrors `MockAuctionListing`. See §8 for docs.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | `auc-{uuid}`. |
| `event_id` | FK → `events.id` | Yes | |
| `ticket_id` | FK → `tickets.id` NULL | No | |
| `seller_user_id` | FK → `users.id` | Yes | |
| `seller_label` | VARCHAR(80) | Yes | Display label. |
| `price` | INT | Yes | |
| `original_price` | INT | Yes | |
| `ends_at` | DATETIME | Yes | |
| `status` | ENUM('active','sold','cancelled','expired','removed') | Yes | |
| `sold_to_user_id` | FK → `users.id` NULL | No | |
| `sale_price` | INT NULL | No | |
| `commission_pct` | TINYINT UNSIGNED | Yes | Default 8 (`PLATFORM_AUCTION_COMMISSION_PCT`). |
| `seat_label_cache` | VARCHAR(80) NULL | No | |
| `event_title_cache` | VARCHAR(160) | Yes | |
| `city_cache` | VARCHAR(80) | Yes | |
| `venue_cache` | VARCHAR(160) | Yes | |
| `layout_type_cache` | ENUM('seated','free') | Yes | |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.30 `waitlist_entries`

See §9.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `event_id` | FK → `events.id` | Yes | Unique with `user_id`. |
| `joined_at` | TIMESTAMP | Yes | |
| `notified_at` | TIMESTAMP NULL | No | |

### 15.31 `ratings`

See §11.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | BIGINT PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `target_type` | ENUM('event','talent','vendor','organizer') | Yes | |
| `target_id` | VARCHAR(40) | Yes | |
| `engagement_id` | FK → `engagements.id` NULL | No | Required for mutual ratings (talent/vendor/organizer). |
| `stars` | TINYINT | Yes | 1–5. |
| `created_at` | TIMESTAMP | Yes | |

Unique: `(user_id, target_type, target_id, COALESCE(engagement_id, 0))`.

### 15.32 `engagements`

Mirrors `MockEngagement`. See §10.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `organizer_user_id` | FK → `users.id` | Yes | |
| `target_type` | ENUM('talent','vendor') | Yes | |
| `target_id` | VARCHAR(40) | Yes | FK to `talents.id` or `vendors.id` depending on `target_type`. |
| `topic` | VARCHAR(255) | Yes | |
| `preview` | VARCHAR(500) | Yes | |
| `status` | ENUM('pending','accepted','declined') | Yes | |
| `organizer_profile_snapshot` | JSON | Yes | Cached `MockOrganizerProfile`. |
| `created_at` | TIMESTAMP | Yes | |
| `updated_at` | TIMESTAMP | Yes | |

### 15.33 `engagement_messages`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `engagement_id` | FK → `engagements.id` | Yes | |
| `sender` | ENUM('organizer','talent','vendor') | Yes | |
| `text` | TEXT | Yes | |
| `created_at` | TIMESTAMP | Yes | |

### 15.34 `notifications`

Mirrors `MockNotification`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `kind` | ENUM('order','waitlist','support','gift','general') | Yes | |
| `title` | VARCHAR(160) | Yes | |
| `body` | TEXT | Yes | |
| `href` | VARCHAR(500) NULL | No | In-app deep link. |
| `read` | BOOLEAN | Yes | Default `false`. |
| `created_at` | TIMESTAMP | Yes | |

### 15.35 `support_cases`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | E.g. `CSE-{n}`. |
| `user_id` | FK → `users.id` | Yes | |
| `category` | ENUM('technical','ticket','dispute_organizer','account','other') | Yes | |
| `subject` | VARCHAR(160) | Yes | |
| `order_ref` | VARCHAR(40) NULL | No | FK → `orders.reference`. |
| `message` | TEXT | Yes | |
| `status` | ENUM('open','in_progress','resolved','closed') | Yes | Default `open`. |
| `created_at` / `updated_at` | TIMESTAMP | Yes | |

### 15.36 `support_chat_messages`

Mirrors `SupportChatMessage` thread.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | VARCHAR(40) PK | Yes | |
| `user_id` | FK → `users.id` | Yes | |
| `case_id` | FK → `support_cases.id` NULL | No | Optional link to a case. |
| `role` | ENUM('user','agent') | Yes | |
| `text` | TEXT | Yes | |
| `created_at` | TIMESTAMP | Yes | |

---

## 16. Forms & Validation Reference

A flat index of every user-facing form in the Main Website. One row per form. Fields are summarised inline; full breakdowns live in the section noted under "See".

| Form | Route | Fields (required *) | Constraints / Notes | See |
|---|---|---|---|---|
| Login | `/login` | `email*`, `password*` | HTML5 email; `password ≥ 8` (server). | §2 |
| Register — basic | `/register` | `fullName*`, `email*`, `password*`, `contactPhone*`, `agreeTerms*` | `fullName.trim() ≥ 3`, `email contains @`, `password ≥ 8`, Saudi `+966` phone, terms must be checked. | §2 |
| Register — role select | `/register` | `role*` | `guest | talent | vendor | organizer`. | §2 |
| Forgot password | `/forgot-password` | `email*` | Always-success response; no enumeration. | §2 |
| Reset password | `/reset-password?token=…` | `token*` (URL), `password*` | `password ≥ 8`. | §2 |
| Talent onboarding — step 1 | `/register` (wizard) | `fullName*`, `contactEmail*`, `contactPhone*`, `bio*`, `profileImage` | `bio` 30–500, image ≤ 2 MB. | §10 |
| Talent onboarding — step 2 | (wizard) | `verificationMedia*` (≥1), `certificateName` | Items use `video:`/`image:`/`certificate:` prefixes or full URLs. | §10 |
| Talent onboarding — step 3 | (wizard) | `saudiRegionId*`, `city*`, `travelReady`, `locationPublic`, `acceptedQualityDisclaimer*` | `city` must belong to `saudiRegionId`. | §10 |
| Vendor onboarding — step 1 | `/register` (wizard) | `profileName*`, `contactEmail*`, `contactPhone*`, `bio*` | `profileName.trim() ≥ 2`, `bio` 25–500. | §10 |
| Vendor onboarding — step 2 | (wizard) | `serviceCategories*` (≥1) | Free-text tags. | §10 |
| Vendor onboarding — step 3 | (wizard) | `verificationDocuments*` (≥1), `gallery`, `city*`, `coverageArea` | `document:` tag or URL. | §10 |
| Organizer onboarding — step 1 | `/register` (wizard) | `displayName*`, `bio*`, `profileImage` | `displayName.trim() ≥ 2`, `bio` 30–500. | §10 |
| Organizer onboarding — step 2 | (wizard) | `email*`, `contactPhone`, `location*`, `optionalDocument` | `location` is `"<Region> · <City>"`. | §10 |
| Organizer onboarding — step 3 | (wizard) | `isCompany*`, `companyName*` (if company), `companyInfo*` (if company), `ownerName*`, `ownerInfo*` | Company fields ≥ 2 / ≥ 10 chars. Owner ≥ 2 / ≥ 10. | §10 |
| Organizer onboarding — step 4 | (wizard) | `socialLinks` | URLs only; optional. | §10 |
| Event filters | `/events` | `keyword`, `category`, `city`, `dateFrom`, `dateTo`, `priceMin`, `priceMax`, `layoutType`, `availabilityOnly`, `featured` | `category/city='all'` ⇒ no filter. URL `?featured=true`. | §4 |
| Event detail — purchase (seated) | `/events/:eventId` | — | CTA **Choose seats** → `/checkout/:eventId/seats` (auth via `RequireAuth`). | §5 |
| Event detail — purchase (free layout) | `/events/:eventId` | — | CTA **Proceed to checkout** → `/checkout/:eventId`. | §5 |
| Seat selection | `/checkout/:eventId/seats` | `selectedTicketTypeId*`, `selectedSeats[]*` (≥1) | Changing ticket type clears selection. **Continue to checkout** pushes `navigate('/checkout/:eventId', { state })` with seat payload. | §5 |
| Checkout (free layout) | `/checkout/:eventId` | `ticketTypeId*`, `qty*`, payment fields (below) | `qty 1..min(remaining,10)`. No prior seat step. | §5 |
| Checkout (seated, payment only) | `/checkout/:eventId` | `selectedSeats[]*` (via `location.state`), payment fields (below) | Must have ≥1 seat in state; else `<Navigate>` to `/checkout/:eventId/seats`. Ticket type/qty derived from selection; UI skips step 1. | §5 |
| Checkout payment | `/checkout/:eventId` | `method*`, `cardholder*`, `cardNumber*`, `expiry*`, `cvv*`, `saveCard` | Luhn + Mada BIN match `method`; expiry future MM/YY; CVV 3 digits. | §5 |
| Gift ticket | `/my-tickets/:ticketId` (modal) | `recipient*` | Email or username; `trim()` non-empty. | §7 |
| List for auction | `/my-tickets/:ticketId` (modal) | `price*` | `1 ≤ price ≤ ticket.pricePaid`. `endsAt = now + 48h` (default). | §8 |
| Rate event | `/events/:eventId` | `stars*` | `1..5` integers. Allowed only if user has a `used` ticket; one rating per (user, event). | §11 |
| Profile info | `/profile` (info tab) | `name*`, `email*`, `phone`, `region`, `city`, `bio`, `profileImage` | `city` must match `region`. Image ≤ 2 MB. | §13 |
| Preferences | `/profile` (preferences tab) | `language*`, `theme*`, `emailNotifications*`, `pushNotifications*`, `smsNotifications*`, `marketingEmails*` | All booleans default per §13. | §13 |
| Security | `/profile` (security tab) | `twoFactorEnabled*` (toggle), Change password (action) | Updates `lastPasswordChangedAt` on success. | §13 |
| Account deletion | `/profile` (danger tab) | `confirm*` | Auto-lists active tickets at `pricePaid` for 7 days. | §13 |
| Support — ticket | `/support` (Submit a request) | `category*`, `subject*`, `orderRef`, `message*` | Category enum; case id `CSE-…`. | §14 |
| Support — chat send | `/support` (Live chat) | `text*` | `trim()` non-empty. Demo agent reply ~1.8 s. | §14 |
| Engagement message | `/engagements` (talent/vendor/organizer inbox) | `text*` | `trim()` non-empty. Sender role inferred from current user. | §10 |

---

## 17. Constants & Enumerations

### 17.1 Literal-union types

All literal-union TypeScript types from the codebase, ready to map directly to MySQL `ENUM(...)` columns.

| Type | Values | Source |
|---|---|---|
| `UserRole` | `guest`, `talent`, `vendor`, `organizer` | [src/types/domain.ts](src/types/domain.ts) |
| `LayoutType` | `seated`, `free` | [src/types/domain.ts](src/types/domain.ts) |
| `TicketStatus` | `active`, `auction`, `gifted`, `used`, `expired`, `cancelled` | [src/types/domain.ts](src/types/domain.ts) |
| `EngagementStatus` | `pending`, `accepted`, `declined` | [src/types/domain.ts](src/types/domain.ts) |
| `TalentAvailability` | `available`, `reserved` | [src/types/domain.ts](src/types/domain.ts) |
| `SupportCategory` | `technical`, `ticket`, `dispute_organizer`, `account`, `other` | [src/types/domain.ts](src/types/domain.ts) |
| `RoleOnboardingStatus` / `TalentApplicationStatus` | `not_started`, `draft`, `submitted`, `approved`, `rejected` | [src/types/domain.ts](src/types/domain.ts) |
| `MockNotificationKind` | `order`, `waitlist`, `support`, `gift`, `general` | [src/contexts/NotificationContext.tsx](src/contexts/NotificationContext.tsx) |
| `SeatStatus` | `available`, `held`, `booked` | [src/types/seating.ts](src/types/seating.ts) |
| `CardPaymentMethod` | `visa`, `mastercard`, `mada` | [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) |
| Engagement message `sender` | `organizer`, `talent` (extend to `vendor`) | [src/types/domain.ts](src/types/domain.ts) |
| Support chat `role` | `user`, `agent` | [src/pages/support/SupportPage.tsx](src/pages/support/SupportPage.tsx) |

### 17.2 Numeric & timing constants

| Constant | Value | Source | Notes |
|---|---|---|---|
| `PLATFORM_AUCTION_COMMISSION_PCT` | `8` | [src/lib/constants.ts](src/lib/constants.ts) | Admin-configurable in production. |
| Demo checkout fee | `5%` | [src/pages/checkout/CheckoutPage.tsx](src/pages/checkout/CheckoutPage.tsx) | `Math.round(subtotal * 0.05)`. |
| Default auction window | `48 h` | [src/pages/tickets/TicketDetailPage.tsx](src/pages/tickets/TicketDetailPage.tsx) | `endsAt = now + 48h`. |
| Auto-listing on account deletion | `7 d` | server-side (`DELETE /me` worker; UI consumes `queued_resales` from response) | `ends_at = now + 7d`, `seller_label = 'Former account'`. |
| Reminder windows | `24 h`, `1 h` | §9 | Admin-configurable. |
| Talent bio | min `30`, max `500` chars | [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) | `TALENT_BIO_MIN_CHARS`, `TALENT_BIO_MAX_CHARS`. |
| Vendor bio | min `25` chars | [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) | `VENDOR_BIO_MIN_CHARS` (max shares `TALENT_BIO_MAX_CHARS`). |
| Organizer bio | 30–500 chars | [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) | Same as talent. |
| Profile image | ≤ `2 MB` | [src/components/auth/ProfileImageAvatarInput.tsx](src/components/auth/ProfileImageAvatarInput.tsx) | `MAX_IMAGE_BYTES = 2 * 1024 * 1024`. |
| Password | ≥ `8` chars | [src/lib/onboardingValidation.ts](src/lib/onboardingValidation.ts) | Used in registration validation. |
| Card number | `16..19` digits | [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) | Luhn check + Mada BIN match. |
| CVV | exactly `3` digits | [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) | Incl. Mada. |
| Cardholder | `≥ 3` chars (trimmed) | [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) | |
| Expiry | `MM/YY`, end-of-month future | [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) | |
| Booking quantity (free) | `1..min(remaining, 10)` | [src/pages/checkout/CheckoutPage.tsx](src/pages/checkout/CheckoutPage.tsx) | |
| Rating seed prior weight | `n = 12` | server-side aggregate (mirrored client-side fallback removed with mock services) | Bayesian smoothing on `GET /events/{slug}/ratings` aggregate. |
| Support agent reply latency | `~1.8 s` | [src/pages/support/SupportPage.tsx](src/pages/support/SupportPage.tsx) | Demo only. |

### 17.3 Lookup lists

#### 17.3.1 `EVENT_CATEGORIES` (10)

`Music`, `Sports`, `Arts & Culture`, `Comedy`, `Online`, `Family`, `Food & Drink`, `Fashion`, `Tech`, `Theatre`. Source: backend `GET /events/categories` via `useGetEventCategoriesQuery` ([src/api/endpoints/reference.ts](src/api/endpoints/reference.ts)).

#### 17.3.2 `EVENT_CITIES` (4)

`Riyadh`, `Jeddah`, `Khobar`, `Dubai`. Source: backend `GET /events/cities` via `useGetEventCitiesQuery` ([src/api/endpoints/reference.ts](src/api/endpoints/reference.ts)).

#### 17.3.3 `SAUDI_REGIONS` (13)

| Id | Name |
|---|---|
| `riyadh` | Riyadh Region |
| `makkah` | Makkah Region |
| `eastern` | Eastern Province |
| `madinah` | Madinah Region |
| `qassim` | Al-Qassim Region |
| `asir` | Asir Region |
| `tabuk` | Tabuk Region |
| `hail` | Hail Region |
| `northern` | Northern Borders Region |
| `jazan` | Jazan Region |
| `najran` | Najran Region |
| `al_bahah` | Al Bahah Region |
| `al_jawf` | Al Jawf Region |

Source: [src/lib/saudiLocations.ts](src/lib/saudiLocations.ts).

#### 17.3.4 `SAUDI_CITIES_BY_REGION` (collapsed)

| Region | Cities |
|---|---|
| `riyadh` | Riyadh, Diriyah, Al Kharj, Dawadmi, Al Majma'ah, Al Zulfi, Shaqra, Afif |
| `makkah` | Jeddah, Makkah, Taif, Rabigh, Thuwal, Al Khulays, Al Lith, Al Jumum |
| `eastern` | Dammam, Al Khobar, Dhahran, Jubail, Qatif, Al Hofuf, Al Mubarraz, Hafr Al Batin, Ras Tanura |
| `madinah` | Madinah, Yanbu, Al Ula, Mahd Al Thahab, Badr, Khaybar |
| `qassim` | Buraidah, Unaizah, Ar Rass, Al Midhnab, Al Badaya |
| `asir` | Abha, Khamis Mushait, An Namas, Sabt Al Alaya, Bisha |
| `tabuk` | Tabuk, Duba, Umluj, Haql |
| `hail` | Hail, Baqa'a, Al Ghazalah |
| `northern` | Arar, Turaif, Rafha |
| `jazan` | Jazan, Sabya, Farasan, Ahad Al Masarihah |
| `najran` | Najran, Sharurah, Hubuna |
| `al_bahah` | Al Bahah, Baljurashi, Al Mandaq |
| `al_jawf` | Sakaka, Qurayyat, Dawmat Al Jandal |

Source: [src/lib/saudiLocations.ts](src/lib/saudiLocations.ts).

#### 17.3.5 `MADA_PREFIXES` (BIN list)

`440647`, `440795`, `445564`, `446404`, `457865`, `457997`, `474491`, `588845`, `968208`, `968210`, `968211`, `968212`. Source: [src/lib/cardPaymentValidation.ts](src/lib/cardPaymentValidation.ts) (`MADA_PREFIXES`).

#### 17.3.6 Support category labels

| Value | Label (UI) |
|---|---|
| `technical` | Technical / app issue |
| `ticket` | Ticket / booking |
| `dispute_organizer` | Dispute with organizer |
| `account` | Account / profile |
| `other` | Other |

Source: [src/pages/support/SupportPage.tsx](src/pages/support/SupportPage.tsx).

---

## 18. Frontend Persistence Map

> **Note (2026-05-09):** the legacy mock-storage keys (`myticket_mock_auth`, `myticket_mock_notifications`, `myticket_mock_extra_tickets`, `myticket_ticket_patch`, `myticket_auction_listings_extra`, `myticket_auction_removed_ids`, `myticket_event_ratings_v1`, `myticket_waitlist_event_ids`, `myticket_engagement_status`, `myticket_engagement_messages`, `myticket_extra_engagements`, `myticket_talent_availability`, `myticket_support_chat_thread`) were removed when the mock services were deleted. All of that state is now server-side and reached through the RTK Query endpoints in [src/api/endpoints/](src/api/endpoints/).

The browser still keeps a **small** set of bearer-token + UI-state keys. The "Storage" column distinguishes `local` (cross-session) and `session` (per-tab).

| Storage key | Storage | Holds | Source |
|---|---|---|---|
| `myticket_auth_token` | `local` | Bearer access token used by `prepareHeaders` in [src/api/baseApi.ts](src/api/baseApi.ts). | [src/api/authToken.ts](src/api/authToken.ts) |
| `myticket_refresh_token` | `local` | Refresh token used by [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) on `401`. | [src/api/authToken.ts](src/api/authToken.ts) |
| `myticket_oauth_state` | `session` | OAuth `state` round-trip value verified on callback. | [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) |
| `myticket_oauth_provider` | `session` | OAuth provider being authenticated (`google`, `apple`, …). | [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) |
| `myticket_oauth_redirect_after` | `session` | Path to send the user back to once OAuth completes. | [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx), [src/pages/auth/OAuthCallbackPage.tsx](src/pages/auth/OAuthCallbackPage.tsx) |
| `myticket_support_chat_session_id` | `session` | Active support-chat session id so a reload reconnects to the same backend thread. | [src/pages/support/SupportPage.tsx](src/pages/support/SupportPage.tsx) |
| `myticket_reminders_banner_dismissed` | `session` | UI-only flag; reminder banner dismissed for the session. | [src/pages/tickets/MyTicketsPage.tsx](src/pages/tickets/MyTicketsPage.tsx) |

Notes:

- The token keys are the only "is the user signed in" signal across cold starts; `AuthContext` rehydrates the user from `GET /me` on mount when a token is present.
- The OAuth keys are short-lived (only valid during a single redirect handshake) and are deleted after the callback runs.
- `myticket_reminders_banner_dismissed` does not need a DB representation; if persistence is desired, route it through `user_preferences`.

---

## 19. Routes & Access Control

Every `<Route>` declared in [src/App.tsx](src/App.tsx). Auth and role gating notes are sourced from [src/components/auth/RequireAuth.tsx](src/components/auth/RequireAuth.tsx), [src/components/auth/RequireMarketplaceBrowse.tsx](src/components/auth/RequireMarketplaceBrowse.tsx), and [src/lib/marketplaceAccess.ts](src/lib/marketplaceAccess.ts).

| Route | Page | Layout | Auth gate | Role gating / notes |
|---|---|---|---|---|
| `/` | `LandingPage` | (root) | None | Public landing page. |
| `/login` | `LoginPage` | `AuthLayout` | None | Already-authenticated users redirect to `/`. |
| `/register` | `RegisterPage` | `AuthLayout` | None | Multi-step wizard (basic → role → onboarding). |
| `/forgot-password` | `ForgotPasswordPage` | `AuthLayout` | None | |
| `/reset-password` | `ResetPasswordPage` | `AuthLayout` | None (token-based) | URL param `?token=…`. |
| `/events` | `EventsPage` | `MainLayout` | None | Filters via `EventFilters`. |
| `/events/:eventId` | `EventDetailPage` | `MainLayout` | None | "Contact talent/vendor" CTAs are organizer-only (`canBrowseMarketplace` + `role==='organizer'`). Rate event needs a `used` ticket. |
| `/marketplace` | `MarketplacePage` | `MainLayout` | `RequireMarketplaceBrowse` | Allowed roles: `organizer`, `vendor`. Others see access-restricted screen. |
| `/marketplace/talent/:id` | `TalentProfilePage` | `MainLayout` | `RequireMarketplaceBrowse` | Same role gate. "Contact" button only renders for `organizer`. |
| `/marketplace/vendor/:id` | `VendorProfilePage` | `MainLayout` | `RequireMarketplaceBrowse` | Same role gate. "Contact" button only renders for `organizer`. |
| `/artists/:slug` | `ArtistRedirectPage` | `MainLayout` | None | Permanent redirect to `/marketplace/talent/:id` resolved by `findTalentByArtistParam`. |
| `/auction` | `AuctionPage` | `MainLayout` | None | Browse only; bidding/checkout actions still gated by `RequireAuth`. |
| `/auction/events/:eventId` | `AuctionEventPage` | `MainLayout` | None | Same as above. |
| `/support` | `SupportPage` | `MainLayout` | None | Submitting a ticket / chatting requires `useAuth().user` (UI prompts otherwise). |
| `/terms` | `TermsPage` | `MainLayout` | None | |
| `/privacy` | `PrivacyPage` | `MainLayout` | None | |
| `/cookies` | `CookiesPage` | `MainLayout` | None | |
| `/checkout/:eventId/seats` | `SeatSelectionPage` | `MainLayout` | `RequireAuth` | Redirects unauthenticated to `/login` with `from` state. |
| `/checkout/:eventId` | `CheckoutPage` | `MainLayout` | `RequireAuth` | Same. Seated layouts arrive with `selectedSeats[]` via router state. |
| `/my-tickets` | `MyTicketsPage` | `MainLayout` | `RequireAuth` | Filter chips by `TicketStatus`. |
| `/my-tickets/:ticketId` | `TicketDetailPage` | `MainLayout` | `RequireAuth` | Hosts gift / auction-listing modals. |
| `/profile` | `ProfilePage` | `MainLayout` | `RequireAuth` | Organizer users redirect to `/organizer-portal`. Tabs: `info | preferences | security | roles | danger`. |
| `/organizer-portal` | `OrganizerPortalRedirectPage` | `MainLayout` | `RequireAuth` | External-app redirect target for `role === 'organizer'`. |
| `/engagements` | `EngagementsPage` | `MainLayout` | `RequireAuth` | UI-level role gate via `canAccessEngagementsInbox` (`talent | vendor | organizer`). Other roles see empty state. |
| `*` | `NotFoundPage` | `MainLayout` | None | |

Guard summary:

- **`RequireAuth`** — wraps booking, ticketing, profile, engagements, and organizer-portal routes. Unauthenticated users are redirected to `/login` with the original location in `from`.
- **`RequireMarketplaceBrowse`** — wraps `/marketplace` subtree. Combines `RequireAuth` semantics with `canBrowseMarketplace(user)` (organizer or vendor).
- **`canAccessEngagementsInbox(user)`** — `talent | vendor | organizer` only. Enforced in-page rather than at the router level.
- **Profile organizer redirect** — `ProfilePage` calls `useEffect` to push `role==='organizer'` users to `/organizer-portal` so the main-app profile UI never renders for them.

---

## 20. Cross-App Ownership Hints

This site is one of four MyTicket apps that will share a single MySQL database. The list below names the **source-of-truth app** for each table or column the Main Website reads or writes. Use it when designing the shared schema so write paths are clean and ownership is unambiguous.

### 20.1 Owned by **Admin Dashboard**

The Admin app is the system of record for platform-wide configuration and moderation.

| Table / column | Notes |
|---|---|
| `event_categories` (lookup) | The `EVENT_CATEGORIES` list is curated by Admin; Organizers and Main Website only **read**. |
| `event_cities` (lookup) | Same model as categories. |
| `events.featured` | Admin override: Admin can flip `featured` on any event regardless of organizer input. |
| `users.role` (talent/vendor/organizer) | Granted/revoked only by Admin via application reviews. |
| `talent_applications.status`, `rejection_reason`, `submitted_at` | Approve / reject decisions. |
| `vendor_applications.status`, `rejection_reason` | Same. |
| `organizer_applications.status`, `rejection_reason` | Same. |
| `auction_listings.commission_pct` | Defaults from `PLATFORM_AUCTION_COMMISSION_PCT`; Admin-configurable per-listing or globally. |
| `orders.fees` (5 % default) | Fee schedule (rate, fixed amount, channel rules) is an Admin config. |
| Reminder windows + channels | The `24h` / `1h` cadence and channel matrix (email/push/SMS/in-app) are Admin-configured. |
| `support_cases.status` | Triage and resolution managed in the Admin support inbox. |
| `notifications` (broadcast / system) | Marketing or platform-wide notifications originate in Admin. |

### 20.2 Owned by **Organizer Portal**

| Table / column | Notes |
|---|---|
| `events` (CRUD except `featured`) | Title, description, dates, gallery, talents/vendors links, ticket types are all authored in the Organizer Portal. |
| `event_ticket_types` | Tier name, price, remaining (initial). Server decrements `remaining` on hold/checkout. |
| `event_gallery` (`gallery`, `venue_image`, `attendee_avatar` rows) | Uploaded by organizers. |
| `event_talents`, `event_vendors` (link tables) | Set by organizer when assembling the lineup. |
| `events.show_talents`, `events.show_vendors` | Per-event visibility toggles. |
| `events.video_url`, `events.organizer_notes`, `events.lat`, `events.lng` | Optional organizer-provided metadata. |
| `organizers.*` | Profile fields (after onboarding approval). |
| `engagement_messages` (organizer ↔ talent/vendor outbound) | Organizer initiates the thread; future replies arrive here too. |

### 20.3 Owned by **Scanner App**

| Table / column | Notes |
|---|---|
| `tickets.status = 'used'` | The Scanner is the only app that flips a ticket to `used` after a successful QR scan at the gate. |
| `tickets.qr_payload` (read-only at the gate) | Validated against the scanned payload. Rotates only on transfer events (gift / auction). |
| Scan event audit log (future `ticket_scans` table) | One row per scan attempt with `result ∈ ('admitted','duplicate','invalid','expired')`. Owned by Scanner. |

### 20.4 Owned by **Main Website** (this app)

For completeness, these tables are written primarily from the Main Website:

- `users` (registration, profile edits), `user_preferences`, `user_security`, `oauth_identities`, `password_reset_tokens`.
- `talent_applications`, `vendor_applications`, `organizer_applications` (drafts + submissions; approval status comes from Admin).
- `orders`, `tickets` (purchase path), `seats.status` transitions to `held`/`booked`, `seat_locks`.
- `gifts` (initiation), `auction_listings` (creation, cancellation), `waitlist_entries`, `ratings`.
- `engagements` initiated by organizers, `engagement_messages` from talents/vendors responding.
- `notifications` for personal events (orders, waitlist hits, gifts received, support replies).
- `support_cases` and `support_chat_messages` (user side).
