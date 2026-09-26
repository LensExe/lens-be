import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { BookingUseCases } from '../src/modules/booking/booking.use-case';
import type { RatingUpdaterPort } from '../src/modules/booking/ports/rating-updater.port';

const booking = {
  id: 'b1',
  customer_id: 'c1',
  photographer_id: 'p1',
  status: 'pending',
  from: '2030-01-01T02:00:00.000Z',
  to: '2030-01-01T03:00:00.000Z',
  deposit_amount: 300000,
  total_amount: 1000000,
  gallery_published_at: null,
};

/** EntityManager giả cho một lần khách huỷ booking; `affected` là số dòng câu UPDATE đổi được. */
function manager(affected: number) {
  const updates: { where: object; changes: object }[] = [];
  const s = {
    updates,
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u1', keycloak_id: 'kc-u1', status: 'active' }]
        : [],
    findOneBy: async (entity: unknown) =>
      entity === EntitySchemas.bookings
        ? booking
        : entity === EntitySchemas.customers
          ? { id: 'c1', user_id: 'u1' }
          : { id: 'p1', user_id: 'u2' },
    update: async (_entity: unknown, where: object, changes: object) => {
      updates.push({ where, changes });
      return { affected };
    },
    save: async (_entity: unknown, row: object) => row,
  };
  return s as unknown as EntityManager & { updates: typeof updates };
}

test('a status change only applies if the booking is still in the status it was read in', async () => {
  const useCases = new BookingUseCases({} as RatingUpdaterPort);
  const actor = { sub: 'kc-u1', roles: ['customer'] };
  const ok = manager(1);
  await useCases.cancel(ok, actor, { id: 'b1', reason: 'Changed plans' });
  assert.deepEqual(ok.updates[0].where, { id: 'b1', status: 'pending' });
  // someone else changed it first (accepted, expired...): nothing is written, 409
  const raced = manager(0);
  await assert.rejects(
    useCases.cancel(raced, actor, { id: 'b1', reason: 'Changed plans' }),
    /changed by someone else/,
  );
});

test('only the customer or photographer of the booking may cancel it, not an admin', async () => {
  const useCases = new BookingUseCases({} as RatingUpdaterPort);
  // u9 is neither the customer (u1) nor the photographer (u2) of the booking
  const s = manager(1);
  Object.assign(s, {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u9', keycloak_id: 'kc-admin', status: 'active' }]
        : [],
  });
  await assert.rejects(
    useCases.cancel(
      s,
      { sub: 'kc-admin', roles: ['admin', 'customer'] },
      { id: 'b1', reason: 'x' },
    ),
    /Booking access denied/,
  );
  assert.equal(s.updates.length, 0);
});

test('a photographer who declined or was revoked no longer sees the collaborator list', async () => {
  const useCases = new BookingUseCases({} as RatingUpdaterPort);
  const lookups: object[] = [];
  const s = {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.users
        ? [{ id: 'u3', keycloak_id: 'kc-b', status: 'active' }]
        : entity === EntitySchemas.photographers
          ? [{ id: 'p3', user_id: 'u3' }]
          : [],
    findOneBy: async (entity: unknown) =>
      entity === EntitySchemas.bookings ? booking : { id: 'c1', user_id: 'u1' },
    existsBy: async (_entity: unknown, where: object) => {
      lookups.push(where);
      return false; // only a declined invitation exists
    },
    find: async () => [],
  } as unknown as EntityManager;
  await assert.rejects(
    useCases.collaborators(
      s,
      { sub: 'kc-b', roles: ['photographer'] },
      { id: 'b1' },
    ),
    /Booking access denied/,
  );
  // the lookup only counts live invitations
  assert.match(JSON.stringify(lookups[0]), /invited/);
  assert.match(JSON.stringify(lookups[0]), /accepted/);
});
