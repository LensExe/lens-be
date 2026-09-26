import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { BookingUseCases } from '../src/modules/booking/booking.use-case';
import type { RatingUpdaterPort } from '../src/modules/booking/ports/rating-updater.port';
import type { PaidAmountsPort } from '../src/modules/booking/ports/paid-amounts.port';

/** Bên payment giả: chưa ai trả đồng nào. */
const noPayments = {
  paidAmounts: async (_s: unknown, ids: string[]) =>
    Object.fromEntries(ids.map((id) => [id, 0])),
} as unknown as PaidAmountsPort;

/** 2030-01-01 là thứ Ba; giờ theo Việt Nam. */
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

test('pending requests that no longer fit the new weekly hours are listed', async () => {
  const s = {
    find: async () => pending,
  } as unknown as EntityManager;
  const useCases = new BookingUseCases({} as RatingUpdaterPort, noPayments);
  const outside = await useCases.pendingOutside(s, 'p1', [
    { weekday: 2, start_time: '08:00', end_time: '17:00' },
  ]);
  assert.deepEqual(
    outside.map((b) => b.id),
    ['evening'],
  );
});

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
