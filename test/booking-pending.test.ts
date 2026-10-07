import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/core/booking.domain';
import { Calendar } from '../src/modules/calendar/schedule/calendar.domain';

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
  blockedTimes: [] as { from: string; to: string }[],
  bookings: [] as { from: string; to: string; status: string }[],
  openRequestsWithPhotographer: 0,
  openRequests: 0,
  now: Date.parse('2029-01-01T00:00:00.000Z'),
};

test('a pending booking reserves the time for every customer', () => {
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [{ ...range, status: 'pending' }],
      }),
    /already has a booking/,
  );
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        bookings: [{ ...range, status: 'accepted' }],
      }),
    /already (has a booking|booked)/,
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

test('pending requests reserve availability but do not prevent a confirmed block flow', () => {
  const pending = [{ ...range, status: 'pending' }];
  assert.deepEqual(
    Calendar.availability(range.from, range.to, [], pending),
    [],
  );
  Calendar.assertCanBlock(range, pending, [], facts.now);
});

test('rejected and expired requests release the time', () => {
  for (const status of ['rejected', 'expired', 'cancelled'])
    assert.equal(
      Booking.prepare({ ...facts, bookings: [{ ...range, status }] }).status,
      'pending',
    );
});

const unpaid = {
  paidAmount: 0,
  depositAmount: 300,
  totalAmount: 1000,
  galleryPublished: false,
};

test('only a pending booking can expire', () => {
  assert.equal(new Booking('pending').transition('expire', unpaid), 'expired');
  assert.throws(
    () => new Booking('accepted').transition('expire', unpaid),
    /Cannot expire booking in accepted/,
  );
});

test('a pending request expires 24 hours after it was sent', () => {
  assert.equal(
    Booking.pendingExpiryCutoff(Date.parse('2030-01-02T10:00:00.000Z')),
    '2030-01-01T10:00:00.000Z',
  );
});

test('a request past 24 hours or past the shoot start can no longer be accepted', () => {
  const now = Date.parse('2030-01-02T00:00:00.000Z');
  const fresh = {
    created_at: '2030-01-01T12:00:00.000Z',
    from: '2030-01-03T02:00:00.000Z',
  };
  Booking.assertStillPending(fresh, now);
  for (const late of [
    { ...fresh, created_at: '2030-01-01T00:00:00.000Z' }, // sent 24 hours ago
    { ...fresh, from: '2030-01-01T23:00:00.000Z' }, // shoot already started
  ])
    assert.throws(
      () => Booking.assertStillPending(late, now),
      /request has expired/,
    );
});

test('the deposit is due 24 hours after the photographer accepts', () => {
  assert.equal(
    Booking.paymentDueCutoff(Date.parse('2030-01-02T10:00:00.000Z')),
    '2030-01-01T10:00:00.000Z',
  );
});

test('a customer keeps at most 3 open requests per photographer and 10 in total', () => {
  assert.equal(
    Booking.prepare({
      ...facts,
      openRequestsWithPhotographer: 2,
      openRequests: 9,
    }).status,
    'pending',
  );
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        openRequestsWithPhotographer: 3,
        openRequests: 3,
      }),
    /Too many open requests/,
  );
  assert.throws(
    () =>
      Booking.prepare({
        ...facts,
        openRequestsWithPhotographer: 0,
        openRequests: 10,
      }),
    /Too many open requests/,
  );
});
