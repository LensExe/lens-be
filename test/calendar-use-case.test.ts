import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager, FindOperator } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { CalendarUseCases } from '../src/modules/calendar/calendar.use-case';
import type { PendingBookingsPort } from '../src/modules/calendar/ports/pending-bookings.port';
import type { CollaborationTimesPort } from '../src/modules/calendar/ports/collaboration-times.port';
import type { PhotographerBookingsPort } from '../src/modules/calendar/ports/photographer-bookings.port';

const noCollaborations = {
  collaborationTimes: async () => [],
} as unknown as CollaborationTimesPort;
const noBookings = {
  bookingsOverlapping: async () => [],
} as unknown as PhotographerBookingsPort;

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
    noCollaborations,
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
    new CalendarUseCases(port, noCollaborations, noBookings).block(
      s,
      { sub: 'kc-u1', roles: ['photographer'] },
      range,
    ),
    /send decline_pending: true/,
  );
  assert.equal(declined.length, 0);
});

test('longest shift of a photographer, default hours when none declared', async () => {
  const useCases = new CalendarUseCases(
    {} as PendingBookingsPort,
    noCollaborations,
    noBookings,
  );
  const withShifts = {
    findBy: async () => [
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 6, start_time: '07:00', end_time: '24:00' },
    ],
  } as unknown as EntityManager;
  assert.equal(await useCases.longestShiftMinutes(withShifts, 'p1'), 17 * 60);
  const none = { findBy: async () => [] } as unknown as EntityManager;
  assert.equal(await useCases.longestShiftMinutes(none, 'p1'), 12 * 60);
});
