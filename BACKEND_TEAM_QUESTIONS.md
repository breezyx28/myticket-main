# Backend team — open questions to unblock the frontend

> **Audience:** backend engineers maintaining `/api/v1/main/*`.
> **Why we're sending this:** the 2026-05-07 backend update resolved 21 of 22 frontend integration gaps. Three items remain. Each one is a small yes/no or "use this body" reply — no design work needed on our side once you respond. We've already shipped defensive frontend placeholders so flipping each item on is a one-line change for us.
>
> **How to respond:** copy the **"Suggested reply format"** block under each question and paste your answers inline. Reply in this thread / file / email — we'll wire each item the same day we get an answer.

---

## 1. Role-applications PATCH body fields

**Endpoint:** `PATCH /role-applications/{role}/{id}`
**Frontend hooks:** `useUpdateTalentApplicationMutation`, `useUpdateVendorApplicationMutation`, `useUpdateOrganizerApplicationMutation` in [`src/api/endpoints/roleApplications.ts`](src/api/endpoints/roleApplications.ts).

### Current frontend behavior

The single-resource GET (`GET /role-applications/{role}/{id}`) ships and lets the wizard rehydrate. We're sending the fields below on the PATCH body **on a best-effort basis** because the wizard collects them but the documented create body doesn't list them. We don't know whether the backend stores them, silently drops them, or expects them on a sub-resource POST.

### What we need

For **each field** below, please reply with one of:

- **A** — accepted on the PATCH body of `PATCH /role-applications/{role}/{id}` (no change needed on our side).
- **B** — must be set via a dedicated sub-resource POST. **If B, please name the endpoint** (e.g. `POST /role-applications/talent/{id}/profile-image`).
- **C** — not stored at all; frontend should drop it.

### Talent (`PATCH /role-applications/talent/{id}`)

Already confirmed accepted on PATCH (no action needed):
`bio`, `saudi_region_id`, `city`, `travel_ready`, `location_public`, `certificate_name`, `accepted_quality_disclaimer`. Verification media is already on the sub-resource `POST /role-applications/talent/{id}/media`.

**Open question:** `profile_image` (string URL from the wizard's avatar picker) — A, B, or C?

### Vendor (`PATCH /role-applications/vendor/{id}`)

Already confirmed accepted on PATCH:
`bio`, `city`, `coverage_area`. Documents and gallery are on the sub-resources `POST /role-applications/vendor/{id}/documents` and `.../gallery`.

**Open question:** any vendor-specific fields besides those above we should be sending? For example, a primary contact name distinct from `business_name`?

### Organizer (`PATCH /role-applications/organizer/{id}`)

Already confirmed accepted on PATCH:
`bio`, `location`, `is_company`, `company_name`, `company_info`, `owner_name`, `owner_info`. Social links are on `POST /role-applications/organizer/{id}/social-links`.

**Open questions:**

1. `profile_image` (string URL from the wizard's avatar picker) — A, B, or C?
2. `optional_document` (string URL from the "verification (optional)" upload) — A, B, or C? There's no dedicated endpoint listed in §22 of `API_REFERENCE.md`.

### Cross-role question

3. Are file URLs accepted as **plain strings** (the SPA already uploads to a CDN and posts the public URL), or does the backend expect **`multipart/form-data`** uploads on these endpoints? If the latter, we need a dedicated upload service path so we can hand the URL/key to the role-application endpoint.

### Why this matters

Until we know, **users uploading a profile image on talent or organizer onboarding may not have it persisted.** The wizard succeeds; the image silently disappears on next load if the field isn't actually stored.

### Suggested reply format

```
Talent:
  - profile_image: [A | B: <endpoint> | C]

Vendor:
  - extra fields: [list any | none]

Organizer:
  - profile_image: [A | B: <endpoint> | C]
  - optional_document: [A | B: <endpoint> | C]

Cross-role:
  - file uploads: [URL string | multipart/form-data]
```

---

## 2. `GET /me/devices` row shape

**Endpoint:** `GET /me/devices`
**Frontend hook:** `useListDevicesQuery` from [`src/api/endpoints/me.ts`](src/api/endpoints/me.ts).

### Current frontend behavior

We render the device list under Profile → Security. Each row currently assumes:

```ts
{
  id: Id,
  app: string,
  platform: 'ios' | 'android' | 'web' | string,
  device_label?: string | null,
  last_seen_at?: string | null,   // ISO8601
  created_at?: string,
  is_current?: boolean,           // optional placeholder; badge hidden until backend confirms
}
```

We've shipped a defensive placeholder for `is_current` — when truthy we render a "This device" badge mirroring the Sessions UX; when missing the row renders identically to today.

### What we need

1. **Field name confirmation:** is the timestamp `last_seen_at` (vs `last_active_at`, `last_seen`, `last_used_at`)?
2. **Extra metadata:** does the row carry anything else worth surfacing? Browser / OS string, IP, push-token state, etc.
3. **`is_current` flag:** is there a way to mark "this is the device the request came from" so we can render a "This device" badge without a separate `/me/sessions` round-trip? If yes, what's the field name (`is_current`, `current`, `is_self`)?

### Why this matters

Soft gap. Without `is_current` we can't match the Sessions UX, but the page still works. Without confirmed field names we'll silently render `—` for any row whose timestamp uses a different key.

### Suggested reply format

```
- timestamp field name: <last_seen_at | last_active_at | last_seen | last_used_at>
- extra metadata: <list fields the SPA should show, or "none">
- current-device flag: <field name | not yet>
```

---

## 3. Gate ticket validation — audience

**Endpoint:** `POST /tickets/{ticketId}/validate`
**Frontend hook:** `useValidateTicketMutation` from [`src/api/endpoints/tickets.ts`](src/api/endpoints/tickets.ts) (currently `@deprecated` JSDoc-warned so no SPA UI imports it).

### Current frontend behavior

The hook exists for forward-compatibility but is **not** used by any end-user UI. We're holding off on building a gate-validator surface until we know who's supposed to call this endpoint.

### What we need

Confirm one of:

- **Option 1 — main SPA, role-gated.** A logged-in gate-staff user opens the main website on a tablet and validates the ticket. The existing bearer auth + a role on `UserMe.roles` is enough.
  - **Sub-question:** what's the role string? (e.g. `gate_staff`, `gate`, `validator`?)
  - **Sub-question:** do you want a dedicated `/gate` route, or surface the action inside the existing ticket detail page when the role is present?
- **Option 2 — separate gate app + non-bearer auth.** Validation happens from a dedicated gate app behind an API key, OAuth client credentials grant, or similar. **The SPA hook becomes dead code** and we'll delete it from [`src/api/endpoints/tickets.ts`](src/api/endpoints/tickets.ts) and [`src/api/types/ticket.ts`](src/api/types/ticket.ts).

### Why this matters

Soft gap. Until we know, the hook stays exported with a deprecation warning. If you've already shipped the endpoint behind Option 2 we'd rather just remove it from the SPA than leave a misleading hook around.

### Suggested reply format

```
Audience: <Option 1 | Option 2>

If Option 1:
  - role string: <e.g. gate_staff>
  - UI placement: <dedicated /gate route | inside ticket detail when role present>

If Option 2:
  - confirm SPA hook can be deleted: <yes | no>
```

---

## Once you reply

Each item maps to a one-line frontend flip:

| Your answer | Our change |
|---|---|
| **#1 A** for any field | Drop the JSDoc note in [`src/api/types/roleApplication.ts`](src/api/types/roleApplication.ts). |
| **#1 B** for any field | Add `addTalentProfileImage` / `addOrganizerProfileImage` / `addOrganizerOptionalDocument` mutation to [`src/api/endpoints/roleApplications.ts`](src/api/endpoints/roleApplications.ts) and update the orchestrator pipeline. |
| **#1 C** for any field | Delete the speculative write in [`src/services/roleApplicationSubmit.ts`](src/services/roleApplicationSubmit.ts) and the field in the request type. |
| **#2** field-name match | No change — we already use `last_seen_at`. |
| **#2** field-name mismatch | Rename in [`src/api/types/user.ts`](src/api/types/user.ts) and one render site in [`src/pages/profile/ProfilePage.tsx`](src/pages/profile/ProfilePage.tsx). |
| **#2** ships `is_current` | No change — the badge appears automatically. |
| **#3 Option 1** | Add a `roles` check in the ticket detail page (or new `/gate` route). |
| **#3 Option 2** | Delete `validateTicket` mutation + types. |

Thanks. Once these three are answered, the project is effectively wrapped on our side — see [`REMAINING_WORK.md`](REMAINING_WORK.md) for the full picture.
