import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import { PhotographerUseCases } from '../src/modules/photographer/photographer.use-case';
import type { PhotographerRolePort } from '../src/modules/photographer/ports/photographer-role.port';

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
  const useCases = new PhotographerUseCases({} as PhotographerRolePort);
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
