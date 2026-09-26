import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { FindOperator } from 'typeorm';
import { isOccupied } from '../src/shared/domain/booking-values';
import { pageWindow, paged } from '../src/shared/common/access';
import { overlapWhere } from '../src/shared/database/database.helpers';

test('only accepted-and-later bookings hold the time', () => {
  for (const status of ['accepted', 'in_progress', 'shot', 'completed'])
    assert.equal(isOccupied(status), true);
  for (const status of ['pending', 'rejected', 'cancelled', 'expired'])
    assert.equal(isOccupied(status), false);
});

test('page window defaults to the first 20 rows', () => {
  assert.deepEqual(pageWindow({}), { offset: 0, limit: 20 });
  assert.deepEqual(pageWindow({ offset: 40, limit: 10 }), {
    offset: 40,
    limit: 10,
  });
  assert.deepEqual(paged(['a'], 7, { limit: 5 }), {
    items: ['a'],
    total: 7,
    offset: 0,
    limit: 5,
  });
});

test('overlap condition keeps rows ending after from and starting before to', () => {
  const where = overlapWhere('p1', {
    from: '2030-01-01T09:00:00+07:00',
    to: '2030-01-01T10:00:00+07:00',
  }) as {
    photographer_id: string;
    to: FindOperator<string>;
    from: FindOperator<string>;
  };
  assert.equal(where.photographer_id, 'p1');
  assert.equal(where.to.type, 'moreThan');
  assert.equal(where.to.value, '2030-01-01T02:00:00.000Z');
  assert.equal(where.from.type, 'lessThan');
  assert.equal(where.from.value, '2030-01-01T03:00:00.000Z');
  // a missing end does not filter on that side
  assert.deepEqual(Object.keys(overlapWhere('p1', {})), ['photographer_id']);
});
