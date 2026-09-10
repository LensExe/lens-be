import { ensure } from '@shared/platform/exceptions/domain.error';

/**
 * Domain rules for real-time location sharing during a booking session.
 * The sharing window opens 1 hour before the shoot starts and closes at `to`.
 */
export class LocationSession {
  /**
   * Validates that the current moment falls within the permitted tracking
   * window: [from - 1 h, to].
   */
  static assertWithinWindow(from: string, to: string, now = Date.now()) {
    ensure(
      now >= Date.parse(from) - 36e5 && now <= Date.parse(to),
      'Tracking is outside permitted booking window',
      'conflict',
    );
  }

  /**
   * Validates that the booking is in a state that allows location sharing.
   */
  static assertPermittedStatus(status: string) {
    ensure(
      ['accepted', 'in_progress'].includes(status),
      'Location sharing is only available for accepted or in-progress bookings',
      'conflict',
    );
  }

  /**
   * Validates a latitude/longitude pair.
   */
  static assertCoordinates(latitude: number, longitude: number) {
    ensure(
      latitude >= -90 && latitude <= 90,
      'Latitude must be between -90 and 90',
    );
    ensure(
      longitude >= -180 && longitude <= 180,
      'Longitude must be between -180 and 180',
    );
  }
}
