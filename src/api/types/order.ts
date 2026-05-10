import type { Id, Iso8601, Money } from '@/api/types/common';

export type PaymentMethod = 'visa' | 'mastercard' | 'mada' | string;
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | string;

export interface TicketTypeQuantity {
  ticket_type_id: Id;
  quantity: number;
}

export interface CreateOrderRequest {
  event_id: Id;
  lock_id?: Id | null;
  ticket_type_quantities: TicketTypeQuantity[] | number[];
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
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface ConfirmOrderPaymentRequest {
  payment_intent_id?: string;
  three_ds_token?: string;
  saved_card_id?: Id;
  [key: string]: unknown;
}

export interface CancelOrderRequest {
  reason?: string;
}
