import * as yup from 'yup';

export const seatLockSchema = yup
  .object({
    ticket_type_id: yup.mixed<string | number>().required('Ticket type is required.'),
    seat_ids: yup
      .array(yup.mixed<string | number>().required())
      .min(1, 'Select at least one seat.')
      .required('Seat selection is required.'),
    ttl_seconds: yup.number().integer().min(30).max(900).notRequired(),
  })
  .strict();

export type SeatLockSchema = yup.InferType<typeof seatLockSchema>;

export const extendSeatLockSchema = yup
  .object({
    ttl_seconds: yup.number().integer().min(30).max(900).notRequired(),
  })
  .strict();
