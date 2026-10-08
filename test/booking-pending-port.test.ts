import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { BookingUseCases } from '../src/modules/booking/core/booking.use-case';
import type { RatingUpdaterPort } from '../src/modules/booking/ports/rating-updater.port';
import type { PaidAmountsPort } from '../src/modules/booking/ports/paid-amounts.port';

/** Fake payment service: no payments have been made. */
const noPayments = {
  paidAmounts: async (_s: unknown, ids: string[]) =>
    Object.fromEntries(ids.map((id) => [id, 0])),
} as unknown as PaidAmountsPort;

/**
 * 2030-01-01 is a Tuesday; times are in Vietnam time.
 *
 * @param hour String value used by the operation: hour.
 * @returns Result returned by `toISOString`.
 */
const at = (hour: string) =>
  new Date(`2030-01-01T${hour}:00+07:00`).toISOString();
const pending = [
  {
    id: 'morning',
    customer_id: 'c1',
    from: at('09:00'),
    to: at('10:00'),
    status: 'pending',
  },
  {
    id: 'evening',
    customer_id: 'c2',
    from: at('18:00'),
    to: at('19:00'),
    status: 'pending',
  },
];

test('declining skips requests that were answered in the meantime', async () => {
  const updates: object[] = [];
  const s = {
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.bookings ? pending : [],
    findOneBy: async () => ({ id: 'x', user_id: 'u' }),
    update: async (_e: unknown, where: { id: string }) => {
      updates.push(where);
      // the evening request was accepted by someone else just now
      return { affected: where.id === 'evening' ? 0 : 1 };
    },
    save: async (_e: unknown, row: object) => row,
  } as unknown as EntityManager;
  const useCases = new BookingUseCases({} as RatingUpdaterPort, noPayments);
  assert.equal(
    await useCases.decline(
      s,
      ['morning', 'evening'],
      'Photographer blocked this time',
    ),
    1,
  );
  assert.equal(updates.length, 2);
});
