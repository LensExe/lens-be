import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { ReviewUseCases } from '../src/modules/feedback/review.use-case';
import { Review } from '../src/modules/feedback/review.domain';
import { EntitySchemas } from '../src/shared/database';

test('ratings for many photographers in one query, null when none yet', async () => {
  let queries = 0;
  const s = {
    findBy: async () => {
      queries++;
      return [{ photographer_id: 'p1', average_rating: 4.9 }];
    },
  } as unknown as EntityManager;
  const ratings = await new ReviewUseCases().ratingsOf(s, ['p1', 'p2']);
  assert.deepEqual(ratings, {
    p1: { photographer_id: 'p1', average_rating: 4.9 },
    p2: null,
  });
  assert.equal(queries, 1);
});

test('average punctuality counts only visible reviews of the photographer', async () => {
  const where: string[] = [];
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.where = (sql: string, params?: object) => {
    where.push(`${sql} ${JSON.stringify(params ?? {})}`);
    return builder;
  };
  builder.andWhere = builder.where;
  builder.getRawOne = async () => ({ punctuality: '4.5' });
  const s = { createQueryBuilder: () => builder } as unknown as EntityManager;
  assert.equal(await new ReviewUseCases().averagePunctuality(s, 'p1'), 4.5);
  assert.ok(
    where.some((w) =>
      w.includes('f.photographer_id = :photographerId {"photographerId":"p1"}'),
    ),
  );
  assert.ok(where.some((w) => w.includes('f.status = :visible')));
});

test('opening a rating creates the empty row once and leaves an existing one alone', async () => {
  const saved: object[] = [];
  const run = (existing: object[]) =>
    new ReviewUseCases().openRating(
      {
        findBy: async () => existing,
        save: async (_e: unknown, row: object) => {
          saved.push(row);
          return row;
        },
      } as unknown as EntityManager,
      'p1',
    );
  await run([]);
  await run([{ photographer_id: 'p1' }]);
  assert.deepEqual(saved, [{ photographer_id: 'p1' }]);
});

test('summary from grouped counts gives average, total and distribution', async () => {
  assert.deepEqual(
    Review.summaryFromCounts([
      { rating: 5, count: 3 },
      { rating: 4, count: 1 },
    ]),
    {
      average_rating: 4.75,
      total_feedbacks: 4,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 },
    },
  );
});

test('booking stats update only the booking part of the rating, under a row lock', async () => {
  const calls: { op: string; args: unknown[] }[] = [];
  const s = {
    findBy: async () => [{ photographer_id: 'p1' }],
    findOne: async (_e: unknown, options: unknown) => {
      calls.push({ op: 'lock', args: [options] });
      return { photographer_id: 'p1' };
    },
    update: async (_e: unknown, where: unknown, values: unknown) => {
      calls.push({ op: 'update', args: [where, values] });
      return { affected: 1 };
    },
  } as unknown as EntityManager;
  await new ReviewUseCases().recordBookingStats(s, 'p1', {
    completedBookings: 12,
    returnCustomers: 3,
  });
  assert.equal(calls[0].op, 'lock');
  assert.deepEqual((calls[0].args[0] as { lock: unknown }).lock, {
    mode: 'pessimistic_write',
  });
  const [where, values] = calls[1].args as [object, Record<string, unknown>];
  assert.deepEqual(where, { photographer_id: 'p1' });
  assert.equal(values.total_bookings, 12);
  assert.equal(values.return_customers, 3);
  assert.equal('average_rating' in values, false);
});

test('review status: the author deletes, an admin hides and restores only what an admin hid', () => {
  assert.equal(Review.nextStatus('delete', 'visible'), 'deleted_by_author');
  assert.equal(
    Review.nextStatus('delete', 'hidden_by_admin'),
    'deleted_by_author',
  );
  assert.throws(
    () => Review.nextStatus('delete', 'deleted_by_author'),
    /already deleted/,
  );
  assert.equal(Review.nextStatus('hide', 'visible'), 'hidden_by_admin');
  assert.throws(
    () => Review.nextStatus('hide', 'hidden_by_admin'),
    /Only visible reviews can be hidden/,
  );
  assert.equal(Review.nextStatus('restore', 'hidden_by_admin'), 'visible');
  for (const status of ['visible', 'deleted_by_author'] as const)
    assert.throws(
      () => Review.nextStatus('restore', status),
      /Only reviews hidden by an admin can be restored/,
    );
});

test('review rules: completed booking, visible review, 7-day window, non-empty edit', () => {
  Review.requireCompletedBooking('completed');
  assert.throws(
    () => Review.requireCompletedBooking('shot'),
    /requires completed booking/,
  );
  Review.requireVisible('visible');
  assert.throws(() => Review.requireVisible('hidden_by_admin'), /hidden/);
  const created = '2026-09-01T00:00:00.000Z';
  Review.requireEditWindow(created, Date.parse('2026-09-08T00:00:00.000Z'));
  assert.throws(
    () =>
      Review.requireEditWindow(created, Date.parse('2026-09-08T00:00:01.000Z')),
    /editing window expired/,
  );
  Review.requireChanges({ comment: 'x', rating: undefined });
  assert.throws(
    () => Review.requireChanges({ rating: undefined }),
    /Nothing to update/,
  );
});

test('changing a review locks its row before reading its state', async () => {
  const locks: unknown[] = [];
  const s = {
    findOne: async (_e: unknown, options: { lock?: unknown }) => {
      locks.push(options.lock);
      return {
        id: 'r1',
        status: 'deleted_by_author',
        booking_id: 'b1',
        customer_id: 'c1',
        photographer_id: 'p1',
        created_at: new Date().toISOString(),
      };
    },
    findBy: async () => [{ id: 'c1', user_id: 'u1', status: 'active' }],
  } as unknown as EntityManager;
  await assert.rejects(
    new ReviewUseCases().update(
      s,
      { sub: 'kc', roles: ['customer'] },
      {
        id: 'r1',
        comment: 'x',
      },
    ),
    /Review is hidden/,
  );
  assert.deepEqual(locks, [{ mode: 'pessimistic_write' }]);
});

test('only the author edits a review; the booking table is not read', async () => {
  const s = {
    findOne: async () => ({
      id: 'r1',
      status: 'visible',
      booking_id: 'b1',
      customer_id: 'c1',
      photographer_id: 'p1',
      created_at: new Date().toISOString(),
    }),
    findBy: async (entity: unknown) =>
      entity === EntitySchemas.customers
        ? [{ id: 'c-other', user_id: 'u2' }]
        : [{ id: 'u2', status: 'active' }],
    findOneBy: async (entity: unknown) => {
      if (entity === EntitySchemas.bookings)
        throw new Error('feedback must not read the bookings table');
      return null;
    },
  } as unknown as EntityManager;
  const actor = { sub: 'kc', roles: ['customer'] };
  for (const run of [
    () => new ReviewUseCases().update(s, actor, { id: 'r1', comment: 'x' }),
    () => new ReviewUseCases().remove(s, actor, { id: 'r1' }),
  ])
    await assert.rejects(run(), /Review access denied/);
});
