import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Calendar } from '../src/modules/calendar/calendar.domain';
import { Booking } from '../src/modules/booking/booking.domain';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';

const code = (expected: string) => (error: unknown) =>
  error instanceof DomainError && error.code === expected;
const now = Date.parse('2026-09-25T00:00:00.000Z');

test('a blocked date means the whole day in Vietnam time', () => {
  assert.deepEqual(Calendar.blockRange({ date: '2026-10-01' }), {
    from: '2026-09-30T17:00:00.000Z',
    to: '2026-10-01T17:00:00.000Z',
  });
});

test('a blocked range may span several days', () => {
  assert.deepEqual(
    Calendar.blockRange({
      from: '2026-10-01T18:00:00+07:00',
      to: '2026-10-03T12:00:00+07:00',
    }),
    { from: '2026-10-01T11:00:00.000Z', to: '2026-10-03T05:00:00.000Z' },
  );
});

test('a block needs exactly one form: date, or from and to', () => {
  for (const bad of [
    {},
    { date: '2026-10-01', from: '2026-10-01T10:00:00+07:00' },
    { from: '2026-10-01T10:00:00+07:00' },
    { from: '2026-10-01T12:00:00+07:00', to: '2026-10-01T10:00:00+07:00' },
  ])
    assert.throws(() => Calendar.blockRange(bad), code('invalid'));
});

test('a block must not be over, overlap a booking or another block', () => {
  const range = {
    from: '2026-10-01T07:00:00.000Z',
    to: '2026-10-01T09:00:00.000Z',
  };
  assert.doesNotThrow(() => Calendar.assertCanBlock(range, [], [], now));
  // the day that ends before now is in the past
  assert.throws(
    () =>
      Calendar.assertCanBlock(
        { from: '2026-09-23T17:00:00.000Z', to: '2026-09-24T17:00:00.000Z' },
        [],
        [],
        now,
      ),
    code('invalid'),
  );
  const booking = {
    from: '2026-10-01T08:00:00.000Z',
    to: '2026-10-01T10:00:00.000Z',
  };
  assert.throws(
    () =>
      Calendar.assertCanBlock(
        range,
        [{ ...booking, status: 'accepted' }],
        [],
        now,
      ),
    code('conflict'),
  );
  // a cancelled booking no longer holds the time
  assert.doesNotThrow(() =>
    Calendar.assertCanBlock(
      range,
      [{ ...booking, status: 'cancelled' }],
      [],
      now,
    ),
  );
  assert.throws(
    () => Calendar.assertCanBlock(range, [], [booking], now),
    code('conflict'),
  );
  // touching blocks do not overlap: [07,09) and [09,10)
  assert.doesNotThrow(() =>
    Calendar.assertCanBlock(
      range,
      [],
      [{ from: '2026-10-01T09:00:00.000Z', to: '2026-10-01T10:00:00.000Z' }],
      now,
    ),
  );
});

test('availability and booking only lose the blocked hours, not the whole day', () => {
  const blocked = [
    { from: '2030-01-01T10:00:00.000Z', to: '2030-01-01T12:00:00.000Z' },
  ];
  assert.deepEqual(
    Calendar.availability(
      '2030-01-01T09:00:00.000Z',
      '2030-01-01T14:00:00.000Z',
      [],
      blocked,
      [],
    ),
    // the default shift ends at 20:00 Vietnam time = 13:00 UTC
    [
      { from: '2030-01-01T09:00:00.000Z', to: '2030-01-01T10:00:00.000Z' },
      { from: '2030-01-01T12:00:00.000Z', to: '2030-01-01T13:00:00.000Z' },
    ],
  );
  const draft = {
    customerId: 'c',
    customerUserId: 'cu',
    photographerId: 'p',
    photographerUserId: 'pu',
    photographerStatus: 'active',
    photographerVerified: true,
    photographerAvailable: true,
    planId: 'plan',
    planPhotographerId: 'p',
    planActive: true,
    planPrice: 100_000,
    planDurationMinutes: 60,
    location: 'Studio',
    schedule: [],
    blockedTimes: blocked,
    bookings: [],
    now,
  };
  assert.doesNotThrow(() =>
    Booking.prepare({
      ...draft,
      from: '2030-01-01T12:00:00.000Z',
      to: '2030-01-01T13:00:00.000Z',
    }),
  );
  assert.throws(
    () =>
      Booking.prepare({
        ...draft,
        from: '2030-01-01T11:00:00.000Z',
        to: '2030-01-01T12:00:00.000Z',
      }),
    code('conflict'),
  );
});

test('availability follows the declared shifts per Vietnam day', () => {
  // Monday 28/09 two shifts, Tuesday off, Wednesday one shift
  const schedule = [
    { weekday: 1, start_time: '08:00', end_time: '12:00' },
    { weekday: 1, start_time: '14:00', end_time: '18:00' },
    { weekday: 3, start_time: '09:00', end_time: '10:00' },
  ];
  assert.deepEqual(
    Calendar.availability(
      '2026-09-28T00:00:00+07:00',
      '2026-10-01T00:00:00+07:00',
      schedule,
      [{ from: '2026-09-28T09:00:00+07:00', to: '2026-09-28T10:00:00+07:00' }],
      [
        {
          from: '2026-09-28T15:00:00+07:00',
          to: '2026-09-28T16:00:00+07:00',
          status: 'accepted',
        },
      ],
    ),
    [
      { from: '2026-09-28T01:00:00.000Z', to: '2026-09-28T02:00:00.000Z' },
      { from: '2026-09-28T03:00:00.000Z', to: '2026-09-28T05:00:00.000Z' },
      { from: '2026-09-28T07:00:00.000Z', to: '2026-09-28T08:00:00.000Z' },
      { from: '2026-09-28T09:00:00.000Z', to: '2026-09-28T11:00:00.000Z' },
      { from: '2026-09-30T02:00:00.000Z', to: '2026-09-30T03:00:00.000Z' },
    ],
  );
});

test('a window starting at 00:00 Vietnam time still sees that day', () => {
  // 00:00 +07 is 17:00 UTC of the previous day; a UTC day loop would skip it
  assert.deepEqual(
    Calendar.availability(
      '2026-10-01T00:00:00+07:00',
      '2026-10-02T00:00:00+07:00',
      [],
      [],
      [],
    ),
    [{ from: '2026-10-01T01:00:00.000Z', to: '2026-10-01T13:00:00.000Z' }],
  );
});
