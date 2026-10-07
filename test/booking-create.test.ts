import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/core/booking.domain';

/** 2030-01-01 is a Tuesday; 09:00–10:00 Vietnam time is 02:00–03:00 UTC. */
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

test('time is free by default and a pending booking reserves it', () => {
  const outsideTypicalHours = {
    ...facts,
    from: '2030-01-01T20:30:00+07:00',
    to: '2030-01-01T21:30:00+07:00',
  };
  assert.equal(Booking.prepare(outsideTypicalHours).status, 'pending');
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [
          {
            from: facts.from,
            to: facts.to,
            status: 'pending',
          },
        ],
      }),
    /already has a booking/,
  );
});

test('cancelled, rejected, and expired bookings release the time', () => {
  for (const status of ['cancelled', 'rejected', 'expired'])
    assert.equal(
      Booking.prepare({
        ...facts,
        bookings: [{ from: facts.from, to: facts.to, status }],
      }).status,
      'pending',
    );
});
