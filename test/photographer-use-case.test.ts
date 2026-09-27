import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { PhotographerUseCases } from '../src/modules/photographer/photographer.use-case';
import type { PhotographerRolePort } from '../src/modules/photographer/ports/photographer-role.port';
import type { PhotographerRatingsPort } from '../src/modules/photographer/ports/photographer-ratings.port';

test('admin photographer list is paged by the database', async () => {
  const queries: { entity: unknown; options: any }[] = [];
  const s = {
    findBy: async () => [
      { id: 'u1', keycloak_id: 'kc-admin', status: 'active' },
    ],
    find: async () => {
      throw new Error('must not load a whole table');
    },
    findAndCount: async (entity: unknown, options: object) => {
      queries.push({ entity, options });
      return [[{ id: 'p1' }], 42];
    },
  } as unknown as EntityManager;
  const useCases = new PhotographerUseCases(
    {} as PhotographerRolePort,
    {} as PhotographerRatingsPort,
  );
  const result = await useCases.admin(
    s,
    { sub: 'kc-admin', roles: ['admin'] },
    { verification_status: 'pending', limit: 10, offset: 30 },
  );
  assert.deepEqual(result, {
    items: [{ id: 'p1' }],
    total: 42,
    offset: 30,
    limit: 10,
  });
  assert.equal(queries[0].entity, EntitySchemas.photographers);
  assert.deepEqual(queries[0].options.where, {
    verification_status: 'pending',
  });
  assert.equal(queries[0].options.skip, 30);
  assert.equal(queries[0].options.take, 10);
});

test('searching photographers costs the same number of queries for 1 or 3 results', async () => {
  const run = async (count: number) => {
    const ids = Array.from({ length: count }, (_, i) => `p${i}`);
    let reads = 0;
    const builder: Record<string, unknown> = {};
    for (const m of [
      'innerJoin',
      'leftJoin',
      'where',
      'andWhere',
      'select',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ])
      builder[m] = () => builder;
    builder.getCount = async () => count;
    builder.getRawMany = async () => ids.map((id) => ({ id }));
    const row = (id: string) => ({
      id,
      user_id: `u-${id}`,
      styles: [],
      verification_status: 'verified',
      is_verified: true,
    });
    const s = {
      createQueryBuilder: () => builder,
      find: async (entity: unknown) => {
        reads++;
        return entity === EntitySchemas.ranks
          ? [
              {
                code: 'new',
                name: 'New',
                min_completed: 0,
                commission_percent: 15,
              },
            ]
          : [];
      },
      findBy: async (entity: unknown) => {
        reads++;
        if (entity === EntitySchemas.photographer_ratings)
          throw new Error('photographer must ask feedback for ratings');
        return entity === EntitySchemas.photographers
          ? ids.map(row)
          : entity === EntitySchemas.users
            ? ids.map((id) => ({
                id: `u-${id}`,
                fullname: id,
                status: 'active',
              }))
            : [];
      },
      findOneBy: async (entity: unknown, where: { id: string }) => {
        reads++;
        return entity === EntitySchemas.photographers
          ? row(where.id)
          : { id: where.id, fullname: where.id, status: 'active' };
      },
    } as unknown as EntityManager;
    const ratings = {
      ratingsOf: async (_s: unknown, pids: string[]) => {
        reads++;
        return Object.fromEntries(
          pids.map((pid) => [
            pid,
            {
              average_rating: 0,
              total_feedbacks: 0,
              total_bookings: 0,
              return_customers: 0,
            },
          ]),
        );
      },
    } as unknown as PhotographerRatingsPort;
    const result = await new PhotographerUseCases(
      {} as PhotographerRolePort,
      ratings,
    ).search(s, { sub: '', roles: [] }, {});
    assert.deepEqual(
      result.items.map((p) => p.id),
      ids,
    );
    return reads;
  };
  assert.equal(await run(3), await run(1));
});
