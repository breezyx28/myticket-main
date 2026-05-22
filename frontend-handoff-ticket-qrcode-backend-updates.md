# Ticket QR — backend updates (React handoff)

**Date:** 2026-05-18  
**Audience:** Main website (React / TypeScript)  
**Related:** [`frontend-handoff-ticket-qrcode.md`](frontend-handoff-ticket-qrcode.md), [`frontend-handoff-ticket-qrcode-gaps.md`](frontend-handoff-ticket-qrcode-gaps.md)

---

## Summary

| Topic | Change |
|-------|--------|
| Issue-time QR hashes | Canonical plaintext `tic-{code}.{event_id}.{ticket_id}` at issue and on detail |
| `signed_qr_payload` | Matches `qr_payload_hash`; legacy rows healed on first `GET /me/tickets/{id}` |
| Gate scanner | **Unchanged** — QR still encodes `ticket.code`; scanner sends `ticket_code` |
| Confirm payment | Response includes lean `data.tickets[]` with `code` and `qr_scan_value` |
| Validate | **Authenticated** holder-only; route moved under `/me/tickets/{id}/validate` |

---

## Canonical QR payload (server-side)

Plaintext (not sent to clients for gate scan):

```text
tic-{code}.{event_id}.{ticket_id}
```

- `code` — public ticket code (`TIC-` + 14 chars), same value used in gate QR.
- `signed_qr_payload` — `Crypt::encryptString(plaintext)`; use only for optional in-app authenticity check.
- `qr_scan_value` — alias of `code` on detail and confirm-payment ticket rows.

---

## API contracts

### `POST /api/v1/main/orders/{id}/confirm-payment`

**Auth:** Bearer (main website scope)

After success, `data.tickets` is a lean array (not the full ticket model):

```json
{
  "data": {
    "id": 10,
    "payment_status": "approved",
    "tickets": [
      {
        "id": 42,
        "code": "TIC-6ZAZYTFABRQBUX",
        "status": "active",
        "event_id": 18,
        "seat_label_cache": "A-12",
        "type_name_cache": "VIP",
        "qr_scan_value": "TIC-6ZAZYTFABRQBUX"
      }
    ]
  }
}
```

**React:** No extra `GET` required for checkout success QR:

```ts
const order = confirmPaymentResponse.data;
const codes = order.tickets?.map((t) => t.code) ?? [];
// Pass each code to ticketQrScanValue() / useTicketQrDataUrl()
```

Extend `Order` (or confirm response type) with optional `tickets?: Array<{ id: number; code: string; status: string; qr_scan_value?: string; ... }>`.

---

### `GET /api/v1/main/me/tickets/{id}`

**Auth:** Bearer; holder only.

Adds / stabilizes:

| Field | Description |
|-------|-------------|
| `code` | Gate scan value |
| `qr_scan_value` | Same as `code` (explicit for UI) |
| `signed_qr_payload` | Encrypted canonical payload; validates against DB after heal |

Legacy tickets (issued before this change) get `qr_payload_hash` / `qr_secret_hash` updated on first detail load so `signed_qr_payload` validates.

---

### `POST /api/v1/main/me/tickets/{id}/validate` (optional product feature)

**Auth:** Bearer; **403** if authenticated user is not `holder_user_id`.

**Was:** `POST /api/v1/main/tickets/{ticketId}/validate` (public) — **removed**.

| Body | Type | Description |
|------|------|-------------|
| `qr_payload` | string | Value of `signed_qr_payload` from ticket detail |

**Response:**

```json
{
  "valid": true,
  "scanned_at": "2026-05-18T12:00:00+00:00",
  "ticket": {
    "id": 42,
    "code": "TIC-6ZAZYTFABRQBUX",
    "status": "active"
  }
}
```

**React example:**

```ts
await api.post(`/me/tickets/${ticketId}/validate`, {
  qr_payload: ticket.signed_qr_payload,
});
```

Do **not** put `signed_qr_payload` in the QR image for gate entry.

---

## Gate scanner (unchanged)

- Buyer QR matrix: **`ticket.code`** only.
- Scanner app: `POST /api/v1/scanner/scans` with `ticket_code` = scanned string.

---

## Migration notes

1. **Existing production tickets** — First detail fetch heals hashes; no manual migration.
2. **Frontend route change** — Replace any call to `/tickets/{id}/validate` with `/me/tickets/{id}/validate` and send Authorization header.
3. **Checkout success** — Prefer `data.tickets[].code` from confirm-payment; detail GET still needed for full caches / PDF metadata.

---

## TypeScript snippets

```ts
export type ConfirmPaymentTicket = {
  id: number;
  code: string;
  status: string;
  event_id: number;
  seat_label_cache?: string | null;
  type_name_cache?: string | null;
  qr_scan_value: string;
};

export type TicketDetail = Ticket & {
  signed_qr_payload: string;
  qr_scan_value: string;
};

export function ticketQrScanValue(ticket: { code: string; qr_scan_value?: string }): string {
  return ticket.qr_scan_value ?? ticket.code;
}
```

---

## QA (backend-verified)

| Check | Expected |
|-------|----------|
| Issue → detail `signed_qr_payload` | `POST .../validate` → `valid: true` for holder |
| Confirm payment | `data.tickets[0].code` starts with `TIC-` |
| Validate without auth | `401` |
| Validate as non-holder | `403` |
| Legacy row | Detail load updates hash; validate succeeds |

Tests: `BookingPaymentsFlowTest`, `TicketQrPayloadTest`, `MainPublicEndpointsTest`.

---

## Main website field mapping (post-deploy)

| UI | API field |
|----|-----------|
| Draw gate QR | `data.code` or `data.qr_scan_value` (same `TIC-…` string) |
| Event date/time on ticket page | `data.starts_at_cache` / `data.ends_at_cache` — **not** `created_at` |
| Optional authenticity button | `POST /me/tickets/{id}/validate` with `signed_qr_payload` from latest detail GET |
| Checkout success QR | `confirm-payment` → `data.tickets[].code` or `qr_scan_value` |
| List (`GET /me/tickets`) | No `signed_qr_payload` / `qr_scan_value`; open detail for QR + verify |

**Legacy heal:** First `GET /me/tickets/{id}` after deploy may update `qr_payload_hash`, caches, and `signed_qr_payload` in DB. Refresh detail (or use Verify — main app refetches detail first) before expecting `valid: true`.

**Scanner (separate app):** `POST /scanner/scans` with `ticket_code` = scanned `TIC-…`. `result: "expired"` may include `event_window` + `failure_reason` (e.g. `after_window`); gate QR content unchanged.
