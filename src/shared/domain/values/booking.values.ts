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

/** Booking statuses that block a photographer's calendar. */
export const OCCUPIED_BOOKING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.SHOT,
  BookingStatus.COMPLETED,
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

/** Status of a collaboration invitation to a photographer. */
export const BookingCollaboratorStatus = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REVOKED: 'revoked',
} as const;

export type BookingCollaboratorStatus =
  (typeof BookingCollaboratorStatus)[keyof typeof BookingCollaboratorStatus];
