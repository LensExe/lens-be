import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/booking.domain';

/** 2030-01-01 là thứ Ba; 09:00–10:00 giờ VN = 02:00–03:00 UTC. */
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
  openRequestsWithPhotographer: 0,
  openRequests: 0,
  location: 'Studio',
  from: '2030-01-01T09:00:00+07:00',
  to: '2030-01-01T10:00:00+07:00',
  schedule: [] as { weekday: number; start_time: string; end_time: string }[],
  blockedTimes: [] as { from: string; to: string }[],
  bookings: [] as { from: string; to: string; status: string }[],
  now: Date.parse('2029-01-01T00:00:00.000Z'),
};

test('an unverified photographer cannot be booked', () => {
  assert.throws(
    () => Booking.prepare({ ...facts, photographerVerified: false }),
    /Photographer not found/,
  );
});

test('booking length must equal the plan duration', () => {
  for (const to of ['2030-01-01T09:30:00+07:00', '2030-01-01T11:00:00+07:00'])
    assert.throws(
      () => Booking.prepare({ ...facts, to }),
      /must match plan duration/,
    );
  assert.equal(Booking.prepare(facts).status, 'pending');
});

test('booking must sit inside one working shift of that day', () => {
  const schedule = [
    { weekday: 2, start_time: '08:00', end_time: '12:00' },
    { weekday: 2, start_time: '13:00', end_time: '17:00' },
  ];
  const at = (from: string, to: string) =>
    Booking.prepare({
      ...facts,
      schedule,
      planDurationMinutes: 120,
      from: `2030-01-01T${from}:00+07:00`,
      to: `2030-01-01T${to}:00+07:00`,
    });
  assert.equal(at('10:00', '12:00').status, 'pending');
  for (const [from, to] of [
    ['11:00', '13:00'], // spans the lunch break
    ['06:00', '08:00'], // before the shift
  ])
    assert.throws(() => at(from, to), /within working hours/);
  // Wednesday has no shift, so it is a day off
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        schedule,
        from: '2030-01-02T09:00:00+07:00',
        to: '2030-01-02T10:00:00+07:00',
      }),
    /within working hours/,
  );
});

test('without declared hours the default 08:00-20:00 Vietnam shift applies', () => {
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        from: '2030-01-01T19:30:00+07:00',
        to: '2030-01-01T20:30:00+07:00',
      }),
    /within working hours/,
  );
});
