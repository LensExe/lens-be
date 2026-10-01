import type { WorkingShift } from '@shared/domain/types/work-schedule.types';

/** Default working hours when a photographer has not configured a schedule: 08:00–20:00 every day. */
export const DEFAULT_WORKING_HOURS: readonly WorkingShift[] = [
  1, 2, 3, 4, 5, 6, 7,
].map((weekday) => ({ weekday, start_time: '08:00', end_time: '20:00' }));
