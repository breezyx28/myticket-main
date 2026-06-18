import * as yup from 'yup';
import type { ValidationTFunction } from '@/schemas/types';

export function createSeatLockSchema(t: ValidationTFunction) {
  return yup
    .object({
      ticket_type_id: yup.mixed<string | number>().required(t('seat.ticketTypeRequired')),
      seat_ids: yup
        .array(yup.mixed<string | number>().required())
        .min(1, t('seat.selectAtLeastOneSeat'))
        .required(t('seat.seatSelectionRequired')),
      ttl_seconds: yup.number().integer().min(30).max(900).notRequired(),
    })
    .strict();
}

export type SeatLockSchema = yup.InferType<ReturnType<typeof createSeatLockSchema>>;

export function createExtendSeatLockSchema(_t: ValidationTFunction) {
  return yup
    .object({
      ttl_seconds: yup.number().integer().min(30).max(900).notRequired(),
    })
    .strict();
}
