import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Booking } from '../src/modules/booking/booking.domain';

test('history records the side of the booking before the token role', () => {
  const role = (userId: string, roles: string[]) =>
    Booking.actorRole(userId, 'customer-user', 'photographer-user', roles);
  assert.equal(role('customer-user', ['customer']), 'customer');
  assert.equal(role('photographer-user', ['photographer']), 'photographer');
  // an admin who also owns the booking still acts as that side
  assert.equal(role('customer-user', ['customer', 'admin']), 'customer');
  assert.equal(role('admin-user', ['admin']), 'admin');
  assert.equal(role('service-user', ['system']), 'system');
});

const paid = {
  paidAmount: 1000,
  depositAmount: 300,
  totalAmount: 1000,
  galleryPublished: true,
};

test('customer confirms receipt only from shot, with full payment and a published gallery', () => {
  assert.equal(
    new Booking('shot').transition('confirmReceipt', paid),
    'completed',
  );
  assert.throws(
    () =>
      new Booking('shot').transition('confirmReceipt', {
        ...paid,
        paidAmount: 300,
      }),
    /Full payment and published gallery required/,
  );
  assert.throws(
    () =>
      new Booking('shot').transition('confirmReceipt', {
        ...paid,
        galleryPublished: false,
      }),
    /Full payment and published gallery required/,
  );
  assert.throws(
    () => new Booking('in_progress').transition('confirmReceipt', paid),
    /Cannot confirmReceipt booking in in_progress/,
  );
});

test('auto-complete cutoff is 7 days before now', () => {
  assert.equal(
    Booking.autoCompleteCutoff(Date.parse('2030-01-10T00:00:00.000Z')),
    '2030-01-03T00:00:00.000Z',
  );
});

test('the domain decides how much must be paid: deposit to start, everything to complete', () => {
  const money = { ...paid, paidAmount: 299 };
  assert.throws(
    () => new Booking('accepted').transition('start', money),
    /Deposit must be paid before starting/,
  );
  assert.equal(
    new Booking('accepted').transition('start', { ...money, paidAmount: 300 }),
    'in_progress',
  );
  assert.throws(
    () =>
      new Booking('shot').transition('complete', { ...paid, paidAmount: 999 }),
    /Full payment and published gallery required/,
  );
  assert.deepEqual(
    (['accept', 'start', 'complete', 'confirmReceipt', 'cancel'] as const).map(
      (action) => Booking.needsPayment(action),
    ),
    [false, true, true, true, false],
  );
});
