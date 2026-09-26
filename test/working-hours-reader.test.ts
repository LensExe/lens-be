import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { WorkingHoursReader } from '../src/modules/calendar/working-hours.reader';

test('longest shift of a photographer, default hours when none declared', async () => {
  const reader = new WorkingHoursReader();
  const withShifts = {
    findBy: async () => [
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 6, start_time: '07:00', end_time: '24:00' },
    ],
  } as unknown as EntityManager;
  assert.equal(await reader.longestShiftMinutes(withShifts, 'p1'), 17 * 60);
  const none = { findBy: async () => [] } as unknown as EntityManager;
  assert.equal(await reader.longestShiftMinutes(none, 'p1'), 12 * 60);
});
