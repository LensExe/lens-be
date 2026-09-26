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

test('customer confirms receipt only from shot, with full payment and a published gallery', () => {
  assert.equal(
    new Booking('shot').transition('confirmReceipt', true, true),
    'completed',
  );
  assert.throws(
    () => new Booking('shot').transition('confirmReceipt', false, true),
    /Full payment and published gallery required/,
  );
  assert.throws(
    () => new Booking('shot').transition('confirmReceipt', true, false),
    /Full payment and published gallery required/,
  );
  assert.throws(
    () => new Booking('in_progress').transition('confirmReceipt', true, true),
    /Cannot confirmReceipt booking in in_progress/,
  );
});

test('auto-complete cutoff is 7 days before now', () => {
  assert.equal(
    Booking.autoCompleteCutoff(Date.parse('2030-01-10T00:00:00.000Z')),
    '2030-01-03T00:00:00.000Z',
  );
});
