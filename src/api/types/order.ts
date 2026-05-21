import type { Id, Iso8601, Money } from '@/api/types/common';
import type { ConfirmPaymentTicket } from '@/api/types/ticket';

export type PaymentMethod = 'visa' | 'mastercard' | 'mada' | string;
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | string;

/** @deprecated Prefer `TicketTypeQuantitiesMap` for `POST /orders`. */
export interface TicketTypeQuantity {
  ticket_type_id: Id;
  quantity: number;
}

/** Main API: keys are `event_ticket_types.id`, values are quantities (integers). */
export type TicketTypeQuantitiesMap = Record<string, number>;

export interface CreateOrderRequest {
  event_id: Id;
  lock_id: Id;
  ticket_type_quantities: TicketTypeQuantitiesMap;
  payment_method: PaymentMethod;
  saved_card_id?: Id | null;
  [key: string]: unknown;
}

export interface OrderLine {
  id: Id;
  ticket_type_id: Id;
  ticket_type_name?: string;
  quantity: number;
  unit_price: Money;
  subtotal: Money;
  [key: string]: unknown;
}

export interface Order {
  id: Id;
  reference?: string;
  status: OrderStatus;
  event_id: Id;
  event_title?: string;
  subtotal: Money;
  fees: Money;
  total: Money;
  currency?: string;
  payment_method?: PaymentMethod;
  payment_intent_id?: string | null;
  lines: OrderLine[];
  /** Lean ticket rows after `POST /orders/{id}/confirm-payment` (codes for immediate QR). */
  tickets?: ConfirmPaymentTicket[];
  payment_status?: string;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface ConfirmOrderPaymentRequest {
  payment_intent_id?: string;
  three_ds_token?: string;
  saved_card_id?: Id;
  save_card?: boolean;
  [key: string]: unknown;
}

export interface CancelOrderRequest {
  reason?: string;
}
