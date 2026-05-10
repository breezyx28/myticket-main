# Backend gaps — endpoints the frontend needs that aren't (yet) in `collection.json`

> **Status (2026-05-07)**: Backend shipped 21 of 22 items below in a single update. All sections except **#16** (role-application full PATCH bodies) are now resolved and merged into [`API_REFERENCE.md`](API_REFERENCE.md). The remaining open questions are tracked in [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md). The original gap descriptions are preserved below for historical context — each resolved section now starts with a `[Resolved]` prefix and a one-line pointer to the new docs.

This document lists every API the **main website** uses or expects but is **not** documented in [`collection.json`](collection.json) / [`API_REFERENCE.md`](API_REFERENCE.md). For each gap we propose a method + path, request body, and response schema so backend can implement them. All paths assume the existing `/api/v1/main` prefix and bearer auth unless noted.

Legend:

- **Status — Missing**: not in `collection.json` at all; frontend currently uses a mock or local storage.
- **Status — Underspecified**: endpoint exists in `collection.json` but the success/error shape is incomplete or inferred. Frontend has had to guess.
- **Status — Partial fields**: endpoint exists but the documented body doesn't cover the fields the frontend collects.
- **Status — Resolved**: backend shipped the endpoint; see [`API_REFERENCE.md`](API_REFERENCE.md) for the canonical contract.

Frontend type names (e.g. `MockUser`, `MockEvent`, `MockTicket`, etc.) come from [`src/types/domain.ts`](src/types/domain.ts), [`src/types/seating.ts`](src/types/seating.ts), and the API types under [`src/api/types/`](src/api/types/). When the table says `Paginated<T>`, use the standard Laravel paginator already in use elsewhere (see [`src/api/types/common.ts`](src/api/types/common.ts)).

---

## 1. [Resolved] Auth — login / OAuth / 2FA success envelopes (Underspecified)

> **Resolved**: confirmed envelopes are documented in [`API_REFERENCE.md` §2](API_REFERENCE.md#2-auth-public). [`src/lib/authMapper.ts`](src/lib/authMapper.ts) was tightened to discriminate on `two_factor_required` first, then the `token` branch.

The collection records the **request** for `POST /auth/login`, `POST /auth/oauth/{provider}/start`, `POST /auth/oauth/{provider}/callback`, and `POST /auth/2fa/challenge` but does not include a recorded successful **response**. Frontend currently parses defensively in [`src/lib/authMapper.ts`](src/lib/authMapper.ts) (`parseAuthResponse`).

Please confirm or document the success envelope. Suggested canonical shape:

```json
{
  "token": "ey...",
  "refresh_token": "rt_...",
  "expires_at": "2026-05-08T12:00:00Z",
  "user": { "id": 1, "email": "user@example.com", "full_name": "...", "...": "see UserMe" }
}
```

When 2FA is required (login response **before** OTP):

```json
{ "challenge_token": "ch_...", "two_factor_required": true }
```

OAuth start response (so the SPA can redirect):

```json
{ "redirect_url": "https://accounts.google.com/o/oauth2/v2/auth?...", "state": "csrf-random" }
```

---

## 2. [Resolved] Auth — change password while signed in (Missing)

> **Resolved**: see [`API_REFERENCE.md` §3 → `POST /auth/password/change`](API_REFERENCE.md#post-authpasswordchange). Hook: `useChangePasswordMutation` from [`src/api/endpoints/auth.ts`](src/api/endpoints/auth.ts).

Profile page has a **Change password** action ([`src/pages/profile/ProfilePage.tsx`](src/pages/profile/ProfilePage.tsx)) but the collection only ships public `forgot` / `reset`. Today the action is a no-op `changePasswordMock`.

### `POST /auth/password/change` (proposed)

- Auth: bearer.
- Request:

  ```json
  { "current_password": "oldSecret1!", "new_password": "newSecret2!" }
  ```

- Response `200`:

  ```json
  { "ok": true, "password_changed_at": "2026-05-07T18:00:00Z" }
  ```

- Errors: `401` on wrong current password; `422` on policy violations (length / reuse).

---

## 3. [Resolved] Auth — change email (Missing)

> **Resolved**: see [`API_REFERENCE.md` §3 → `POST /auth/email/change`](API_REFERENCE.md#post-authemailchange). Hook: `useChangeEmailMutation`.

`POST /auth/email/confirm` and `POST /auth/email/verify` exist (token-driven) but there is **no way to start an email change** for an authenticated user. The mock does it via `PATCH /me`, but the documented PATCH body only accepts `full_name, display_name, bio, avatar_url`.

### `POST /auth/email/change` (proposed)

- Auth: bearer.
- Request: `{ "new_email": "new@example.com", "current_password": "secret" }`
- Response `202`: `{ "message": "Verification email sent." }`
- Then the existing `POST /auth/email/confirm` with the emailed token finalizes the change.

---

## 4. [Resolved] Profile — preferences (language / theme / marketing) (Missing)

> **Resolved** — Option B chosen: see [`API_REFERENCE.md` §10 → `GET/PATCH /me/preferences`](API_REFERENCE.md#get-mepreferences). Hook: `useGetPreferencesQuery` / `useUpdatePreferencesMutation`.

Backend has `GET/PATCH /me/notifications/preferences` (email/push/sms only) and `PATCH /me` (name/bio/avatar). The frontend `MockUser.preferences` also stores `language`, `theme`, `marketingEmails` ([`AuthContext.tsx`](src/contexts/AuthContext.tsx)). These have **no endpoint**.

Two options — pick one:

**Option A**: extend `PATCH /me` body.

```json
{
  "language": "en",
  "theme": "system",
  "marketing_emails": false
}
```

**Option B**: dedicated endpoint.

### `GET /me/preferences` / `PATCH /me/preferences` (proposed)

- Auth: bearer.
- Body / response:

  ```json
  {
    "language": "en",
    "theme": "system",
    "email_notifications": true,
    "push_notifications": true,
    "sms_notifications": false,
    "marketing_emails": false
  }
  ```

If you keep the split, `email_notifications/push_notifications/sms_notifications` would still live behind `/me/notifications/preferences` and the new endpoint covers only `language/theme/marketing_emails`.

---

## 5. [Resolved] Profile — list registered devices (Missing)

> **Resolved**: see [`API_REFERENCE.md` §10 → `GET /me/devices`](API_REFERENCE.md#get-medevices). Hook: `useListDevicesQuery`. The exact `last_seen_at` field shape is being confirmed in [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md).

`POST /me/devices` and `DELETE /me/devices/{id}` exist; **listing** them does not. Profile/security UI needs this for the "Logged-in devices" panel.

### `GET /me/devices` (proposed)

- Auth: bearer.
- Response `200`:

  ```json
  {
    "data": [
      {
        "id": 12,
        "app": "main_website",
        "platform": "ios",
        "device_label": "Sara's iPhone",
        "last_seen_at": "2026-05-07T16:01:00Z",
        "created_at": "2026-04-01T08:23:00Z"
      }
    ]
  }
  ```

---

## 6. [Resolved] Account — delete account + ticket-resale queue (Missing)

> **Resolved**: see [`API_REFERENCE.md` §10 → `DELETE /me`](API_REFERENCE.md#delete-me). Hook: `useDeleteMeMutation`. Schema: `deleteAccountSchema` (the literal `"DELETE"` confirmation gate is enforced both client- and server-side).

[`ProfilePage.tsx`](src/pages/profile/ProfilePage.tsx) "Danger" tab calls `queueTicketsForAccountDeletionMock()` then `signOut()`. There is no backend equivalent.

### `DELETE /me` (proposed)

- Auth: bearer.
- Request: `{ "confirmation": "DELETE", "reason": "..." }` (free-text reason optional)
- Response `202`:

  ```json
  {
    "ok": true,
    "queued_resales": 3,
    "scheduled_purge_at": "2026-05-14T18:00:00Z"
  }
  ```

  `queued_resales` is the count of currently active tickets the backend auto-listed for resale (per the same Terms-of-Service rule the mock implements).

---

## 7. [Resolved] Favorites / saved events (Missing entirely)

> **Resolved**: see [`API_REFERENCE.md` §24 — Favorites](API_REFERENCE.md#24-favorites). Hooks: `useListMyFavoritesQuery`, `useToggleFavoriteMutation`. Backend chose the idempotent `PUT /me/favorites/{eventId}` toggle (not the split create/delete pair).

`localStorage` key `myticket:favorite-event-ids` is the only storage today (see [`EventCard.tsx`](src/components/cards/EventCard.tsx)). There is no `/me/favorites` endpoint in the collection.

### `GET /me/favorites`

- Auth: bearer.
- Response `200`:

  ```json
  { "data": [{ "event_id": 16, "favorited_at": "2026-05-01T12:00:00Z" }] }
  ```

### `PUT /me/favorites/{event_id}` (toggle)

- Auth: bearer.
- Request: `{ "favorite": true }`
- Response `200`: `{ "favorite": true, "event_id": 16 }`

Or split into `POST /me/favorites/{event_id}` (`201`) and `DELETE /me/favorites/{event_id}` (`204`).

---

## 8. [Resolved] Per-event "my rating" lookup (Underspecified)

> **Resolved**: see [`API_REFERENCE.md` §17 → `GET /me/ratings`](API_REFERENCE.md#get-meratings). Hook: `useListMyRatingsQuery({ subject_type, subject_id })`. The frontend can now drop the two `localStorage` rating stores once the migration phase wires this up.

`POST /ratings`, `PATCH /me/ratings/{id}`, `DELETE /me/ratings/{id}` are documented. The card / detail UI needs to **read** a user's existing rating for a given event so we can pre-select stars in the UI without listing all ratings ([`MOCK_API_REFERENCE.md` §10.2](MOCK_API_REFERENCE.md#102-event-card-quick-ratings)).

### `GET /me/ratings` (proposed)

- Auth: bearer.
- Query: `subject_type=event`, optional `subject_id` (or comma-separated list).
- Response `200`:

  ```json
  {
    "data": [
      { "id": 4, "subject_type": "event", "subject_id": 16, "stars": 5, "comment": "..." }
    ]
  }
  ```

This unifies the two mock rating stores (event detail aggregates and the per-card store) so the frontend can drop `myticket:user-event-ratings` and `myticket_event_ratings_v1`.

---

## 9. [Resolved] Talent availability flag (Missing)

> **Resolved**: see [`API_REFERENCE.md` §10 → `GET/PUT /me/talent-availability`](API_REFERENCE.md#get-metalent-availability). Hooks: `useGetTalentAvailabilityQuery`, `useSetTalentAvailabilityMutation`. Schema: `talentAvailabilitySchema`.

[`engagementsService.ts`](src/services/engagementsService.ts) flips a local `myticket_talent_availability` value (`available | reserved`) when an engagement is accepted. Backend has no documented field for this.

### `GET /me/talent-availability` / `PUT /me/talent-availability` (proposed)

- Auth: bearer.
- Body / response:

  ```json
  { "status": "available" }
  ```

- `status` is `"available" | "reserved"`.

Alternatively, expose the flag inside `TalentProfileMe` (`PATCH /me/talent-profile`) so the same endpoint covers it.

---

## 10. [Resolved] Tickets — overlap check + user cancel (Missing)

> **Resolved**: see [`API_REFERENCE.md` §12 → `POST /me/tickets/check-overlap`](API_REFERENCE.md#post-metticketscheck-overlap) and [`POST /me/tickets/{id}/cancel`](API_REFERENCE.md#post-metickets-id-cancel). Hooks: `useCheckTicketOverlapMutation`, `useCancelTicketMutation`. Schemas: `overlapCheckSchema`, `cancelTicketSchema`.

### 10.1 `POST /me/tickets/check-overlap`

[`ticketsService.ts → userHasOverlappingTicket`](src/services/ticketsService.ts) prevents a user from holding two tickets for overlapping events. No backend endpoint.

- Auth: bearer.
- Request:

  ```json
  {
    "event_start": "2026-06-15T16:00:00Z",
    "event_end":   "2026-06-15T19:00:00Z",
    "exclude_event_id": 14
  }
  ```

- Response `200`: `{ "has_overlap": true, "overlapping_ticket_ids": [88] }`.

### 10.2 `POST /me/tickets/{id}/cancel` (proposed)

`POST /me/tickets/{id}/refund` exists. The mock also distinguishes a user-initiated **cancel before event** which transitions to `cancelled`. Either:

- reuse `/refund` and accept a `mode: "cancel" | "refund"` field, or
- expose an explicit `/cancel` endpoint:

  ```json
  { "reason": "Cannot attend" }
  ```

  Response `200`: `{ "ok": true, "ticket": { "id": 88, "status": "cancelled" } }`.

---

## 11. [Resolved] Auction stats / per-event listing aggregates (Missing)

> **Resolved** — global aggregate chosen: see [`API_REFERENCE.md` §9 → `GET /auctions/stats`](API_REFERENCE.md#get-auctionsstats). Hook: `useGetAuctionStatsQuery`.

[`auctionService.ts → countListingsByEvent`, `nearestEndForEvent`](src/services/auctionService.ts) builds two maps for the home page and event cards. Today this is computed client-side from a list of all listings.

### `GET /auctions/stats` (proposed)

- Auth: none.
- Response `200`:

  ```json
  {
    "by_event": { "16": 3, "21": 1 },
    "nearest_end": {
      "16": "2026-05-09T15:00:00Z",
      "21": "2026-05-12T07:00:00Z"
    }
  }
  ```

If you'd rather not expose a global aggregate, replace it with `GET /events/{slug}/auctions/summary` returning `{ "active_count": 3, "nearest_end": "..." }` and let the homepage call it per featured event.

---

## 12. [Resolved] Reference data — categories / cities (Missing)

> **Resolved**: see [`API_REFERENCE.md` §7](API_REFERENCE.md#get-eventscategories) and [§23 — Reference data](API_REFERENCE.md#23-reference-data). Hooks: `useGetEventCategoriesQuery`, `useGetEventCitiesQuery`. Backend kept them split (no combined `/events/filters` endpoint).

`MOCK_API_REFERENCE` documents `GET /events/categories` and `GET /events/cities`. The collection has neither — `GET /events` accepts the strings as query filters but there's no enumeration endpoint.

### `GET /events/categories`

- Auth: none.
- Response `200`:

  ```json
  { "data": ["Music", "Sports", "Arts & Culture", "Comedy", "Online", "Family", "Food & Drink", "Fashion", "Tech", "Theatre"] }
  ```

### `GET /events/cities`

- Auth: none.
- Response `200`: `{ "data": ["Riyadh", "Jeddah", "Khobar", "Dubai"] }`.

If you want them combined: `GET /events/filters` returning `{ "categories": [...], "cities": [...] }`.

---

## 13. [Resolved] Support chat — fetch / hydrate session (Underspecified)

> **Resolved**: see [`API_REFERENCE.md` §20 → `GET /support/chat/{sessionId}`](API_REFERENCE.md#live-chat). Hook: `useGetSupportChatSessionQuery({ sessionId })`. The "list of recent sessions" is intentionally deferred — backend confirmed the SPA only ever needs the most recent active session.

The collection has `POST /support/chat`, `POST /support/chat/{sessionId}/messages`, `POST /support/chat/{sessionId}/promote`. There is no way to **read** an existing session so a returning user sees their thread. The mock persists locally under `myticket_support_chat_thread`.

### `GET /support/chat/{sessionId}` (proposed)

- Auth: bearer.
- Response `200`:

  ```json
  {
    "id": "sess-...",
    "status": "open",
    "messages": [
      { "id": "msg-1", "role": "user",  "text": "Hi", "created_at": "..." },
      { "id": "msg-2", "role": "agent", "text": "Hello", "created_at": "..." }
    ]
  }
  ```

Also useful: `GET /me/support-chats` returning the list of recent sessions.

---

## 14. [Resolved] Gifts — list incoming (Missing list view)

> **Resolved**: see [`API_REFERENCE.md` §14 → `GET /me/gifts`](API_REFERENCE.md#get-megifts). Hook: `useListGiftsQuery({ page, per_page, status })`. Returns `Paginated<GiftListItem>` (the inbox card shape, not the full ticket payload).

`POST /me/gifts/{id}/claim` is documented. There's no way to **list** pending gifts so the user can see them.

### `GET /me/gifts` (proposed)

- Auth: bearer.
- Response `200`:

  ```json
  {
    "data": [
      {
        "id": 4,
        "from_user": { "id": 12, "full_name": "Sara", "avatar_url": "..." },
        "ticket": { "id": 88, "event_id": 16, "type_name": "VIP", "seat_label": "A1" },
        "message": "Enjoy!",
        "status": "pending",
        "expires_at": "2026-05-09T18:00:00Z",
        "created_at": "2026-05-07T15:30:00Z"
      }
    ]
  }
  ```

---

## 15. [Resolved] Complaints — sub-categories enum (Missing)

> **Resolved**: see [`API_REFERENCE.md` §21 → `GET /complaints/categories`](API_REFERENCE.md#get-complaintscategories). Hook: `useGetComplaintCategoriesQuery`. Backend ships full subcategories per category, so the cascading select works end-to-end.

`createComplaintSchema` enforces `category ∈ { organizer, venue, safety, staff, other }` client-side. The mock UI also surfaces *sub-categories* per category which must come from the server.

### `GET /complaints/categories` (proposed)

- Auth: none.
- Response `200`:

  ```json
  {
    "data": [
      { "id": "organizer", "label": "Organizer issue", "subcategories": [{ "id": "no_show", "label": "Organizer no-show" }, { "id": "misleading_info", "label": "Misleading info" }] },
      { "id": "venue",     "label": "Venue issue",     "subcategories": [{ "id": "access", "label": "Access" }] },
      { "id": "safety",    "label": "Safety",          "subcategories": [] },
      { "id": "staff",     "label": "Staff",           "subcategories": [] },
      { "id": "other",     "label": "Other",           "subcategories": [] }
    ]
  }
  ```

If sub-categories aren't planned, an explicit "no sub-categories needed — frontend can hide that select" reply works for us too.

---

## 16. Role applications — full draft fields (Partial fields) — **STILL OPEN**

> **Open**: this is the only gap that did not land in the 2026-05-07 backend update. The follow-up tracking sheet is [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md). The frontend continues to use the documented sub-resource endpoints (`addTalentMedia`, `addVendorDocument`, `addVendorGalleryItem`, `addOrganizerSocialLink`) for all array fields and falls back to the minimal create / PATCH bodies for everything else.

The collection's create bodies are minimal:

- Talent: `{ stage_name, contact_email, contact_phone }`
- Vendor: `{ business_name, contact_email, contact_phone, service_categories[] }`
- Organizer: `{ display_name, email, contact_phone, is_company }`

The frontend onboarding wizard collects much more (see [`MOCK_API_REFERENCE` §12](MOCK_API_REFERENCE.md#12-role-onboarding-talent--vendor--organizer)):

| Role | Extra fields the wizard captures |
|---|---|
| Talent | `bio`, `profile_image`, `saudi_region_id`, `city`, `travel_ready`, `location_public`, `verification_media[]`, `certificate_name`, `accepted_quality_disclaimer` |
| Vendor | `bio`, `verification_documents[]`, `gallery[]`, `city`, `coverage_area` |
| Organizer | `profile_image`, `bio`, `location`, `social_links[]`, `optional_document`, `company_name`, `company_info`, `owner_name`, `owner_info` |

Please confirm the **full** accepted body for `PATCH /role-applications/{role}/{id}` (or split into the documented sub-resources `…/media`, `…/documents`, `…/gallery`, `…/social-links`). The frontend currently treats those values as plain strings (URLs/filenames) — see whether your endpoints expect actual file uploads (`multipart/form-data`) and respond with hosted URLs.

---

## 17. [Resolved] Role-applications — single resource (Underspecified)

> **Resolved**: see [`API_REFERENCE.md` §22 → `GET /role-applications/{role}/{id}`](API_REFERENCE.md#22-role-applications). Hook: `useGetRoleApplicationQuery({ role, id })`. Returns the merged single-resource view (core + role-specific sub-blob).

`GET /role-applications/me` returns *all three slots*. There is no documented `GET /role-applications/{role}/{id}`. The wizard / profile resume flow needs to refresh a single application after media is added.

### `GET /role-applications/{role}/{id}` (proposed)

- Auth: bearer.
- Response `200`: full role-application object including its `media` / `documents` / `gallery` / `social_links` arrays so the wizard can hydrate.

---

## 18. [Resolved] Seat lock — get current lock for current user (Missing)

> **Resolved**: see [`API_REFERENCE.md` §8 → `GET /events/{slug}/seats/lock`](API_REFERENCE.md#get-events-slug-seatslock). Hook: `useGetCurrentSeatLockQuery({ slug })`. Returns `200 { data: SeatLock }` or `204 No Content`; the hook collapses 204 to `null` so callers destructure a single union shape.

`POST/DELETE/POST extend` endpoints are documented. There's no documented way to **read** an existing lock when the user reloads the seat-selection page.

### `GET /events/{slug}/seats/lock` (proposed)

- Auth: bearer.
- Response `200`: the current `SeatLock` for this user on this event, or `204` if none.

---

## 19. [Resolved] Engagements — start / list extras (Missing)

> **Resolved**: see [`API_REFERENCE.md` §16 → `POST /me/engagements`](API_REFERENCE.md#post-meengagements). Hook: `useCreateEngagementMutation`. Schema: `createEngagementSchema`.

The mock supports an organizer kicking off an engagement from a talent / vendor profile (`createOrganizerEngagementMock`). The collection only documents `accept`, `decline`, `messages`, `complete`, and `GET /me/engagements`.

### `POST /me/engagements` (proposed)

- Auth: bearer (organizer role).
- Request:

  ```json
  {
    "target_type": "talent",
    "target_id": 16,
    "topic": "Festival slot — June weekend",
    "initial_message": "Hi, ..."
  }
  ```

- Response `201`: full `Engagement`.

---

## 20. [Resolved] Notifications — server-pushed delivery (Missing transport)

> **Resolved** — Option C (polling) chosen: see [`API_REFERENCE.md` §19 → `GET /me/notifications`](API_REFERENCE.md#get-menotifications). The list now accepts `?since=…` and the paginator carries `unread_count`. A new `GET /me/notifications/stream` endpoint returns the polling-guidance payload (`{ transport: 'polling', message, since, poll_interval_seconds }`). Hooks: `useListNotificationsQuery`, `useGetNotificationsStreamQuery`.

`GET /me/notifications` returns the list, but there is no documented push channel. The mock pushes notifications synchronously after actions. Real-time delivery options to choose from (please pick one):

- **A. WebSocket** at `wss://myticket-api.kat-jr.com/ws?token=...` with `notification.created` / `notification.read` events.
- **B. SSE** at `GET /me/notifications/stream` (text/event-stream).
- **C. Polling only** — frontend can poll `GET /me/notifications?since=<timestamp>` every 30s. If this is the choice, please add the `since` query param and an `unread_count` field to the response so we can keep the badge accurate.

---

## 21. [Resolved] Tickets — public QR validation (Missing — possibly intentional)

> **Resolved** (with caveat): see [`API_REFERENCE.md` §12 → `POST /tickets/{ticketId}/validate`](API_REFERENCE.md#post-tickets-ticketid-validate). Hook: `useValidateTicketMutation`. Whether the SPA itself may call this from a logged-in gate-staff browser session, or whether it must be called from a dedicated gate audience (e.g. an API key), is being confirmed in [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md).

[`TicketDetailPage.tsx`](src/pages/tickets/TicketDetailPage.tsx) renders `qrPayload` returned by the mock. There's no documented gate-validation endpoint on the main API. **If** gate scanning is in scope for a different service, you can ignore this item; otherwise:

### `POST /tickets/{ticketId}/validate` (proposed, gate-only)

- Auth: gate API key (out of band).
- Request: `{ "qr_payload": "..." }`
- Response `200`: `{ "valid": true, "ticket": { ... }, "scanned_at": "..." }`.

---

## 22. [Resolved] Static reference data — Saudi locations (Optional)

> **Resolved**: see [`API_REFERENCE.md` §23 → `GET /reference/saudi-regions`](API_REFERENCE.md#get-referencesaudi-regions). Hook: `useGetSaudiRegionsQuery`. Backend chose to ship it server-side, so the frontend can drop the bundled `src/lib/saudiLocations.ts` once the talent / vendor wizards are migrated.

[`src/lib/saudiLocations.ts`](src/lib/saudiLocations.ts) ships region/city seeds in the bundle. If the backend wants to control these:

### `GET /reference/saudi-regions` (optional)

- Auth: none.
- Response `200`:

  ```json
  {
    "data": [
      { "id": "RD", "name": "Riyadh", "cities": [{ "id": "RYD", "name": "Riyadh" }] }
    ]
  }
  ```

If you'd rather keep this client-side, fine — flag this as "frontend-owned" so we stop tracking it as a gap.

---

## Summary table

| # | Title | Path | Method | Status |
|---|---|---|---|---|
| 1 | Login / OAuth / 2FA success envelope | `/auth/login` etc. | POST | **Resolved** |
| 2 | Change password (signed-in) | `/auth/password/change` | POST | **Resolved** |
| 3 | Change email (signed-in) | `/auth/email/change` | POST | **Resolved** |
| 4 | Preferences (language/theme/marketing) | `/me/preferences` | GET/PATCH | **Resolved** |
| 5 | List registered devices | `/me/devices` | GET | **Resolved** (last_seen_at shape: see follow-up) |
| 6 | Delete account + queue resales | `/me` | DELETE | **Resolved** |
| 7 | Favorites | `/me/favorites/...` | GET/PUT | **Resolved** |
| 8 | My rating per event | `/me/ratings?subject_type=event` | GET | **Resolved** |
| 9 | Talent availability | `/me/talent-availability` | GET/PUT | **Resolved** |
| 10 | Tickets: overlap check + user cancel | `/me/tickets/...` | POST | **Resolved** |
| 11 | Auction aggregates | `/auctions/stats` | GET | **Resolved** |
| 12 | Categories / cities reference | `/events/categories` etc. | GET | **Resolved** |
| 13 | Support chat: fetch session | `/support/chat/{id}` | GET | **Resolved** |
| 14 | Gifts: list incoming | `/me/gifts` | GET | **Resolved** |
| 15 | Complaints: sub-categories | `/complaints/categories` | GET | **Resolved** |
| 16 | Role applications: full draft fields | `/role-applications/{role}/{id}` | PATCH | **Open** — see [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md) |
| 17 | Role applications: single GET | `/role-applications/{role}/{id}` | GET | **Resolved** |
| 18 | Seat lock: read current | `/events/{slug}/seats/lock` | GET | **Resolved** |
| 19 | Engagements: start | `/me/engagements` | POST | **Resolved** |
| 20 | Notifications: real-time channel | `/me/notifications/stream` (polling) | GET | **Resolved** |
| 21 | Tickets: gate validation | `/tickets/{id}/validate` | POST | **Resolved** (audience scope: see follow-up) |
| 22 | Reference data: Saudi regions | `/reference/saudi-regions` | GET | **Resolved** |

---

## How this affects the migration phases

After the 2026-05-07 backend update:

- **Phase 1 (Auth shell)** — delivered. [`src/lib/authMapper.ts`](src/lib/authMapper.ts) was simplified to discriminate on the canonical `{ challenge_token, two_factor_required }` and `{ token, refresh_token, expires_at, user }` envelopes (gap **#1**).
- **Phase 2 (Account / sessions / security)** — **unblocked** end-to-end. Gaps **#2 / #3 / #4 / #5 / #6** are all resolved.
- **Phase 3 (Events discovery)** — **unblocked**. Gap **#12** resolved (categories + cities lookups).
- **Phase 5 (Checkout)** — **unblocked**. Gap **#18** resolved (reading the current seat lock).
- **Phase 6 (Tickets)** — **unblocked**. Gaps **#7** (favorites), **#10** (overlap + cancel) resolved; **#21** (gate validation) is exposed but the SPA's audience is being confirmed in the follow-up.
- **Phase 7 (Auctions)** — **unblocked**. Gap **#11** resolved.
- **Phase 8 (Engagements / ratings / waitlist)** — **unblocked**. Gaps **#8** (my rating per event), **#9** (talent availability), **#19** (engagement create) resolved.
- **Phase 9 (Notifications)** — **unblocked**. Gap **#20** resolved as polling + `since` cursor + `unread_count`.
- **Phase 10 (Support / complaints)** — **unblocked**. Gap **#13** (support chat fetch), **#15** (complaints sub-categories), and **#14** (gifts inbox) resolved.
- **Phase 11 (Role applications)** — **partially unblocked**. Gap **#17** (single GET) resolved; gap **#16** (full PATCH bodies) is the only remaining hard blocker — see [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md).
- **Cross-cutting cleanup**: gaps **#7** (favorites) and **#22** (Saudi regions) are resolved, so the corresponding `localStorage` / bundled-seed cleanups in [`MOCK_API_REFERENCE` §16](MOCK_API_REFERENCE.md#16-persistence-keys-appendix) are unblocked.

When backend lands the remaining items in [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md), please reply on the ticket and we'll close out Phase 11 + the gate-validation prototype.
