import type { Id } from '@/api/types/common';
import type { Order } from '@/api/types/order';
import type { SelectedSeat } from '@/types/seating';

/** Align with API checkout hold TTL (30 min). */
export const SEAT_LOCK_TTL_SECONDS = 1800;

export type CheckoutStep = 1 | 2 | 3;

/** Router `location.state` shared between seat selection and checkout. */
export type CheckoutNavState = {
  selectedSeats?: SelectedSeat[];
  selectedTicketTypeId?: string;
  lockId?: Id | null;
  generalAdmissionQuantity?: number;
  /** Seat hold expired or was released — user must lock again on the map. */
  relockNeeded?: boolean;
  checkoutStep?: CheckoutStep;
};

/** API / gateway copy when a seat lock or hold is no longer valid. */
export function isSeatHoldErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return /lock|hold|expir|reserv|session/.test(lower);
}

/** Payment captured and tickets issued (e.g. confirm returned 500 after success). */
export function isOrderPaidWithTickets(order: Order): boolean {
  const paymentStatus = String(order.payment_status ?? '').toLowerCase();
  const status = String(order.status ?? '').toLowerCase();
  const paid =
    paymentStatus === 'approved' ||
    paymentStatus === 'paid' ||
    status === 'paid';
  return paid && (order.tickets?.length ?? 0) > 0;
}

/**
 * After confirm-payment fails: verify order state, abandon if still pending.
 * API may already abandon on 4xx/5xx; abandon is safe as a no-op when done.
 */
export async function recoverCheckoutAfterConfirmFailure(opts: {
  orderId: Id;
  fetchOrder: (orderId: Id) => Promise<Order>;
  abandonOrder: (orderId: Id) => Promise<unknown>;
}): Promise<'paid' | 'abandoned'> {
  try {
    const order = await opts.fetchOrder(opts.orderId);
    if (isOrderPaidWithTickets(order)) return 'paid';
  } catch {
    /* GET failed — still attempt abandon */
  }
  try {
    await opts.abandonOrder(opts.orderId);
  } catch {
    /* already abandoned server-side */
  }
  return 'abandoned';
}

if (import.meta.env.DEV) {
  const pending = isOrderPaidWithTickets({
    id: 1,
    event_id: 1,
    status: 'pending',
    payment_status: 'pending',
    lines: [],
    subtotal: 0,
    fees: 0,
    total: 0,
  });
  const approved = isOrderPaidWithTickets({
    id: 1,
    event_id: 1,
    status: 'paid',
    payment_status: 'approved',
    tickets: [{ id: 1, code: 'T1', status: 'active', event_id: 1, qr_scan_value: 'x' }],
    lines: [],
    subtotal: 0,
    fees: 0,
    total: 0,
  });
  if (pending || !approved) {
    console.warn('[checkoutNav] isOrderPaidWithTickets self-check failed');
  }
}
