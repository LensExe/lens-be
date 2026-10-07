import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager, FindOperator } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { CalendarUseCases } from '../src/modules/calendar/schedule/calendar.use-case';
import type { PendingBookingsPort } from '../src/modules/calendar/ports/pending-bookings.port';
import type { PhotographerBookingsPort } from '../src/modules/calendar/ports/photographer-bookings.port';
const noBookings = {
  bookingsOverlapping: async () => [],
} as unknown as PhotographerBookingsPort;

test('customer offline-slot list contains future public blocks without private reasons', async () => {
  const originalNow = Date.now,
    now = Date.parse('2030-01-01T00:00:00.000Z');
  Date.now = () => now;
  try {
    const selections: [string, string][] = [],
      predicates: [string, object?][] = [];
    const rawSlots = [
      {
        id: 'slot-1',
        from: new Date('2030-01-03T09:00:00.000Z'),
        to: new Date('2030-01-03T12:00:00.000Z'),
        reason: 'private reason',
      },
    ];
    const builder = {
      select(expression: string, alias: string) {
        selections.push([expression, alias]);
        return this;
      },
      addSelect(expression: string, alias: string) {
        selections.push([expression, alias]);
        return this;
      },
      where(expression: string, parameters?: object) {
        predicates.push([expression, parameters]);
        return this;
      },
      andWhere(expression: string, parameters?: object) {
        predicates.push([expression, parameters]);
        return this;
      },
      orderBy() {
        return this;
      },
      getRawMany: async () => rawSlots,
    };
    const s = {
      findOneBy: async (entity: unknown) =>
        entity === EntitySchemas.photographers
          ? {
              id: 'p1',
              user_id: 'u1',
              verification_status: 'verified',
              is_available: true,
            }
          : { id: 'u1', status: 'active' },
      createQueryBuilder: (entity: unknown) => {
        assert.equal(entity, EntitySchemas.offline_slots);
        return builder;
      },
    } as unknown as EntityManager;

    const result = await new CalendarUseCases(
      {} as PendingBookingsPort,
      noBookings,
    ).futureOfflineSlots(
      s,
      { sub: 'customer', roles: ['customer'] },
      {
        photographer_id: 'p1',
        from: '2029-12-31T00:00:00.000Z',
        to: '2030-01-31T00:00:00.000Z',
      },
    );

    assert.deepEqual(selections, [
      ['slot.id', 'id'],
      ['slot.from', 'from'],
      ['slot.to', 'to'],
    ]);
    assert.deepEqual(predicates, [
      ['slot.photographer_id = :photographerId', { photographerId: 'p1' }],
      ['slot.from >= :from', { from: new Date(now).toISOString() }],
      [
        'slot.from < :to',
        { to: new Date('2030-01-31T00:00:00.000Z').toISOString() },
      ],
    ]);
    assert.deepEqual(result, {
      items: [
        {
          id: 'slot-1',
          from: '2030-01-03T09:00:00.000Z',
          to: '2030-01-03T12:00:00.000Z',
        },
      ],
    });
    assert.ok(!JSON.stringify(result).includes('private reason'));
  } finally {
    Date.now = originalNow;
  }
});

test('blocking time asks booking for overlapping bookings and reads only overlapping blocks', async () => {
  const from = '2030-01-01T09:00:00+07:00',
    to = '2030-01-01T12:00:00+07:00';
  const reads: { entity: unknown; options: any }[] = [];
  const asked: object[] = [];
  const s = {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u1', keycloak_id: 'kc-u1', status: 'active' }]
        : [{ id: 'p1', user_id: 'u1' }],
    findOne: async () => ({ id: 'p1' }),
    find: async (entity: unknown, options: object) => {
      if (entity === EntitySchemas.bookings)
        throw new Error('calendar must not read the bookings table');
      reads.push({ entity, options });
      return [];
    },
    save: async (_entity: unknown, row: object) => ({ id: 'slot', ...row }),
  } as unknown as EntityManager;
  const bookings = {
    bookingsOverlapping: async (_s: unknown, pid: string, window: object) => {
      asked.push({ pid, window });
      return [];
    },
  } as unknown as PhotographerBookingsPort;
  await new CalendarUseCases(
    {
      pendingOverlapping: async () => [],
      decline: async () => 0,
    } as unknown as PendingBookingsPort,
    bookings,
  ).block(s, { sub: 'kc-u1', roles: ['photographer'] }, { from, to });
  assert.deepEqual(asked, [
    {
      pid: 'p1',
      window: {
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      },
    },
  ]);
  const read = reads.find((r) => r.entity === EntitySchemas.offline_slots);
  assert.ok(read, 'overlap query expected');
  const where = read.options.where as {
    photographer_id: string;
    to: FindOperator<string>;
    from: FindOperator<string>;
  };
  assert.equal(where.photographer_id, 'p1');
  assert.equal(where.to.type, 'moreThan');
  assert.equal(where.from.type, 'lessThan');
});

test('blocking over pending requests needs the photographer consent', async () => {
  const s = {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u1', keycloak_id: 'kc-u1', status: 'active' }]
        : [{ id: 'p1', user_id: 'u1' }],
    findOne: async () => ({ id: 'p1' }),
    find: async () => [],
    save: async () => {
      throw new Error('must not save without consent');
    },
  } as unknown as EntityManager;
  const declined: string[][] = [];
  const port = {
    pendingOverlapping: async () => [{ id: 'b1' }],
    decline: async (_s: unknown, ids: string[]) => {
      declined.push(ids);
      return ids.length;
    },
  } as unknown as PendingBookingsPort;
  const range = {
    from: '2030-01-01T09:00:00+07:00',
    to: '2030-01-01T12:00:00+07:00',
  };
  await assert.rejects(
    new CalendarUseCases(port, noBookings).block(
      s,
      { sub: 'kc-u1', roles: ['photographer'] },
      range,
    ),
    /send decline_pending: true/,
  );
  assert.equal(declined.length, 0);
});
