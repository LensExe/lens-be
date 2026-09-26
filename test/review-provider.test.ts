import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { ReviewUseCases } from '../src/modules/feedback/review.use-case';

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
  for (const m of ['innerJoin', 'select']) builder[m] = () => builder;
  builder.where = (sql: string) => {
    where.push(sql);
    return builder;
  };
  builder.andWhere = builder.where;
  builder.getRawOne = async () => ({ punctuality: '4.5' });
  const s = { createQueryBuilder: () => builder } as unknown as EntityManager;
  assert.equal(await new ReviewUseCases().averagePunctuality(s, 'p1'), 4.5);
  assert.ok(where.some((w) => w.includes('is_visible')));
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
