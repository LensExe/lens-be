/** Status of a photography booking. */
export const BookingStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  IN_PROGRESS: 'in_progress',
  SHOT: 'shot',
  COMPLETED: 'completed',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Accepted and later booking statuses that occupy the calendar; pending is tracked separately as a reservation. */
export const OCCUPIED_BOOKING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.SHOT,
  BookingStatus.COMPLETED,
] as const;

/** Booking statuses that reserve a photographer's time; pending requests hold the slot until answered or expired. */
export const RESERVING_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  ...OCCUPIED_BOOKING_STATUSES,
] as const;

/** Actor who changed a booking's status. */
export const BookingActorRole = {
  CUSTOMER: 'customer',
  PHOTOGRAPHER: 'photographer',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type BookingActorRole =
  (typeof BookingActorRole)[keyof typeof BookingActorRole];
