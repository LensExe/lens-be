/** Trạng thái của đơn đặt lịch chụp ảnh. */
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

/** Các trạng thái booking đang chiếm dụng lịch chụp. */
export const OCCUPIED_BOOKING_STATUSES = [
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.SHOT,
  BookingStatus.COMPLETED,
] as const;

/** Bên thực hiện một lần đổi trạng thái booking. */
export const BookingActorRole = {
  CUSTOMER: 'customer',
  PHOTOGRAPHER: 'photographer',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type BookingActorRole =
  (typeof BookingActorRole)[keyof typeof BookingActorRole];

/** Trạng thái lời mời thợ liên kết. */
export const BookingCollaboratorStatus = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REVOKED: 'revoked',
} as const;

export type BookingCollaboratorStatus =
  (typeof BookingCollaboratorStatus)[keyof typeof BookingCollaboratorStatus];
