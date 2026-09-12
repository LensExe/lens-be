import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { IdentityUseCases } from '../src/modules/identity/identity.use-case';

test('identity use case persists lowercase account statuses', async () => {
  const users = new Map([
    ['admin', { id: 'admin', keycloak_id: 'kc-admin', status: 'active' }],
    [
      'customer',
      { id: 'customer', keycloak_id: 'kc-customer', status: 'active' },
    ],
  ]);
  const manager = {
    findBy: async (_entity: unknown, where: { keycloak_id: string }) =>
      [...users.values()].filter(
        (user) => user.keycloak_id === where.keycloak_id,
      ),
    findOneBy: async (_entity: unknown, where: { id: string }) =>
      users.get(where.id) ?? null,
    getRepository: () => ({
      preload: async (changes: { id: string; status: string }) => ({
        ...users.get(changes.id),
        ...changes,
      }),
      save: async (user: {
        id: string;
        keycloak_id: string;
        status: string;
      }) => {
        users.set(user.id, user);
        return user;
      },
    }),
  } as unknown as EntityManager;
  const actor = { sub: 'kc-admin', roles: ['admin'] };
  const useCases = new IdentityUseCases();

  await useCases.suspend(manager, actor, { id: 'customer' });
  assert.equal(users.get('customer')?.status, 'suspended');
  await useCases.unsuspend(manager, actor, { id: 'customer' });
  assert.equal(users.get('customer')?.status, 'active');
  await useCases.ban(manager, actor, { id: 'customer' });
  assert.equal(users.get('customer')?.status, 'banned');
  await assert.rejects(
    useCases.unsuspend(manager, actor, { id: 'customer' }),
    /cannot be reactivated/,
  );
  await assert.rejects(
    useCases.suspend(manager, actor, { id: 'admin' }),
    /Cannot change own admin status/,
  );
});
