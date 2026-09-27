import type { WorkingShift } from '@shared/domain/types/work-schedule.types';

/** Giờ làm mặc định khi photographer chưa khai: 08:00–20:00 mọi ngày. */
export const DEFAULT_WORKING_HOURS: readonly WorkingShift[] = [
  1, 2, 3, 4, 5, 6, 7,
].map((weekday) => ({ weekday, start_time: '08:00', end_time: '20:00' }));
