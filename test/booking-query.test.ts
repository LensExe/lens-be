import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager, FindOperator } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { BookingUseCases } from '../src/modules/booking/booking.use-case';
import type { RatingUpdaterPort } from '../src/modules/booking/ports/rating-updater.port';
import type { PaidAmountsPort } from '../src/modules/booking/ports/paid-amounts.port';

/** Bên payment giả: chưa ai trả đồng nào. */
const noPayments = {
  paidAmounts: async (_s: unknown, ids: string[]) =>
    Object.fromEntries(ids.map((id) => [id, 0])),
} as unknown as PaidAmountsPort;

const useCases = new BookingUseCases({} as RatingUpdaterPort, noPayments);
const user = { id: 'u1', keycloak_id: 'kc-u1', status: 'active' };

/** EntityManager giả: trả hàng theo bảng, ghi lại tham số của findAndCount / findBy. */
function manager(rows: Map<unknown, object[]>) {
  const calls: { method: string; entity: unknown; options: any }[] = [];
  const s = {
    calls,
    find: async () => {
      throw new Error('must not load a whole table');
    },
    findAndCount: async (entity: unknown, options: object) => {
      calls.push({ method: 'findAndCount', entity, options });
      return [[{ id: 'b1' }], 7];
    },
    findBy: async (entity: unknown, where: object) => {
      calls.push({ method: 'findBy', entity, options: where });
      return rows.get(entity) ?? [];
    },
  };
  return s as unknown as EntityManager & { calls: typeof calls };
}

test('my bookings are filtered and paged by the database', async () => {
  const s = manager(
    new Map<unknown, object[]>([
      [EntitySchemas.users, [user]],
      [EntitySchemas.customers, [{ id: 'c1' }]],
      [EntitySchemas.photographers, [{ id: 'p1' }]],
    ]),
  );
  const result = await useCases.list(
    s,
    { sub: 'kc-u1', roles: ['customer'] },
    { status: 'accepted', limit: 5, offset: 10 },
  );
  assert.deepEqual(result, {
    items: [{ id: 'b1' }],
    total: 7,
    offset: 10,
    limit: 5,
  });
  const [query] = s.calls.filter((c) => c.method === 'findAndCount');
  assert.equal(query.entity, EntitySchemas.bookings);
  assert.equal(query.options.skip, 10);
  assert.equal(query.options.take, 5);
  // as customer OR as photographer, each with the same filters
  assert.deepEqual(query.options.where, [
    { customer_id: 'c1', status: 'accepted' },
    { photographer_id: 'p1', status: 'accepted' },
  ]);
});

test('a user with neither profile gets an empty page without querying bookings', async () => {
  const s = manager(
    new Map<unknown, object[]>([[EntitySchemas.users, [user]]]),
  );
  assert.deepEqual(
    await useCases.list(s, { sub: 'kc-u1', roles: ['customer'] }, {}),
    { items: [], total: 0, offset: 0, limit: 20 },
  );
  assert.equal(s.calls.filter((c) => c.method === 'findAndCount').length, 0);
});

test('admin booking list is filtered and paged by the database', async () => {
  const s = manager(
    new Map<unknown, object[]>([[EntitySchemas.users, [user]]]),
  );
  const result = await useCases.admin(
    s,
    { sub: 'kc-u1', roles: ['admin'] },
    { status: 'pending' },
  );
  assert.deepEqual(result, {
    items: [{ id: 'b1' }],
    total: 7,
    offset: 0,
    limit: 20,
  });
  const [query] = s.calls.filter((c) => c.method === 'findAndCount');
  assert.deepEqual(query.options.where, { status: 'pending' });
  assert.equal(query.options.take, 20);
});

test('creating a booking reads only blocks and bookings that overlap it', async () => {
  const from = '2030-01-01T09:00:00+07:00',
    to = '2030-01-01T10:00:00+07:00';
  const s = manager(
    new Map<unknown, object[]>([
      [EntitySchemas.users, [user]],
      [EntitySchemas.customers, [{ id: 'c1' }]],
    ]),
  );
  Object.assign(s, {
    findOne: async () => ({
      id: 'p1',
      user_id: 'u2',
      is_available: true,
      verification_status: 'verified',
    }),
    findOneBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? { id: 'u2', status: 'active' }
        : {
            id: 'plan',
            photographer_id: 'p1',
            is_active: true,
            price: 100000,
            duration_minutes: 60,
          },
    save: async (_entity: unknown, row: object) => ({ id: 'new', ...row }),
    countBy: async () => 0,
    insert: async () => ({}),
  });
  await useCases.create(
    s,
    { sub: 'kc-u1', roles: ['customer'] },
    {
      photographer_id: 'p1',
      plan_id: 'plan',
      location: 'Studio',
      from,
      to,
    },
  );
  for (const table of [EntitySchemas.offline_slots, EntitySchemas.bookings]) {
    const call = s.calls.find(
      (c) => c.method === 'findBy' && c.entity === table,
    );
    assert.ok(call, 'overlap query expected');
    const where = call.options as {
      to: FindOperator<string>;
      from: FindOperator<string>;
    };
    assert.equal(where.to.type, 'moreThan');
    assert.equal(where.to.value, new Date(from).toISOString());
    assert.equal(where.from.type, 'lessThan');
    assert.equal(where.from.value, new Date(to).toISOString());
  }
});
