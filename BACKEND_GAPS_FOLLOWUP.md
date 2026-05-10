# Backend gaps follow-up — resolved (2026-05-09)

> **Source of truth:** [`BACKEND_TEAM_ANSWERS.md`](BACKEND_TEAM_ANSWERS.md) (responses dated 2026-05-09).
>
> This file previously listed **open** questions after the 2026-05-07 backend update. Those items are **closed** on the frontend as of the answers below.

## Resolution summary

| Topic | Answer | Frontend outcome |
|---|---|---|
| **#16 — Role-applications PATCH** | Talent `profile_image`: **A** (PATCH URL string → `profile_image_url`). Organizer `profile_image` + `optional_document`: **A**. Vendor: **no extra fields** beyond wizard; file uploads as URL strings on PATCH (not multipart). | JSDoc on [`src/api/types/roleApplication.ts`](src/api/types/roleApplication.ts) updated to confirmed PATCH fields. |
| **`GET /me/devices` shape** | Timestamp field: **`last_seen_at`**. Extra columns (`token`, `is_active`, etc.) are infra-only for now. **`is_current` / current-device flag: not yet**. | [`UserDevice`](src/api/types/user.ts) keeps optional `is_current` with JSDoc noting not shipped; Profile devices badge unchanged until backend adds the field. |
| **Gate ticket validation audience** | **Option 2** — canonical flow is **scanner** (`/api/v1/scanner/*`). Main SPA `validateTicket` hook **removed**. | [`src/api/endpoints/tickets.ts`](src/api/endpoints/tickets.ts), [`src/api/types/ticket.ts`](src/api/types/ticket.ts); [`API_REFERENCE.md`](API_REFERENCE.md) §12 stub points to scanner. |

### Residual caveat (follow with backend if product needs it)

- **Vendor `service_categories`:** Backend’s vendor PATCH persistence list did **not** include `service_categories`. The orchestrator may still send it on PATCH for forward-compat; today categories are primarily established on **create**. See JSDoc on `UpdateVendorApplicationRequest.service_categories` in [`src/api/types/roleApplication.ts`](src/api/types/roleApplication.ts).

---

## How this maps to phases (historical)

| Item | Affected phase | Status after 2026-05-09 answers |
|---|---|---|
| #16 (role-application PATCH body) | Phase 11 | **Resolved** — PATCH paths confirmed. |
| `GET /me/devices` shape | Phase 2 | **Resolved** for field naming; `is_current` still pending backend. |
| Gate validation audience | Phase 6 | **Resolved** — SPA does not call main validate; scanner owns gate flow. |

Original question text lived in git history before this rewrite; see [`BACKEND_TEAM_QUESTIONS.md`](BACKEND_TEAM_QUESTIONS.md) if needed.
