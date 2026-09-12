import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/booking.domain';
import { Calendar } from '../src/modules/calendar/calendar.domain';
import { Identity } from '../src/modules/identity/identity.domain';
import { Portfolio } from '../src/modules/photographer/portfolio.domain';
import { Subscription } from '../src/modules/subscription/subscription.domain';

test('booking domain prepares a valid draft and rejects an overlapping booking', () => {
  const facts = {
    customerId: 'customer',
    customerUserId: 'customer-user',
    photographerId: 'photographer',
    photographerUserId: 'photographer-user',
    photographerStatus: 'active',
    photographerAvailable: true,
    planId: 'plan',
    planPhotographerId: 'photographer',
    planActive: true,
    planPrice: 100_001,
    location: 'Studio',
    from: '2030-01-01T09:00:00.000Z',
    to: '2030-01-01T10:00:00.000Z',
    offlineDates: [] as string[],
    bookings: [] as { from: string; to: string; status: string }[],
    now: Date.parse('2029-01-01T00:00:00.000Z'),
  };
  assert.equal(Booking.prepare(facts).deposit_amount, 30_001);
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [
          {
            from: '2030-01-01T08:00:00.000Z',
            to: '2030-01-01T09:30:00.000Z',
            status: 'accepted',
          },
        ],
      }),
    /already booked/,
  );
});

test('calendar clips bookings to the requested window', () => {
  const items = Calendar.availability(
    '2030-01-01T09:00:00.000Z',
    '2030-01-01T17:00:00.000Z',
    [],
    [
      {
        from: '2030-01-01T08:00:00.000Z',
        to: '2030-01-01T10:00:00.000Z',
        status: 'accepted',
      },
    ],
  );
  assert.deepEqual(items, [
    {
      from: '2030-01-01T10:00:00.000Z',
      to: '2030-01-01T17:00:00.000Z',
    },
  ]);
});

test('portfolio and subscription domain enforce value rules', () => {
  assert.deepEqual(Portfolio.reorder(['a', 'b'], ['b', 'a']), ['b', 'a']);
  assert.throws(() => Portfolio.reorder(['a', 'b'], ['a', 'a']));
  assert.equal(
    Subscription.period('2030-01-01T00:00:00.000Z', 30).end_at,
    '2030-01-31T00:00:00.000Z',
  );
});

test('identity domain validates registration and account state changes', () => {
  assert.doesNotThrow(() => Identity.assertCanRegister('active'));
  assert.throws(
    () => Identity.assertCanRegister('suspended'),
    /Account suspended/,
  );
  assert.equal(
    Identity.adminUpdateStatus('admin', 'customer', 'active', 'suspended'),
    'suspended',
  );
  assert.equal(
    Identity.adminUpdateStatus('admin', 'customer', 'suspended', 'active'),
    'active',
  );
  assert.equal(
    Identity.adminUpdateStatus('admin', 'customer', 'active', 'banned'),
    'banned',
  );
  assert.throws(
    () => Identity.adminUpdateStatus('admin', 'admin', 'active', 'suspended'),
    /Cannot change own admin status/,
  );
  assert.throws(
    () => Identity.adminUpdateStatus('admin', 'customer', 'banned', 'active'),
    /cannot be reactivated/,
  );
});
