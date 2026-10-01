import type { EntityManager } from 'typeorm';

/** The photographer's working hours (from the calendar module), so a booking plan cannot exceed every available shift. */
export abstract class WorkingHoursPort {
  /**
   * The photographer's longest working shift in minutes (defaults to 08:00–20:00 if no working hours have been configured).
   *
   * @param manager EntityManager from the caller’s transaction.
   * @param photographerId Photographer profile ID.
   * @returns Longest shift length in minutes.
   */
  abstract longestShiftMinutes(
    manager: EntityManager,
    photographerId: string,
  ): Promise<number>;
}
