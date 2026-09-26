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
