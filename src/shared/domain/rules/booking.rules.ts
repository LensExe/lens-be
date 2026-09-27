import { OCCUPIED_BOOKING_STATUSES } from '@shared/domain/values/booking.values';

/** Kiểm tra booking có đang giữ lịch của photographer không. */
export function isOccupied(status: string) {
  return (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(status);
}
