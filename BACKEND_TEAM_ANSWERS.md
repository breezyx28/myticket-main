# Backend Team Answers — Frontend Main Website Questions

Date: 2026-05-09  
Scope: Responses to `BACKEND_TEAM_QUESTIONS.md` based on current backend implementation in `/api/v1/main/*` and `/api/v1/scanner/*`.

---

## 1) Role-applications PATCH body fields

Talent:
  - profile_image: A

Vendor:
  - extra fields: none

Organizer:
  - profile_image: A
  - optional_document: A

Cross-role:
  - file uploads: URL string

### Implementation notes
- Talent/Organizer `profile_image` is accepted as a string on PATCH and persisted to `profile_image_url`.
- Organizer `optional_document` is accepted as a string on PATCH and persisted to `document_url`.
- Vendor PATCH currently persists: `business_name` (mapped to `profile_name`), `contact_email`, `contact_phone`, `bio`, `city`, `coverage_area`.
- For these fields, backend validation expects JSON string fields (not multipart on PATCH).
- Existing sub-resource endpoints remain:
  - `POST /role-applications/talent/{id}/media`
  - `POST /role-applications/vendor/{id}/documents`
  - `POST /role-applications/vendor/{id}/gallery`
  - `POST /role-applications/organizer/{id}/social-links`

---

## 2) `GET /me/devices` row shape

- timestamp field name: last_seen_at
- extra metadata: token, is_active, revoked_at, updated_at, user_id (plus app/platform/device_label/id/created_at)
- current-device flag: not yet

### Implementation notes
- Current response is raw active `DevicePushToken` rows under `{ data: [...] }`.
- There is no computed `is_current` / `current` / `is_self` field on this endpoint today.

---

## 3) Gate ticket validation — audience

Audience: Option 2

If Option 2:
  - confirm SPA hook can be deleted: yes

### Implementation notes
- Current `POST /api/v1/main/tickets/{ticketId}/validate` is on the main API but is not role-gated and is outside main auth middleware.
- Canonical gate scanning flow is implemented in scanner endpoints (`/api/v1/scanner/*`) with Sanctum scanner scope and scanner assignment checks.
- Because scanner flow is the intended gate path, frontend can remove the main SPA `validateTicket` hook if not needed.

---

## Source-of-truth files checked

- `routes/api_main.php`
- `routes/api_scanner.php`
- `app/Http/Controllers/Api/V1/Main/RoleApplications/RoleApplicationController.php`
- `app/Http/Controllers/Api/V1/Auth/AuthController.php`
- `app/Http/Controllers/Api/V1/Main/Booking/MainBookingController.php`
- `app/Http/Controllers/Api/V1/Scanner/ScannerAppController.php`
- `app/Models/DevicePushToken.php`
