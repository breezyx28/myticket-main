# MyTicket Main Website — Backend API Reference

Generated from [`collection.json`](collection.json). Only the `/api/v1/main/*` surface is documented here; admin endpoints under `/api/v1/admin/*` belong to a different application and are intentionally excluded.

## Base URL

The Vite client builds the absolute URL from two env vars (see [.env.example](.env.example)):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1/main
```

The RTK Query [`baseApi`](src/api/baseApi.ts) joins them at start-up. Every path in this document is **relative to that prefix** — for example `GET /events` is reached at `http://localhost:8000/api/v1/main/events`.

## Conventions

- All requests/responses are `application/json; charset=utf-8`. Always send `Accept: application/json` so the backend returns JSON for validation errors instead of HTML.
- **Authentication**: any endpoint marked "Auth: bearer" expects `Authorization: Bearer <token>` where `<token>` was returned by `POST /auth/login` (or sign-up / 2FA challenge). [`baseApi`](src/api/baseApi.ts) injects the header automatically from `localStorage` (`myticket_auth_token`).
- **Errors**: a missing/expired token returns `401 Unauthenticated.`:

  ```json
  { "message": "Unauthenticated." }
  ```

  Resource-not-found uses Laravel's default:

  ```json
  { "message": "No query results for model [App\\Models\\<Resource>]." }
  ```

  Validation failures should be expected as `422` with this Laravel-style envelope:

  ```json
  {
    "message": "The given data was invalid.",
    "errors": {
      "<field>": ["<message>"]
    }
  }
  ```

- **Pagination**: collection-style endpoints (talents, vendors, organizers, events, auctions, orders, tickets, support cases, complaints, notifications, etc.) return Laravel length-aware paginators:

  ```json
  {
    "current_page": 1,
    "data": [],
    "first_page_url": "…?page=1",
    "from": null,
    "last_page": 1,
    "last_page_url": "…?page=1",
    "links": [
      { "url": null, "label": "&laquo; Previous", "page": null, "active": false },
      { "url": "…?page=1", "label": "1", "page": 1, "active": true },
      { "url": null, "label": "Next &raquo;", "page": null, "active": false }
    ],
    "next_page_url": null,
    "path": "…",
    "per_page": 20,
    "prev_page_url": null,
    "to": null,
    "total": 0
  }
  ```

  The frontend types this as `Paginated<T>` in [`src/api/types/common.ts`](src/api/types/common.ts).

- **Rate limiting**: the backend returns `x-ratelimit-limit: 120` / `x-ratelimit-remaining: <n>` per response (per IP for unauth, per user for auth).

## RTK Query mapping

Every endpoint below has a generated React hook in [`src/api/endpoints/`](src/api/endpoints). Domains map 1:1 to files there. Yup request validators live in [`src/schemas/`](src/schemas).

---

## 1. System

### `GET /health`

- Auth: none.
- Hook: `useGetHealthQuery()` from [`src/api/endpoints/system.ts`](src/api/endpoints/system.ts).
- Response `200`:

  ```json
  { "status": "ok" }
  ```

### `GET /version`

- Auth: none.
- Hook: `useGetVersionQuery()`.
- Response `200`:

  ```json
  { "version": "1.0.0" }
  ```

---

## 2. Auth (public)

All public auth endpoints are unauthenticated. Successful sign-in flows return a bearer token that should be persisted via `setToken(token)` from [`src/api/authToken.ts`](src/api/authToken.ts) (or by dispatching `setCredentials` from [`src/store/authSlice.ts`](src/store/authSlice.ts)).

### `POST /auth/register`

- Hook: `useRegisterMutation()`.
- Schema: `registerSchema` from [`src/schemas/auth.ts`](src/schemas/auth.ts).
- Request:

  ```json
  {
    "email": "user@example.com",
    "phone": "+966500000000",
    "password": "SuperSecret1!",
    "full_name": "Sara Al-Otaibi",
    "display_name": "Sara"
  }
  ```

- Response `201`:

  ```json
  {
    "token": "<bearer>",
    "refresh_token": "<refresh>",
    "user": { "id": 1, "email": "user@example.com" }
  }
  ```

### `POST /auth/login`

- Hook: `useLoginMutation()`.
- Schema: `loginSchema`.
- Request:

  ```json
  { "email": "user@example.com", "phone": null, "password": "secret", "otp": "123456" }
  ```

  `otp` is only required when the account has 2FA enabled and the previous login responded with a 2FA challenge.

- Response `200` is a discriminated union (`LoginResponse`):

  - **AuthSuccessResponse** — issued for non-2FA accounts and after a successful 2FA challenge:

    ```json
    {
      "token": "<bearer>",
      "refresh_token": "<refresh>",
      "expires_at": "2026-05-08T01:00:00Z",
      "user": { "id": 1, "email": "user@example.com", "full_name": "Sara Al-Otaibi", "two_factor_enabled": false }
    }
    ```

  - **TwoFactorChallengeResponse** — issued when the account has 2FA on and the request did not include a valid `otp`:

    ```json
    { "challenge_token": "ey…", "two_factor_required": true }
    ```

  The frontend's [`parseAuthResponse`](src/lib/authMapper.ts) discriminates on `two_factor_required` first, then falls back to the `token` branch.

### `POST /auth/oauth/{provider}/start`

- Path param `provider`: e.g. `google`, `apple`.
- Hook: `useOauthStartMutation()`.
- Body: none.
- Response `200`:

  ```json
  { "redirect_url": "https://accounts.google.com/o/oauth2/...", "state": "csrf_state_token" }
  ```

  Both fields are required. The frontend stores `state` in `sessionStorage` and forwards it to the callback for CSRF validation.

### `POST /auth/oauth/{provider}/callback`

- Hook: `useOauthCallbackMutation()`.
- Body (provider-dependent):

  ```json
  { "code": "<oauth_code>", "state": "<csrf_state_token>" }
  ```

- Response `200`: `AuthSuccessResponse` envelope identical to login.

### `POST /auth/password/forgot`

- Hook: `useForgotPasswordMutation()`. Schema: `forgotPasswordSchema`.
- Request: `{ "email": "user@example.com" }`
- Response `200`: `{ "message": "Reset link sent." }`

### `POST /auth/password/reset`

- Hook: `useResetPasswordMutation()`. Schema: `resetPasswordSchema`.
- Request: `{ "token": "<token from email>", "password": "NewSecret1!" }`
- Response `200`: `{ "message": "Password updated." }`

### `POST /auth/email/confirm`

- Hook: `useConfirmEmailMutation()`. Schema: `emailConfirmSchema`.
- Request: `{ "token": "<verification_token>" }`
- Response `200`: `{ "message": "Email confirmed." }`

### `POST /auth/2fa/challenge`

- Hook: `useTwoFactorChallengeMutation()`. Schema: `twoFactorChallengeSchema`.
- Request: `{ "otp": "123456", "challenge_token": "<challenge_token from /login>" }`
- Response `200`: full `AuthSuccessResponse` (`token` / `refresh_token` / `expires_at` / `user`) — never the challenge envelope, since this endpoint completes the second factor.

---

## 3. Auth (authenticated)

Auth: bearer.

### `POST /auth/logout`

- Hook: `useLogoutMutation()`.
- Body: none.
- Response `200`: `{ "ok": true }`. Clears server session; client should `dispatch(logout())`.

### `POST /auth/refresh`

- Hook: `useRefreshMutation()`.
- Request (optional, server may also infer from cookie): `{ "refresh_token": "<refresh>" }`
- Response `200`: `{ "token": "<new bearer>", "refresh_token": "<new refresh>", "expires_at": "2026-05-08T01:00:00Z" }`

### `POST /auth/email/verify`

- Hook: `useVerifyEmailMutation()`.
- Request (server-defined; usually pulls token from query or session): `{ "token": "<token>" }`
- Response `200`: `{ "message": "Email verified." }`

### `POST /auth/phone/start`

- Hook: `useStartPhoneVerificationMutation()`. Schema: `phoneStartSchema`.
- Request: `{ "phone": "+966500000000" }` (defaults to the user's stored phone if omitted).
- Response `200`: `{ "message": "Verification code sent." }`

### `POST /auth/phone/verify`

- Hook: `useVerifyPhoneMutation()`. Schema: `phoneVerifySchema`.
- Request: `{ "code": "1234" }`
- Response `200`: `{ "message": "Phone verified." }`

### `POST /auth/2fa/setup`

- Hook: `useTwoFactorSetupMutation()`.
- Body: none.
- Response `200`:

  ```json
  {
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauth_url": "otpauth://totp/MyTicket:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyTicket",
    "recovery_codes": ["abc-123-def", "ghi-456-jkl"]
  }
  ```

### `POST /auth/2fa/confirm`

- Hook: `useTwoFactorConfirmMutation()`. Schema: `twoFactorConfirmSchema`.
- Request: `{ "otp": "123456" }`
- Response `200`: `{ "ok": true }`

### `POST /auth/2fa/disable`

- Hook: `useTwoFactorDisableMutation()`. Schema: `twoFactorDisableSchema`.
- Request: `{ "password": "current", "otp": "123456" }`
- Response `200`: `{ "ok": true }`

### `POST /auth/password/change`

- Hook: `useChangePasswordMutation()`. Schema: `changePasswordSchema` from [`src/schemas/auth.ts`](src/schemas/auth.ts).
- Request:

  ```json
  { "current_password": "OldSecret1!", "new_password": "BrandNew2!" }
  ```

- Response `200`:

  ```json
  { "ok": true, "password_changed_at": "2026-05-07T18:30:00Z" }
  ```

  The server invalidates other sessions on success; the client should treat its own bearer as still valid.

### `POST /auth/email/change`

- Hook: `useChangeEmailMutation()`. Schema: `changeEmailSchema`.
- Request:

  ```json
  { "new_email": "new@example.com", "current_password": "OldSecret1!" }
  ```

- Response `200`:

  ```json
  { "message": "Verification email sent to new@example.com." }
  ```

  The change is finalized when the user clicks the link in the verification email; the existing `POST /auth/email/confirm` endpoint completes the swap.

---

## 4. Talents

Auth: none.

### `GET /talents`

- Hook: `useListTalentsQuery({ page, per_page })`.
- Response `200`: `Paginated<Talent>` (see [`src/api/types/talent.ts`](src/api/types/talent.ts)).

### `GET /talents/{slug}`

- Hook: `useGetTalentBySlugQuery({ slug })`.
- Response `200`: `Talent`. `404` when the slug is unknown.

### `GET /talents/{slug}/ratings`

- Hook: `useGetTalentRatingsQuery({ slug })`.
- Response `200`:

  ```json
  { "average": 4.7, "count": 32, "ratings": [{ "id": 1, "stars": 5, "comment": "Great act!" }] }
  ```

---

## 5. Vendors

Auth: none. Mirrors the talents shape.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/vendors` | `useListVendorsQuery` |
| `GET` | `/vendors/{slug}` | `useGetVendorBySlugQuery` |
| `GET` | `/vendors/{slug}/ratings` | `useGetVendorRatingsQuery` |

`Vendor` is defined in [`src/api/types/vendor.ts`](src/api/types/vendor.ts).

---

## 6. Organizers

Auth: none.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/organizers` | `useListOrganizersQuery` |
| `GET` | `/organizers/{slug}` | `useGetOrganizerBySlugQuery` |
| `GET` | `/organizers/{slug}/ratings` | `useGetOrganizerRatingsQuery` |
| `GET` | `/organizers/{slug}/events` | `useGetOrganizerEventsQuery` |

`Organizer` is defined in [`src/api/types/organizer.ts`](src/api/types/organizer.ts). The `events` endpoint returns `Paginated<EventListItem>`.

---

## 7. Events

Auth: none.

### `GET /events`

- Hook: `useListEventsQuery(filters)`.
- Query (`EventListQuery` in [`src/api/types/event.ts`](src/api/types/event.ts)):
  - `keyword`, `category` (numeric `event_categories.id`), `city`, `date_from`, `date_to`, `price_min`, `price_max`, `layout_type` (`seated|free`), `availability_only`, `featured`, `page`, `per_page`.
- Response `200`: `Paginated<EventListItem>`.

### `GET /events/featured`

- Hook: `useGetFeaturedEventsQuery()`.

### `GET /events/categories`

- Hook: `useGetEventCategoriesQuery()` from [`src/api/endpoints/reference.ts`](src/api/endpoints/reference.ts).
- Response `200`:

  ```json
  {
    "data": [
      { "id": 1, "slug": "music", "name": "Music", "name_ar": "موسيقى", "events_count": 42 },
      { "id": 2, "slug": "comedy", "name": "Comedy", "name_ar": "كوميديا", "events_count": 17 }
    ]
  }
  ```

  Active categories only; `icon_key` / `color_token` are not in this DTO — the SPA maps `slug` to tile styles. Used by event filters and the homepage category grid.

### `GET /events/cities`

- Hook: `useGetEventCitiesQuery()`.
- Response `200`:

  ```json
  {
    "data": [
      { "slug": "riyadh", "name": "Riyadh", "name_ar": "الرياض", "events_count": 42 },
      { "slug": "jeddah", "name": "Jeddah", "name_ar": "جدة", "events_count": 17 }
    ]
  }
  ```

### `GET /events/{slug}`

- Hook: `useGetEventBySlugQuery({ slug })`.
- Response `200`: `EventDetail` (extends `EventListItem` with `description`, `organizer`, `talents`, `vendors`, `ticket_types`, `gallery`, `venue_images`, `lat`, `lng`, `video_url`, `organizer_notes`).

### `GET /events/{slug}/ratings`

- Hook: `useGetEventRatingsQuery({ slug })`.

### `GET /events/{slug}/occurrences`

- Hook: `useGetEventOccurrencesQuery({ slug })`.

### `GET /events/{slug}/gallery`

- Hook: `useGetEventGalleryQuery({ slug })`.

### `GET /events/{slug}/lineup`

- Hook: `useGetEventLineupQuery({ slug })`.

### `GET /events/{slug}/ticket-types`

- Hook: `useGetEventTicketTypesQuery({ slug })`.
- Response `200`: `TicketType[]` with `{ id, name, price, remaining }`.

### `GET /events/{slug}/seats`

- Hook: `useGetEventSeatsQuery({ slug })`.
- Response `200`: `SeatMap` (`{ seats: SeatRecord[], total, available, held, booked }`). Free-admission events return all-zero counts and an empty `seats` array.

---

## 8. Seat locks

Auth: bearer.

### `POST /events/{slug}/seats/lock`

- Hook: `useCreateSeatLockMutation()`. Schema: `seatLockSchema`.
- Request:

  ```json
  { "ticket_type_id": 16, "seat_ids": [121, 122], "ttl_seconds": 180 }
  ```

- Response `201`: `SeatLock` (`{ id, ticket_type_id, seat_ids, expires_at }`).

### `DELETE /events/{slug}/seats/lock/{lockId}`

- Hook: `useReleaseSeatLockMutation()`.
- Response `204`.

### `POST /events/{slug}/seats/lock/{lockId}/extend`

- Hook: `useExtendSeatLockMutation()`. Schema: `extendSeatLockSchema`.
- Request: `{ "ttl_seconds": 180 }`
- Response `200`: refreshed `SeatLock`.

### `GET /events/{slug}/seats/lock`

- Hook: `useGetCurrentSeatLockQuery({ slug })`.
- Reads the caller's active lock for the event so the seat picker can resume the timer on reload.
- Response `200`:

  ```json
  { "data": { "id": 11, "ticket_type_id": 16, "seat_ids": [121, 122], "expires_at": "2026-05-07T18:33:00Z" } }
  ```

- Response `204`: no active lock. The hook collapses this to `null` so consumers can destructure a single union shape (`{ data: SeatLock } | null`).

---

## 9. Auctions (public)

Auth: none.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/auctions` | `useListAuctionsQuery` |
| `GET` | `/auctions/{id}` | `useGetAuctionQuery` |
| `GET` | `/auctions/stats` | `useGetAuctionStatsQuery` |

`AuctionListing` shape is in [`src/api/types/auction.ts`](src/api/types/auction.ts).

### `GET /auctions/stats`

- Powers the "X auctions live for Y" / "next ending in Z" badges on the auctions hub.
- Response `200` (`AuctionStatsResponse`):

  ```json
  {
    "by_event": { "16": 4, "17": 2 },
    "nearest_end": { "16": "2026-05-08T20:00:00Z", "17": "2026-05-09T19:00:00Z" }
  }
  ```

  Both maps are keyed by event id (string).

---

## 10. Profile (`/me`)

Auth: bearer for everything below.

### `GET /me`

- Hook: `useGetMeQuery()`.
- Response `200`: `UserMe` (see [`src/api/types/user.ts`](src/api/types/user.ts)).

### `PATCH /me`

- Hook: `useUpdateMeMutation()`. Schema: `updateProfileSchema`.
- Request: `{ "full_name": "Sara A.", "display_name": "Sara", "bio": "…" }`
- Response `200`: updated `UserMe`.

### `DELETE /me`

- Hook: `useDeleteMeMutation()`. Schema: `deleteAccountSchema`.
- Request:

  ```json
  { "confirmation": "DELETE", "reason": "Switching to a single account" }
  ```

  The literal `"DELETE"` confirmation gate is enforced both server-side and in the Yup schema so an accidental fetch can never wipe the account.

- Response `200`:

  ```json
  { "ok": true, "queued_resales": 2, "scheduled_purge_at": "2026-06-07T18:30:00Z" }
  ```

  Server schedules a delayed purge (giving customer support a window to reverse it). All sessions / devices are revoked immediately.

### `GET /me/preferences`

- Hook: `useGetPreferencesQuery()`.
- Response `200` (`UserPreferences`, envelope-tolerant):

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

  The hook accepts both `UserPreferences` and `{ data: UserPreferences }` so the UI can read a flat shape regardless of whether the backend wraps it.

### `PATCH /me/preferences`

- Hook: `useUpdatePreferencesMutation()`. Schema: `updatePreferencesSchema` from [`src/schemas/profile.ts`](src/schemas/profile.ts).
- Request: any subset of `UpdateUserPreferencesRequest`. Field names are snake_case to match the response shape.
- Response `200`: updated `UserPreferences`.

### `GET /me/sessions`

- Hook: `useListSessionsQuery()`.
- Response `200`: `UserSession[]`.

### `DELETE /me/sessions/{id}`

- Hook: `useRevokeSessionMutation()`.
- Response `204`.

### `GET /me/devices`

- Hook: `useListDevicesQuery()`.
- Response `200` (`UserDeviceListResponse`, envelope-tolerant):

  ```json
  {
    "data": [
      { "id": 1, "app": "main_website", "platform": "ios", "device_label": "Sara's iPhone", "last_seen_at": "2026-05-07T12:00:00Z" }
    ]
  }
  ```

  The hook returns `UserDevice[]` regardless of whether the backend wraps the array.

### `POST /me/devices`

- Hook: `useRegisterDeviceMutation()`. Schema: `registerDeviceSchema`.
- Request:

  ```json
  { "app": "main_website", "platform": "ios", "token": "<push token>", "device_label": "Sara's iPhone" }
  ```

- Response `201`: `UserDevice`.

### `DELETE /me/devices/{id}`

- Hook: `useRemoveDeviceMutation()`.

### `GET /me/talent-availability`

- Hook: `useGetTalentAvailabilityQuery()`.
- Available only to users with the talent role.
- Response `200`: `{ "status": "available" | "reserved" }`.

### `PUT /me/talent-availability`

- Hook: `useSetTalentAvailabilityMutation()`. Schema: `talentAvailabilitySchema`.
- Request: `{ "status": "reserved" }`
- Response `200`: same shape as the GET. Toggling to `reserved` removes the talent from public search until it is flipped back.

### `GET /me/talent-profile`

- Hook: `useGetTalentProfileQuery()`.
- Response `200`: `TalentProfileMe`.

### `PATCH /me/talent-profile`

- Hook: `useUpdateTalentProfileMutation()`.
- Request: subset of `TalentProfileMe`.

### `GET /me/vendor-profile`

- Hook: `useGetVendorProfileQuery()`.

### `PATCH /me/vendor-profile`

- Hook: `useUpdateVendorProfileMutation()`.

---

## 11. Orders & checkout

Auth: bearer.

### `POST /orders`

- Hook: `useCreateOrderMutation()`. Schema: `createOrderSchema`.
- Request:

  ```json
  {
    "event_id": 16,
    "lock_id": 16,
    "ticket_type_quantities": [{ "ticket_type_id": 39, "quantity": 2 }],
    "payment_method": "visa"
  }
  ```

  > The Postman seed uses a flat `[39]` array; the typed contract accepts both `Id[]` and `{ ticket_type_id, quantity }[]`. Prefer the object form for clarity.

- Response `201`: `Order` (`{ id, reference, status, lines, subtotal, fees, total, … }`).

### `GET /orders/{id}`

- Hook: `useGetOrderQuery({ id })`.
- Response `401` for guests; `404` for orders that aren't yours.

### `POST /orders/{id}/confirm-payment`

- Hook: `useConfirmOrderPaymentMutation()`. Schema: `confirmPaymentSchema`.
- Request (gateway-dependent):

  ```json
  { "payment_intent_id": "pi_…", "three_ds_token": "…", "saved_card_id": null }
  ```

- Response `200`: updated `Order`. Tickets are emitted on success and become available via `/me/tickets`.

### `POST /orders/{id}/cancel`

- Hook: `useCancelOrderMutation()`. Schema: `cancelOrderSchema`.
- Request: `{ "reason": "Changed my mind" }` (optional).

### `GET /me/orders`

- Hook: `useListMyOrdersQuery()`.

---

## 12. Tickets

Auth: bearer.

### `GET /me/tickets`

- Hook: `useListMyTicketsQuery()`.
- Response `200`: `Paginated<Ticket>` (see [`src/api/types/ticket.ts`](src/api/types/ticket.ts)).

### `GET /me/tickets/{id}`

- Hook: `useGetMyTicketQuery({ id })`.

### `POST /me/tickets/{id}/gift`

- Hook: `useGiftTicketMutation()`. Schema: `giftTicketSchema`.
- Request: `{ "recipient": "friend@example.com", "message": "Enjoy the show!" }`
- Response `200`: `{ "ok": true }`. Status of the ticket transitions to `gifted`.

### `POST /me/tickets/{id}/refund`

- Hook: `useRefundTicketMutation()`. Schema: `refundTicketSchema`.
- Request: `{ "reason": "<optional>" }`
- Response `200`: `{ "ok": true }`.

### `POST /me/tickets/check-overlap`

- Hook: `useCheckTicketOverlapMutation()`. Schema: `overlapCheckSchema`.
- Request:

  ```json
  { "event_id": 16, "ticket_type_id": 39, "date_start": "2026-05-30T19:00:00Z", "date_end": "2026-05-30T22:00:00Z" }
  ```

- Response `200`:

  ```json
  {
    "has_overlap": true,
    "conflicts": [
      { "ticket_id": 88, "event_id": 12, "event_title": "Riyadh Comedy Night", "date_start": "2026-05-30T20:00:00Z" }
    ]
  }
  ```

  Called from the seat picker / cart before purchase so the UI can warn the user about a clashing ticket they already own.

### `POST /me/tickets/{id}/cancel`

- Hook: `useCancelTicketMutation()`. Schema: `cancelTicketSchema`.
- Request:

  ```json
  { "reason": "Plans changed", "refund_requested": true }
  ```

  Both fields are optional; an empty body cancels without queuing a refund.

- Response `200`:

  ```json
  {
    "ticket": { "id": 88, "status": "cancelled" },
    "refund": { "id": 5, "amount": 220, "status": "pending" }
  }
  ```

  `refund` is `null` when `refund_requested` was omitted or when the ticket was outside the refund window.

### `POST /tickets/{ticketId}/validate`

Removed from the main SPA contract. Validation now lives in the scanner audience (`/api/v1/scanner/*`) per [`BACKEND_TEAM_ANSWERS.md`](BACKEND_TEAM_ANSWERS.md) (2026-05-09).

---

## 13. Saved cards

Auth: bearer.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/me/saved-cards` | `useListSavedCardsQuery` |
| `DELETE` | `/me/saved-cards/{id}` | `useDeleteSavedCardMutation` |

`SavedCard` shape: `{ id, brand, last4, exp_month, exp_year, cardholder_name, is_default }`.

---

## 14. Gifts

### `GET /me/gifts`

- Auth: bearer.
- Hook: `useListGiftsQuery({ page, per_page, status })`.
- Response `200`: `Paginated<GiftListItem>` — the inbox card shape:

  ```json
  {
    "data": [
      {
        "id": 7,
        "status": "pending",
        "sender_name": "Layla",
        "event_title": "Riyadh Symphony",
        "event_cover_url": "https://…/cover.jpg",
        "message": "Enjoy!",
        "expires_at": "2026-05-30T18:00:00Z",
        "created_at": "2026-05-07T12:00:00Z"
      }
    ],
    "current_page": 1,
    "per_page": 20,
    "total": 1
  }
  ```

  Use `claimGift` to convert a row into a real ticket.

### `POST /me/gifts/{id}/claim`

- Auth: bearer.
- Hook: `useClaimGiftMutation()`.
- Body: none.
- Response `200`: claimed `Gift` (the ticket appears under `/me/tickets`).

---

## 15. Auctions (authenticated)

Auth: bearer.

### `POST /me/auctions`

- Hook: `useCreateMyAuctionMutation()`. Schema: `listForAuctionSchema`.
- Request:

  ```json
  { "ticket_id": 16, "price": 220, "ends_at": "2052-05-30" }
  ```

  Pass `originalPrice` via the Yup `context` option to enforce "price ≤ original purchase price".

- Response `201`: `AuctionListing` (the source ticket transitions to `auction`).

### `POST /auctions/{id}/cancel`

- Hook: `useCancelAuctionMutation()`.

### `POST /auctions/{id}/bids`

- Hook: `usePlaceBidMutation()`. Schema: `placeBidSchema` (pass `minimumBid` via context).
- Request: `{ "amount": 240 }`
- Response `201`: `AuctionBid`.

### `POST /auctions/{id}/buy-now`

- Hook: `useBuyNowMutation()`. Schema: `buyNowSchema`.
- Request: `{ "payment_method": "visa", "saved_card_id": null }`
- Response `200`: `{ "ok": true }` — order/ticket are then available via `/me/orders` and `/me/tickets`.

### `GET /me/auctions`

- Hook: `useListMyAuctionsQuery()`.

### `GET /me/auctions/{id}/bids`

- Hook: `useListMyAuctionBidsQuery({ id })`.

---

## 16. Engagements

Auth: bearer.

### `GET /me/engagements`

- Hook: `useListEngagementsQuery()`.
- Response `200`: `Paginated<Engagement>`.

### `POST /me/engagements`

- Hook: `useCreateEngagementMutation()`. Schema: `createEngagementSchema`.
- Used by the "contact this talent / vendor" CTA on a profile page to start a fresh thread.
- Request:

  ```json
  { "target_type": "talent", "target_id": 11, "topic": "Wedding gig 2026-08-12", "initial_message": "Are you available?" }
  ```

- Response `201`: created `Engagement` (the caller is wired as the organizer side automatically).

### `POST /me/engagements/{id}/accept`

- Hook: `useAcceptEngagementMutation()`.

### `POST /me/engagements/{id}/decline`

- Hook: `useDeclineEngagementMutation()`.

### `POST /me/engagements/{id}/messages`

- Hook: `usePostEngagementMessageMutation()`. Schema: `engagementMessageSchema`.
- Request: `{ "body": "Hi!", "attachment_url": "https://example.com/file.pdf" }`

### `POST /me/engagements/{id}/complete`

- Hook: `useCompleteEngagementMutation()`.

---

## 17. Ratings

### `POST /ratings`

- Auth: bearer.
- Hook: `useSubmitRatingMutation()`. Schema: `submitRatingSchema`.
- Request:

  ```json
  { "subject_type": "event", "subject_id": 16, "stars": 5, "comment": "Loved it!" }
  ```

- Response `201`: `Rating`.

### `GET /me/ratings`

- Auth: bearer.
- Hook: `useListMyRatingsQuery({ subject_type, subject_id?, page?, per_page? })`.
- Returns the caller's own ratings, optionally narrowed to a specific subject so the post-event "rate this" CTA can detect a duplicate before showing the form.
- Response `200`:

  ```json
  {
    "data": [
      { "id": 12, "subject_type": "event", "subject_id": 16, "stars": 5, "comment": "Loved it!", "created_at": "2026-05-01T18:00:00Z" }
    ]
  }
  ```

### `PATCH /me/ratings/{id}`

- Hook: `useUpdateMyRatingMutation()`. Schema: `updateMyRatingSchema`.
- Request: `{ "stars": 4, "comment": "Updated comment" }`

### `DELETE /me/ratings/{id}`

- Hook: `useDeleteMyRatingMutation()`.

---

## 18. Waitlist

Auth: bearer.

| Method | Path | Hook |
|---|---|---|
| `POST` | `/events/{slug}/waitlist` | `useJoinWaitlistMutation` |
| `DELETE` | `/events/{slug}/waitlist/{entryId}` | `useLeaveWaitlistMutation` |
| `GET` | `/me/waitlist` | `useListMyWaitlistQuery` |

Joining takes no request body.

---

## 19. Notifications

Auth: bearer.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/me/notifications` | `useListNotificationsQuery` |
| `GET` | `/me/notifications/stream` | `useGetNotificationsStreamQuery` |
| `PATCH` | `/me/notifications/{id}/read` | `useMarkNotificationReadMutation` |
| `POST` | `/me/notifications/read-all` | `useMarkAllNotificationsReadMutation` |
| `GET` | `/me/notifications/preferences` | `useGetNotificationPreferencesQuery` |
| `PATCH` | `/me/notifications/preferences` | `useUpdateNotificationPreferencesMutation` |

### `GET /me/notifications`

- Query: `NotificationListQuery` — `page`, `per_page`, `since` (ISO8601 cursor), `kind`, `unread`.
- Response `200`: `Paginated<AppNotification> & { unread_count: number }`. The bell badge reads `unread_count` directly off the paginator envelope, so no second round-trip is needed.

  ```json
  {
    "data": [{ "id": 1, "title": "Order confirmed", "kind": "order", "read_at": null, "created_at": "2026-05-07T18:00:00Z" }],
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "unread_count": 4
  }
  ```

### `GET /me/notifications/stream`

- Returns a polling-guidance payload (no SSE yet). The bell widget reads `transport` and `poll_interval_seconds` to size its retry cadence and uses `since` as the cursor for the next list call.

  ```json
  {
    "transport": "polling",
    "message": "Use polling for new notifications.",
    "since": "2026-05-07T18:30:00Z",
    "poll_interval_seconds": 30
  }
  ```

  Keeping the shape a discriminated union (`transport`) lets the backend swap to SSE / WebSocket later without breaking the type.

### Preferences

Preferences body (Schema: `notificationPrefsSchema`):

```json
{ "email": true, "push": true, "sms": false }
```

For the broader profile preference blob (language, theme, marketing) use `GET/PATCH /me/preferences` instead.

---

## 20. Support

Auth: bearer.

### Cases

| Method | Path | Hook |
|---|---|---|
| `GET` | `/me/support-cases` | `useListSupportCasesQuery` |
| `POST` | `/me/support-cases` | `useCreateSupportCaseMutation` |
| `GET` | `/me/support-cases/{id}` | `useGetSupportCaseQuery` |
| `POST` | `/me/support-cases/{id}/messages` | `usePostSupportCaseMessageMutation` |
| `POST` | `/me/support-cases/{id}/close` | `useCloseSupportCaseMutation` |
| `POST` | `/me/support-cases/{id}/reopen` | `useReopenSupportCaseMutation` |

`createSupportCaseSchema` enforces `category ∈ { technical, ticket, dispute_organizer, account, other }`, 4–140 char subject, 10–4000 char message.

### Live chat

| Method | Path | Hook |
|---|---|---|
| `POST` | `/support/chat` | `useStartSupportChatMutation` |
| `GET`  | `/support/chat/{sessionId}` | `useGetSupportChatSessionQuery` |
| `POST` | `/support/chat/{sessionId}/messages` | `usePostSupportChatMessageMutation` |
| `POST` | `/support/chat/{sessionId}/promote` | `usePromoteSupportChatMutation` |

`promote` converts an in-flight chat session into a tracked support case. `GET /support/chat/{sessionId}` returns the full session detail used to hydrate the chat widget on reload:

```json
{
  "id": 42,
  "status": "active",
  "topic": "Refund question",
  "created_at": "2026-05-07T18:00:00Z",
  "messages": [
    { "id": 1, "session_id": 42, "sender": "user", "body": "Hi", "created_at": "2026-05-07T18:00:01Z" },
    { "id": 2, "session_id": 42, "sender": "bot",  "body": "Hello, how can I help?", "created_at": "2026-05-07T18:00:02Z" }
  ]
}
```

---

## 21. Complaints

Auth: bearer.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/me/complaints` | `useListComplaintsQuery` |
| `POST` | `/me/complaints` | `useCreateComplaintMutation` |
| `GET` | `/me/complaints/{id}` | `useGetComplaintQuery` |
| `POST` | `/me/complaints/{id}/withdraw` | `useWithdrawComplaintMutation` |
| `GET` | `/complaints/categories` | `useGetComplaintCategoriesQuery` |

`createComplaintSchema` enforces `category ∈ { organizer, venue, safety, staff, other }`, 4–140 char subject, 20–4000 char body.

### `GET /complaints/categories`

- Auth: bearer (kept consistent with other complaints endpoints; the lookup itself isn't sensitive but the front-end never requests it before login).
- Drives the cascading "category → subcategory" select in the complaint form so the SPA never has to hardcode the taxonomy.
- Response `200`:

  ```json
  {
    "data": [
      {
        "id": "organizer",
        "label": "Organizer",
        "label_ar": "المنظم",
        "subcategories": [
          { "id": "missed_show", "label": "Missed show" },
          { "id": "misleading_info", "label": "Misleading information" }
        ]
      }
    ]
  }
  ```

---

## 22. Role applications

Auth: bearer. `GET /role-applications/me` returns the three application slots (talent / vendor / organizer) for the current user. Each role has its own create + edit + transition lifecycle, plus a media/document/gallery sub-resource.

### Common

- `GET /role-applications/me` — `useGetMyRoleApplicationsQuery`.
- `GET /role-applications/{role}/{id}` — `useGetRoleApplicationQuery({ role, id })`. Returns the merged single-resource view used by the wizard step to seed its form. The application core is merged with the matching `talent_application` / `vendor_application` / `organizer_application` sub-blob so all nested media, documents, gallery items, and social links arrive in a single round-trip:

  ```json
  {
    "id": 42,
    "kind": "talent",
    "status": "draft",
    "submitted_at": null,
    "talent_application": {
      "id": 11,
      "stage_name": "DJ Layla",
      "bio": "…",
      "saudi_region_id": 1,
      "city": "Riyadh",
      "travel_ready": true,
      "verification_media": [{ "url": "https://…/cert.pdf", "kind": "certificate" }]
    }
  }
  ```

  The hook accepts both `RoleApplicationDetail` and `{ data: RoleApplicationDetail }` envelopes. **Note**: the full set of frontend wizard fields is not yet confirmed against `PATCH /role-applications/{role}/{id}` — see [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md) for the open questions.

### Talent (`/role-applications/talent`)

| Method | Path | Hook |
|---|---|---|
| `POST` | `/role-applications/talent` | `useCreateTalentApplicationMutation` |
| `PATCH` | `/role-applications/talent/{id}` | `useUpdateTalentApplicationMutation` |
| `POST` | `/role-applications/talent/{id}/submit` | `useSubmitTalentApplicationMutation` |
| `POST` | `/role-applications/talent/{id}/resubmit` | `useResubmitTalentApplicationMutation` |
| `POST` | `/role-applications/talent/{id}/withdraw` | `useWithdrawTalentApplicationMutation` |
| `POST` | `/role-applications/talent/{id}/media` | `useAddTalentMediaMutation` |
| `DELETE` | `/role-applications/talent/{id}/media/{mediaId}` | `useDeleteTalentMediaMutation` |

`createTalentApplicationSchema` body: `{ stage_name, contact_email, contact_phone }`.

### Vendor (`/role-applications/vendor`)

| Method | Path | Hook |
|---|---|---|
| `POST` | `/role-applications/vendor` | `useCreateVendorApplicationMutation` |
| `PATCH` | `/role-applications/vendor/{id}` | `useUpdateVendorApplicationMutation` |
| `POST` | `/role-applications/vendor/{id}/submit` | `useSubmitVendorApplicationMutation` |
| `POST` | `/role-applications/vendor/{id}/resubmit` | `useResubmitVendorApplicationMutation` |
| `POST` | `/role-applications/vendor/{id}/withdraw` | `useWithdrawVendorApplicationMutation` |
| `POST` | `/role-applications/vendor/{id}/documents` | `useAddVendorDocumentMutation` |
| `DELETE` | `/role-applications/vendor/{id}/documents/{docId}` | `useDeleteVendorDocumentMutation` |
| `POST` | `/role-applications/vendor/{id}/gallery` | `useAddVendorGalleryItemMutation` |
| `DELETE` | `/role-applications/vendor/{id}/gallery/{itemId}` | `useDeleteVendorGalleryItemMutation` |

`createVendorApplicationSchema` body: `{ business_name, contact_email, contact_phone, service_categories[] }`.

### Organizer (`/role-applications/organizer`)

| Method | Path | Hook |
|---|---|---|
| `POST` | `/role-applications/organizer` | `useCreateOrganizerApplicationMutation` |
| `PATCH` | `/role-applications/organizer/{id}` | `useUpdateOrganizerApplicationMutation` |
| `POST` | `/role-applications/organizer/{id}/submit` | `useSubmitOrganizerApplicationMutation` |
| `POST` | `/role-applications/organizer/{id}/resubmit` | `useResubmitOrganizerApplicationMutation` |
| `POST` | `/role-applications/organizer/{id}/withdraw` | `useWithdrawOrganizerApplicationMutation` |
| `POST` | `/role-applications/organizer/{id}/social-links` | `useAddOrganizerSocialLinkMutation` |
| `DELETE` | `/role-applications/organizer/{id}/social-links/{linkId}` | `useDeleteOrganizerSocialLinkMutation` |

`createOrganizerApplicationSchema` body: `{ display_name, email, contact_phone, is_company }`.

---

## 23. Reference data

Auth: none for the lookups; bearer for `/complaints/categories` (already authenticated context). All four hooks live in [`src/api/endpoints/reference.ts`](src/api/endpoints/reference.ts).

| Method | Path | Hook |
|---|---|---|
| `GET` | `/events/categories` | `useGetEventCategoriesQuery` |
| `GET` | `/events/cities` | `useGetEventCitiesQuery` |
| `GET` | `/reference/saudi-regions` | `useGetSaudiRegionsQuery` |
| `GET` | `/complaints/categories` | `useGetComplaintCategoriesQuery` |

### `GET /reference/saudi-regions`

- Returns the full Saudi Arabia region → city tree used by the talent / vendor onboarding wizards. Cached at the module level; the SPA hydrates it once at app boot.
- Response `200`:

  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Riyadh Region",
        "name_ar": "منطقة الرياض",
        "cities": [
          { "id": 11, "name": "Riyadh", "name_ar": "الرياض" },
          { "id": 12, "name": "Diriyah", "name_ar": "الدرعية" }
        ]
      }
    ]
  }
  ```

The other three lookups are documented inline next to their consuming sections (events §7, complaints §21).

---

## 24. Favorites

Auth: bearer.

| Method | Path | Hook |
|---|---|---|
| `GET` | `/me/favorites` | `useListMyFavoritesQuery` |
| `PUT` | `/me/favorites/{eventId}` | `useToggleFavoriteMutation` |

### `GET /me/favorites`

- Hook: `useListMyFavoritesQuery({ page, per_page })`.
- Response `200`: `Paginated<FavoriteEvent>` — the event card payload always carries `is_favorited: true` and a `favorited_at` timestamp so the heart icon hydrates correctly without an extra round-trip:

  ```json
  {
    "data": [
      {
        "id": 16,
        "slug": "riyadh-symphony-2026",
        "title": "Riyadh Symphony 2026",
        "city": "Riyadh",
        "venue": "King Fahd Cultural Centre",
        "date_start": "2026-05-30T19:00:00Z",
        "is_favorited": true,
        "favorited_at": "2026-05-07T17:55:00Z"
      }
    ],
    "current_page": 1,
    "per_page": 20,
    "total": 1
  }
  ```

### `PUT /me/favorites/{eventId}`

- Hook: `useToggleFavoriteMutation({ eventId })`. Schema: `toggleFavoriteSchema`.
- Idempotent toggle: backend looks at the current state of the (user, event) pair and writes the opposite, returning the resulting state.
- Response `200`:

  ```json
  { "event_id": 16, "is_favorited": true, "favorited_at": "2026-05-07T17:55:00Z" }
  ```

  When the toggle un-favorites, `is_favorited` is `false` and `favorited_at` is `null`.

---

## 25. Coverage matrix (frontend ↔ backend)

Historical traceability table mapping the original mock domains (now retired — see [`MOCK_API_REFERENCE.md`](MOCK_API_REFERENCE.md)) to the real API endpoints. The "Historical mock source" column links to file paths under `src/services/*` that no longer exist; they are kept here as provenance.

| Frontend feature | Historical mock source | Real endpoint(s) |
|---|---|---|
| Events list / detail / categories | [`eventsService.ts`](src/services/eventsService.ts) | `GET /events`, `GET /events/featured`, `GET /events/{slug}`, `…/ticket-types`, `…/seats`, `…/lineup`, `…/gallery`, `…/occurrences`, `…/ratings`, `GET /events/categories`, `GET /events/cities` |
| Marketplace talents/vendors/organizers | [`marketplaceService.ts`](src/services/marketplaceService.ts) | `GET /talents`, `/vendors`, `/organizers` (+ `/{slug}` and `/ratings`) |
| Auth + sessions + onboarding | [`AuthContext.tsx`](src/contexts/AuthContext.tsx) | `POST /auth/*` (incl. `password/change` + `email/change`), `GET/PATCH/DELETE /me`, `GET/DELETE /me/sessions/*`, `…/devices` (incl. `GET`), `/role-applications/*` (incl. `GET /role-applications/{role}/{id}`) |
| Profile preferences | [`ProfileSettingsPage.tsx`](src/pages/profile/ProfileSettingsPage.tsx) | `GET/PATCH /me/preferences` |
| My tickets, gifting, refund, cancel, overlap | [`ticketsService.ts`](src/services/ticketsService.ts) | `GET/POST /me/tickets/*` (incl. `check-overlap`, `{id}/cancel`) and `/orders/*` |
| Auction listing / cancellation / stats | [`auctionService.ts`](src/services/auctionService.ts) | `GET /auctions`, `GET /auctions/stats`, `POST /me/auctions`, `POST /auctions/{id}/cancel`, plus `/bids` and `/buy-now` |
| Engagements + talent availability | [`engagementsService.ts`](src/services/engagementsService.ts) | `GET/POST /me/engagements`, `accept/decline/messages/complete`, `GET/PUT /me/talent-availability` |
| Waitlist | [`waitlistService.ts`](src/services/waitlistService.ts) | `POST/DELETE /events/{slug}/waitlist`, `GET /me/waitlist` |
| Notifications | [`NotificationContext.tsx`](src/contexts/NotificationContext.tsx) | `/me/notifications/*` (with `?since` + `unread_count`), `/me/notifications/stream` |
| Support chat + ticket form | [`SupportPage.tsx`](src/pages/support/SupportPage.tsx) | `/me/support-cases/*`, `/support/chat/*` (incl. `GET /support/chat/{sessionId}`) |
| Ratings (event detail + post-event CTA) | [`ratingsService.ts`](src/services/ratingsService.ts) | `POST /ratings`, `GET /me/ratings`, `PATCH/DELETE /me/ratings/{id}` |
| Complaints | [`complaintsService.ts`](src/services/complaintsService.ts) | `/me/complaints/*`, `GET /complaints/categories` |
| Gifts inbox | [`giftsService.ts`](src/services/giftsService.ts) | `GET /me/gifts`, `POST /me/gifts/{id}/claim` |
| Favorites / hearted events | [`localStorage`](src/services) (`myticket:favorite-event-ids`) | `GET /me/favorites`, `PUT /me/favorites/{eventId}` |
| Reference taxonomies (categories / cities / regions / complaint subcats) | inline constants | `GET /events/categories`, `GET /events/cities`, `GET /reference/saudi-regions`, `GET /complaints/categories` |
| Payment simulation | [`paymentMock.ts`](src/lib/paymentMock.ts) | Provider-specific — pair with `/orders/{id}/confirm-payment`. The Yup `cardPaymentSchema` keeps the same Luhn/scheme rules. |

### Backend gaps to coordinate

After the 2026-05-07 backend update, the only remaining gap is gap **#16** in [`BACKEND_GAPS.md`](BACKEND_GAPS.md): the full set of frontend fields that the role-application wizards collect has not been confirmed against `PATCH /role-applications/{role}/{id}`. Sub-resource POSTs (`addTalentMedia`, `addVendorDocument`, `addVendorGalleryItem`, `addOrganizerSocialLink`) cover the array fields; the remaining scalar / boolean fields are tracked in [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md). Two minor open questions live there as well (gate-validate audience, device list `last_seen_at` shape).

### Endpoints reserved for backend admins

`/api/v1/admin/*` is documented in `collection.json` but excluded from this scaffold. Those routes power a separate admin dashboard and must not be called from the public site.
