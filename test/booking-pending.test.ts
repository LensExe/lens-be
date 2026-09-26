import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/booking.domain';
import { Calendar } from '../src/modules/calendar/calendar.domain';

const range = {
  from: '2030-01-01T02:00:00.000Z',
  to: '2030-01-01T03:00:00.000Z',
};
const facts = {
  customerId: 'customer',
  customerUserId: 'customer-user',
  photographerId: 'photographer',
  photographerUserId: 'photographer-user',
  photographerStatus: 'active',
  photographerVerified: true,
  photographerAvailable: true,
  planId: 'plan',
  planPhotographerId: 'photographer',
  planActive: true,
  planPrice: 1_000_000,
  planDurationMinutes: 60,
  location: 'Studio',
  ...range,
  schedule: [],
  blockedTimes: [] as { from: string; to: string }[],
  bookings: [] as { from: string; to: string; status: string }[],
  now: Date.parse('2029-01-01T00:00:00.000Z'),
};

test('a pending booking does not hold the time, so others can request it too', () => {
  assert.equal(
    Booking.prepare({ ...facts, bookings: [{ ...range, status: 'pending' }] })
      .status,
    'pending',
  );
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [{ ...range, status: 'accepted' }],
      }),
    /already booked/,
  );
});

test('accepting checks the time is still free of accepted bookings and blocks', () => {
  Booking.assertCanAccept(range, [], [{ ...range, status: 'pending' }]);
  assert.throws(
    () =>
      Booking.assertCanAccept(range, [], [{ ...range, status: 'accepted' }]),
    /already booked/,
  );
  assert.throws(
    () => Booking.assertCanAccept(range, [range], []),
    /unavailable at this time/,
  );
});

test('free time and blocking ignore pending requests', () => {
  const pending = [{ ...range, status: 'pending' }];
  // default shift 08:00-20:00 Vietnam = 01:00-13:00 UTC
  assert.deepEqual(
    Calendar.availability(
      '2030-01-01T01:00:00.000Z',
      '2030-01-01T13:00:00.000Z',
      [],
      [],
      pending,
    ),
    [{ from: '2030-01-01T01:00:00.000Z', to: '2030-01-01T13:00:00.000Z' }],
  );
  Calendar.assertCanBlock(range, pending, [], facts.now);
});

test('a customer cannot send two overlapping requests to the same photographer', () => {
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [{ ...range, status: 'pending', customer_id: 'customer' }],
      }),
    /already requested this time/,
  );
  // another customer's request, or my own request that is no longer pending, does not count
  for (const other of [
    { status: 'pending', customer_id: 'someone-else' },
    { status: 'rejected', customer_id: 'customer' },
  ])
    assert.equal(
      Booking.prepare({ ...facts, bookings: [{ ...range, ...other }] }).status,
      'pending',
    );
});
