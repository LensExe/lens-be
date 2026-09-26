import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager, FindOperator } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { CalendarUseCases } from '../src/modules/calendar/calendar.use-case';
import type { PendingBookingsPort } from '../src/modules/calendar/ports/pending-bookings.port';

test('blocking time reads only bookings and blocks that overlap the new range', async () => {
  const from = '2030-01-01T09:00:00+07:00',
    to = '2030-01-01T12:00:00+07:00';
  const reads: { entity: unknown; options: any }[] = [];
  const s = {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u1', keycloak_id: 'kc-u1', status: 'active' }]
        : [{ id: 'p1', user_id: 'u1' }],
    findOne: async () => ({ id: 'p1' }),
    find: async (entity: unknown, options: object) => {
      reads.push({ entity, options });
      return [];
    },
    save: async (_entity: unknown, row: object) => ({ id: 'slot', ...row }),
  } as unknown as EntityManager;
  await new CalendarUseCases({
    turnDownOverlapping: async () => 0,
  } as unknown as PendingBookingsPort).block(
    s,
    { sub: 'kc-u1', roles: ['photographer'] },
    { from, to },
  );
  for (const table of [EntitySchemas.bookings, EntitySchemas.offline_slots]) {
    const read = reads.find((r) => r.entity === table);
    assert.ok(read, 'overlap query expected');
    const where = read.options.where as {
      photographer_id: string;
      to: FindOperator<string>;
      from: FindOperator<string>;
    };
    assert.equal(where.photographer_id, 'p1');
    assert.equal(where.to.type, 'moreThan');
    assert.equal(where.to.value, new Date(from).toISOString());
    assert.equal(where.from.type, 'lessThan');
    assert.equal(where.from.value, new Date(to).toISOString());
  }
});
