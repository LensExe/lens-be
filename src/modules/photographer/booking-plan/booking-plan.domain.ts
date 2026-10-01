import { ensure } from '@shared/domain/domain.error';

/** Rules for a photographer's self-listed booking plan. */
export class BookingPlan {
  /**
   * The retouch count must not exceed the number of delivered images.
   *
   * @param photoCount Number of photos the photographer committed to deliver.
   * @param retouchedPhotoCount Number of photos to retouch.
   * @returns Returns no value; throws `invalid` (HTTP 400) if the retouched photo count exceeds the delivery count.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertPhotoCounts(photoCount: number, retouchedPhotoCount: number) {
    ensure(
      retouchedPhotoCount <= photoCount,
      'retouched_photo_count cannot exceed photo_count',
    );
  }

  /**
   * A plan with existing bookings may only be deactivated (`is_active = false`); it cannot be deleted.
   *
   * @param bookingCount Number of bookings referencing the plan.
   * @returns Returns no value; throws `conflict` (HTTP 409) if the plan has bookings.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertRemovable(bookingCount: number) {
    ensure(
      bookingCount === 0,
      'Booking plan has bookings; deactivate it instead',
      'conflict',
    );
  }

  /**
   * Whether the plan fits within the photographer's longest working shift; if not, it can never be booked.
   *
   * @param durationMinutes Plan duration in minutes.
   * @param longestShiftMinutes Photographer’s longest shift in minutes.
   * @returns `true` if the plan fits.
   */
  static fitsShift(durationMinutes: number, longestShiftMinutes: number) {
    return durationMinutes <= longestShiftMinutes;
  }

  /**
   * A plan must not exceed the photographer's longest working shift. A booking must fit entirely within one shift, so a plan longer than
   * every available shift can never be booked.
   *
   * @param durationMinutes Plan duration in minutes.
   * @param longestShiftMinutes Photographer’s longest shift in minutes.
   * @returns Returns no value; throws HTTP 400 if the plan is longer than the shift.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertFitsShift(durationMinutes: number, longestShiftMinutes: number) {
    ensure(
      BookingPlan.fitsShift(durationMinutes, longestShiftMinutes),
      'Plan is longer than your longest working shift; extend your working hours first',
    );
  }
}
