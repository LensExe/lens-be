import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DEFAULT_WORKING_HOURS,
  WorkSchedule,
  vnDate,
  vnDayInterval,
  vnWeekday,
} from '../src/shared/domain/work-schedule';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';

const invalid = (error: unknown) =>
  error instanceof DomainError && error.code === 'invalid';

test('a Vietnam day starts at 00:00 +07:00, not at 00:00 UTC', () => {
  assert.deepEqual(vnDayInterval('2026-10-01'), {
    from: '2026-09-30T17:00:00.000Z',
    to: '2026-10-01T17:00:00.000Z',
  });
  // 06:30 on 01/10 in Vietnam is still 30/09 in UTC
  assert.equal(vnDate('2026-09-30T23:30:00.000Z'), '2026-10-01');
});

test('weekday is ISO style in Vietnam time: Monday = 1 ... Sunday = 7', () => {
  assert.equal(vnWeekday('2026-09-28'), 1); // Monday
  assert.equal(vnWeekday('2026-10-04'), 7); // Sunday
});

test('without declared hours every day is 08:00-20:00', () => {
  assert.deepEqual(WorkSchedule.shifts('2026-10-04', []), [
    { from: '2026-10-04T01:00:00.000Z', to: '2026-10-04T13:00:00.000Z' },
  ]);
  assert.equal(DEFAULT_WORKING_HOURS.length, 7);
});

test('declared hours replace the default; undeclared weekdays are days off', () => {
  const schedule = [
    { weekday: 1, start_time: '08:00', end_time: '12:00' },
    { weekday: 1, start_time: '14:00', end_time: '18:00' },
  ];
  assert.deepEqual(WorkSchedule.shifts('2026-09-28', schedule), [
    { from: '2026-09-28T01:00:00.000Z', to: '2026-09-28T05:00:00.000Z' },
    { from: '2026-09-28T07:00:00.000Z', to: '2026-09-28T11:00:00.000Z' },
  ]);
  assert.deepEqual(WorkSchedule.shifts('2026-09-29', schedule), []);
});

test('a booking must fit inside one shift', () => {
  const schedule = [{ weekday: 1, start_time: '08:00', end_time: '12:00' }];
  const at = (from: string, to: string) => ({
    from: `2026-09-28T${from}:00+07:00`,
    to: `2026-09-28T${to}:00+07:00`,
  });
  assert.equal(WorkSchedule.fits(at('10:00', '12:00'), schedule), true);
  assert.equal(WorkSchedule.fits(at('11:00', '13:00'), schedule), false);
  assert.equal(WorkSchedule.fits(at('07:30', '09:00'), schedule), false);
  // the default 08:00-20:00 applies when nothing is declared
  assert.equal(WorkSchedule.fits(at('19:00', '20:00'), []), true);
  assert.equal(WorkSchedule.fits(at('20:00', '21:00'), []), false);
});

test('a weekly schedule rejects bad times and overlapping shifts', () => {
  assert.doesNotThrow(() =>
    WorkSchedule.assertValid([
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 1, start_time: '12:00', end_time: '18:00' },
      { weekday: 2, start_time: '08:00', end_time: '12:00' },
    ]),
  );
  for (const bad of [
    [{ weekday: 1, start_time: '12:00', end_time: '08:00' }],
    [{ weekday: 8, start_time: '08:00', end_time: '12:00' }],
    [{ weekday: 1, start_time: '8:00', end_time: '12:00' }],
    [
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 1, start_time: '11:00', end_time: '13:00' },
    ],
  ])
    assert.throws(() => WorkSchedule.assertValid(bad), invalid);
});

test('a shift may end at 24:00 (midnight) but cannot start there', () => {
  WorkSchedule.assertValid([
    { weekday: 2, start_time: '20:00', end_time: '24:00' },
  ]);
  assert.throws(
    () =>
      WorkSchedule.assertValid([
        { weekday: 2, start_time: '24:00', end_time: '24:00' },
      ]),
    /HH:MM/,
  );
  // 2030-01-01 is a Tuesday: 22:00-24:00 Vietnam time fits the late shift
  assert.equal(
    WorkSchedule.fits(
      {
        from: '2030-01-01T22:00:00+07:00',
        to: '2030-01-02T00:00:00+07:00',
      },
      [{ weekday: 2, start_time: '20:00', end_time: '24:00' }],
    ),
    true,
  );
});
