# Frontend handoff: checkout failure rollback & seat inventory

**Date:** 2026-06-24  
**Audience:** Main website checkout (seated + GA)

---

## What went wrong (production)

Checkout is **two API steps**:

1. `POST /orders` — creates a **pending** order and ties seat locks via `held_for_order_id`
2. `POST /orders/{id}/confirm-payment` — captures payment, **issues tickets**, marks seats `booked`

When step 2 failed (validation, save-card DB error, 500, etc.):

| Symptom | Cause |
|---------|--------|
| Seat map shows seats as held/unavailable | Locks stayed active on the failed pending order |
| User forced to re-lock | Old `lock_id` / holds still bound to abandoned checkout |
| Inventory / `quantity_remaining` dropped | **Payment actually succeeded** in step 2 but client got an error (e.g. save-card insert failed **after** tickets were issued) |
| Duplicate tickets after retry | User completed a second successful checkout while first order already issued tickets |

This is **not** a single atomic transaction on the client — and historically the API did not roll back pending orders or release holds on confirm failure.

---

## API fixes (deploy required)

### 1. Automatic rollback on failed confirm

`POST /orders/{id}/confirm-payment` now:

- On **any error before/during** `confirmPayment` while order is still `pending` → **abandons** the order and **releases** seat locks (`released_reason: payment_failed`).
- On **success** with `save_card: true` but save-card failure → still returns **200** with tickets (payment is not rolled back).

### 2. New checkout replaces stale pending orders

`POST /orders` now **abandons all pending orders** for the same `user_id` + `event_id` before creating a new one.

### 3. Explicit abandon endpoint

```
POST /api/v1/main/orders/{id}/abandon
Authorization: Bearer …
```

- Only for **`payment_status: pending`** orders with **no issued tickets**
- Response: `{ "message": "…", "data": { …order } }`
- Releases locks so seats return to the pool

`POST /orders/{id}/cancel` also abandons pending orders (same effect for unpaid checkout).

### 4. Background cleanup

Scheduler runs `orders:abandon-expired-pending` every minute (pending older than checkout hold TTL, default 30 min).

---

## Frontend changes required

### A. On confirm-payment **error** — do not only re-lock

After `POST /orders` succeeds, you have an `orderId`. If `confirm-payment` fails:

```ts
// 1) Check whether payment actually succeeded
const order = await GET /api/v1/main/orders/{orderId}

if (order.payment_status === 'approved' && order.tickets?.length > 0) {
  // Payment succeeded — show success / tickets (save-card may have failed)
  navigateToSuccess(order)
  return
}

// 2) Unpaid checkout — release holds (API may already have done this on 4xx/5xx)
await POST /api/v1/main/orders/{orderId}/abandon   // safe no-op if already abandoned

// 3) Clear stale client state
clearCheckoutState({ lockId: null, orderId: null, relockNeeded: true })

// 4) Send user back to seat map / GA step to acquire a fresh lock
navigateToSeatSelection()
```

**Do not** call `POST /orders` again with the same `orderId` or old `lock_id` without abandoning and re-locking.

### B. Treat `POST /orders` + `confirm-payment` as one logical transaction in UX

| Step | Client responsibility |
|------|----------------------|
| Lock | `POST …/seats/lock` → store `lock_id`, `expires_at` |
| Pay click | `POST /orders` → store `orderId` |
| Confirm | `POST /orders/{orderId}/confirm-payment` immediately |
| Failure | `GET /orders/{orderId}` then `POST …/abandon` if still pending |
| Retry | New lock → new `POST /orders` (API auto-abandons old pending) |

### C. Success detection — use order status, not HTTP status alone

Earlier production bug: confirm returned **500** after tickets were issued (save-card column too small). Frontend must:

```ts
if (confirmResponse.ok) { success() }
else {
  const order = await fetchOrder(orderId)
  if (order.payment_status === 'approved') success(order)
  else handleFailureAndAbandon(orderId)
}
```

### D. Lock TTL — align with API

API default hold is **30 minutes** (`ttl_seconds` up to 1800). Frontend currently sends `ttl_seconds: 180` (3 min) — increase to **1800** or omit (server default) so holds do not expire during checkout.

```json
{ "seat_ids": [...], "ticket_type_id": 1, "ttl_seconds": 1800 }
```

### E. Lock response shape

Lock endpoint returns (not wrapped in `data`):

```json
{
  "locks": [...],
  "lock_id": 12,
  "expires_at": "2026-06-24T19:30:00+00:00",
  "ttl_seconds": 1800,
  "idempotent": false
}
```

Use top-level **`lock_id`** for `POST /orders`.

### F. Optional: abandon on “Leave checkout” / browser back

If user leaves checkout after `POST /orders` but before pay:

```
POST /api/v1/main/orders/{orderId}/abandon
DELETE /api/v1/main/events/{slug}/seats/lock/{lockId}  // optional
```

---

## What the API does **not** roll back

- **Approved orders with tickets** — if payment captured, seats stay sold. Use support/refund flows, not re-lock.
- **Already-booked seats from a succeeded first attempt** — user may need to contact support if they accidentally bought twice.

---

## Updated API cheat sheet (checkout)

| # | Method | Path | When |
|---|--------|------|------|
| 10 | POST | `/orders` | Pay click (abandons prior pending for same event) |
| 11 | POST | `/orders/{id}/confirm-payment` | Immediately after 10 |
| **12** | **POST** | **`/orders/{id}/abandon`** | **Confirm failed or user leaves unpaid checkout** |
| 13 | GET | `/orders/{id}` | **Verify payment_status after any error** |
| 14 | POST | `/orders/{id}/cancel` | User cancel (pending → abandon; paid → cancel tickets) |

---

## Test checklist

- [ ] Lock 3 seats → `POST /orders` → force confirm 422 → seats available again on `GET …/seats` without manual DB fix
- [ ] Same flow → `POST …/abandon` → `POST …/seats/lock` → pay → success
- [ ] Confirm returns 500 but `GET /orders/{id}` shows `approved` → UI shows success
- [ ] Second `POST /orders` for same event auto-cancels first pending order
- [ ] `ttl_seconds: 1800` — checkout completes without lock expiry mid-flow

---

## Summary

| Layer | Issue | Fix |
|-------|--------|-----|
| **API** | Pending orders kept locks after failed confirm | Auto-abandon on confirm error + abandon endpoint + scheduler |
| **API** | Save-card failed after tickets issued | Return 200; save-card errors logged only |
| **Frontend** | Treated all confirm errors as “re-lock only” | `GET /orders/{id}` first; call `/abandon`; then new lock |
| **Frontend** | Short `ttl_seconds: 180` | Use 1800 or server default |
| **Frontend** | Expected atomic rollback without abandon call | Call `POST /orders/{id}/abandon` on unpaid failure |
