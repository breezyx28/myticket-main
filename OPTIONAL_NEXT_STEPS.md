# Optional next steps (post wrap-up)

> **Context:** The main website integration is wrapped per [`REMAINING_WORK.md`](REMAINING_WORK.md) (2026-05-09). This file is a **planning backlog only** — nothing here is required to consider the project complete.

---

## 1. Optional product polish

Ship only if product asks for the surface area. No frontend blockers remain for the core flows.

### 1.1 My auctions page

**Goal:** Dedicated UI for “my listings” — cancel listing and bid history (and any copy product wants).

**Starting points:**

- Hooks already scaffolded in [`src/api/endpoints/auctions.ts`](src/api/endpoints/auctions.ts): `useListMyAuctionsQuery`, `useListMyAuctionBidsQuery`, `useCancelAuctionMutation`.
- Wire a new route (e.g. under profile or tickets) and empty-state handling when the user has no listings.

**Risks / notes:** Align URL and IA with product; confirm backend pagination/filter semantics if lists grow.

### 1.2 Direct add saved card on Profile

**Goal:** Let users add a payment method from account settings without going through checkout.

**Blocker class:** Same as production card tokenization / gateway questions that affect buy-now and checkout — needs explicit backend contract (tokenization endpoint, PCI boundary).

**When unblocked:** Reuse patterns from checkout saved-card flow and [`src/api/endpoints/savedCards.ts`](src/api/endpoints/savedCards.ts) (or equivalent) once confirmed.

### 1.3 Notifications transport upgrade

**Goal:** Move from polling to push-style updates (SSE or WebSocket) when scale or UX requires it.

**Starting points:**

- [Phase 9 — Notifications](IMPLEMENTATION_PHASES.md#phase-9--notifications) documents polling-only today.
- Backend already exposes a `transport` (or similar) discriminator in types so clients can swap transport without breaking the rest of the notification model.

**Risks / notes:** Reconnection, auth on the stream, and fallback when streaming fails.

---

## 2. Optional engineering polish

### 2.1 Seat selection bundle size

**Observation:** Vite reports [`src/pages/checkout/SeatSelectionPage.tsx`](src/pages/checkout/SeatSelectionPage.tsx) as a large lazy chunk (~1 MB minified / ~284 kB gzip in a typical build). It is already code-split from the main bundle.

**Possible directions (pick based on profiling):**

- Lazy-load heavy seat-map / carousel dependencies inside the page.
- Split seat UI into nested `React.lazy` boundaries (map vs. sidebar vs. summary).
- Audit duplicate heavy imports shared with other routes and dedupe via dynamic import.

**Success metric:** Chunk under Vite’s default warning threshold without regressing UX.

---

## 3. Backend-dependent caveats (no dedicated frontend “task” unless API changes)

These are already documented in [`REMAINING_WORK.md` §1](REMAINING_WORK.md); listed here for planning visibility.

| Topic | Current state | Frontend follow-up when backend changes |
|------|----------------|----------------------------------------|
| Vendor `service_categories` on PATCH | May not persist on PATCH today — see JSDoc on `UpdateVendorApplicationRequest` | Re-test vendor onboarding/edit; adjust UI copy if field is dropped or fixed |
| `GET /me/devices` — `is_current` | Not shipped yet — `UserDevice.is_current` optional | Show “This device” badge on Profile when field appears |

---

## 4. Documentation housekeeping

| Item | Action |
|------|--------|
| [`BACKEND_GAPS.md`](BACKEND_GAPS.md) | Optional archive or mark historical; [`BACKEND_GAPS_FOLLOWUP.md`](BACKEND_GAPS_FOLLOWUP.md) remains the resolved ledger |
| Living references | Continue to treat [`API_REFERENCE.md`](API_REFERENCE.md), [`myticket_main_website_flow.md`](myticket_main_website_flow.md), and [`IMPLEMENTATION_PHASES.md`](IMPLEMENTATION_PHASES.md) as authoritative for contract and phase history |

---

## 5. Suggested order (if you implement multiple items)

1. **Seat selection chunk** — pure frontend perf; no product sign-off beyond QA.
2. **My auctions page** — product-visible; uses existing hooks.
3. **Notifications transport** — infra + frontend; coordinate with backend.
4. **Profile saved card** — blocked until tokenization contract is explicit.

---

## How this relates to other docs

| Document | Role |
|----------|------|
| [`REMAINING_WORK.md`](REMAINING_WORK.md) | Project status snapshot; §3 mirrors the **optional polish** bullets at a high level |
| This file | Expandable **plan** for those optionals + perf + housekeeping |

When an item ships, update or remove its section here and trim [`REMAINING_WORK.md`](REMAINING_WORK.md) §3 if that list shrinks.
