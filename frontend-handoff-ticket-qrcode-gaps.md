# Ticket QR handoff — implementation notes & gaps

**Handoff source:** [`frontend-handoff-ticket-qrcode.md`](frontend-handoff-ticket-qrcode.md)  
**Date reviewed:** 2026-05-21 (updated after backend QR handoff)  
**Backend updates:** [`frontend-handoff-ticket-qrcode-backend-updates.md`](frontend-handoff-ticket-qrcode-backend-updates.md)  
**Main app status:** Buyer QR uses **`qr_scan_value` ?? `code`**; confirm-payment success shows inline QRs; holder validate via **`POST /me/tickets/{id}/validate`**.

---

## What was implemented in this repo

| Handoff requirement | Implementation |
|---------------------|----------------|
| QR drawn on the client (no API image) | [`src/lib/ticketQr.ts`](src/lib/ticketQr.ts) — `qrcode` → PNG data URL |
| Encode **`ticket.code`** for gate scan | `ticketQrScanValue({ qr_scan_value, code })` + `useTicketQrDataUrl(scanValue)` |
| Confirm-payment `tickets[]` on success | [`CheckoutPage`](src/pages/checkout/CheckoutPage.tsx) + [`CheckoutSuccessTickets`](src/components/tickets/CheckoutSuccessTickets.tsx) |
| Holder `POST /me/tickets/{id}/validate` | [`useValidateTicketQrMutation`](src/api/endpoints/tickets.ts) on detail (optional button) |
| Detail from **`GET /me/tickets/{id}`** | [`useGetMyTicketQuery`](src/api/endpoints/tickets.ts) on [`TicketDetailPage`](src/pages/tickets/TicketDetailPage.tsx) |
| List without `signed_qr_payload` | [`MyTicketsPage`](src/pages/tickets/MyTicketsPage.tsx) uses list endpoint only |
| Status copy for `used` / invalid states | [`TicketQrPanel`](src/components/tickets/TicketQrPanel.tsx) + `ticketQrStatusMessage()` |
| PDF includes QR from same scan value | [`downloadTicketPdf`](src/lib/ticketPdfDownload.ts) uses `scanValue` / `ticket.code` |
| Do not encode `signed_qr_payload` in QR | Removed prior behavior that encoded the encrypted blob |

---

## Intentional differences from the handoff doc

| Topic | Handoff suggests | This codebase |
|-------|------------------|---------------|
| QR library | `qrcode.react` (`QRCodeSVG`) | [`qrcode`](https://www.npmjs.com/package/qrcode) (already installed) — generates PNG data URLs; same matrix content |
| API client examples | Standalone `fetch` helpers | RTK Query in [`src/api/endpoints/tickets.ts`](src/api/endpoints/tickets.ts) (same routes, existing auth base URL) |
| Env var name | `VITE_API_URL` | `VITE_API_BASE_URL` + `VITE_API_PREFIX` via [`src/api/baseApi.ts`](src/api/baseApi.ts) |

No change required unless you want SVG-in-DOM rendering for accessibility or styling.

---

## Resolved (backend QR updates, 2026-05-18)

| Former gap | Status |
|------------|--------|
| `signed_qr_payload` / hash alignment | Backend heals on first detail load; frontend optional **Verify ticket authenticity** on detail |
| Post-payment QR without detail GET | **Done** — `Order.tickets` from confirm-payment rendered in success modal |
| Confirm-payment `tickets[]` typing | **Done** — [`ConfirmPaymentTicket`](src/api/types/ticket.ts), [`unwrapOrderResponse`](src/api/endpoints/orders.ts) |

---

## Remaining gaps (if any)

### 4. Scanner app (out of scope for main website)

Handoff §8: separate `/api/v1/scanner`, `ticket_code` = scanned string.  
This repo is the **buyer** site only; no scanner client here.

---

### 5. `TicketDetail` vs unified `Ticket` type

Handoff defines `TicketDetail extends Ticket` with required `signed_qr_payload`.  
We use a single [`Ticket`](src/api/types/ticket.ts) interface with optional `signed_qr_payload` and a separate `TicketDetail` extension for documentation — detail query still returns `Ticket`.

---

### 6. Security / analytics

Handoff §9: avoid logging `signed_qr_payload` and tokens.  
**Action:** Ensure production logging/analytics do not capture ticket detail responses wholesale (code review / Sentry scrubbing if applicable).

---

### 7. Email / PDF from server

Handoff §7.8: invoice email is plain `ticket.code` text only.  
**Aligned:** App is the QR display source; PDF download is client-generated.

---

## QA checklist (from handoff §12)

| Check | Status |
|-------|--------|
| QR encodes `data.code`, not `signed_qr_payload` | Done |
| Detail fetched before QR (`GET /me/tickets/{id}`) | Done |
| List works without `signed_qr_payload` | Done |
| After payment, user can reach QR via list → detail | Done (inline QRs on confirm success when `tickets[]` returned) |
| `used` / `cancelled` / `refunded` show clear status | Done on detail QR panel |
| Scanner sends `ticket_code` | N/A in this app |

---

## Related files

- [`src/lib/ticketQr.ts`](src/lib/ticketQr.ts) — scan value + QR generation hook
- [`src/components/tickets/TicketQrPanel.tsx`](src/components/tickets/TicketQrPanel.tsx) — UI
- [`src/pages/tickets/TicketDetailPage.tsx`](src/pages/tickets/TicketDetailPage.tsx) — wiring
- [`src/lib/ticketMappers.ts`](src/lib/ticketMappers.ts) — maps API `code` → `ticketCode`
- [`src/lib/ticketPdfDownload.ts`](src/lib/ticketPdfDownload.ts) — PDF QR

---

## Backend confirmation (addressed in backend-updates handoff)

1. `GET /me/tickets/{id}` returns `code`, `qr_scan_value`, and `signed_qr_payload` for holders; first load may heal legacy hashes and `*_cache` fields.  
2. `POST /orders/{id}/confirm-payment` returns lean `data.tickets[]` with `code` / `qr_scan_value`.  
3. Validate is **`POST /me/tickets/{id}/validate`** (auth, holder-only); `valid: false` means payload mismatch (not a transport error).  
4. Event times on ticket UI use **`starts_at_cache` / `ends_at_cache`** via [`ticketMappers`](src/lib/ticketMappers.ts) — not `created_at`.
