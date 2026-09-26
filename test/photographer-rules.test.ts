import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { BookingPlan } from '../src/modules/photographer/booking-plan.domain';
import {
  PhotographerApplication,
  PhotographerProfile,
} from '../src/modules/photographer/photographer.domain';
import { PortfolioUseCases } from '../src/modules/photographer/portfolio.use-case';
import type { MediaOwnershipPort } from '../src/modules/photographer/ports/media-ownership.port';
import type { ObjectStorage } from '../src/shared/integrations/s3/storage.port';

test('a plan cannot be longer than the longest working shift', () => {
  BookingPlan.assertFitsShift(720, 720);
  assert.throws(
    () => BookingPlan.assertFitsShift(780, 720),
    /longer than your longest working shift/,
  );
});

test('the tax code is locked once the profile is approved', () => {
  PhotographerProfile.assertTaxCodeEditable('pending', '0312', '9999');
  PhotographerProfile.assertTaxCodeEditable('verified', '0312', '0312');
  PhotographerProfile.assertTaxCodeEditable('verified', '0312', undefined);
  assert.throws(
    () => PhotographerProfile.assertTaxCodeEditable('verified', '0312', '9999'),
    /Tax code cannot be changed after approval/,
  );
});

test('an admin cannot review their own photographer application', () => {
  PhotographerApplication.assertNotOwnApplication('applicant', 'admin');
  assert.throws(
    () => PhotographerApplication.assertNotOwnApplication('same', 'same'),
    /Cannot review your own application/,
  );
});

test('changing portfolio items locks the portfolio row first', async () => {
  const locks: unknown[] = [];
  const s = {
    findBy: async () => [
      { id: 'u1', keycloak_id: 'kc', status: 'active', user_id: 'u1' },
    ],
    findOne: async (_e: unknown, options: { lock?: unknown }) => {
      locks.push(options.lock);
      return { id: 'album', photographer_id: 'u1', items: [] };
    },
    getRepository: () => ({
      preload: async (row: object) => row,
      save: async (row: object) => row,
    }),
  } as unknown as EntityManager;
  const media = {
    owned: async () => ({ id: 'm1' }),
  } as unknown as MediaOwnershipPort;
  await new PortfolioUseCases(media, {} as ObjectStorage).add(
    s,
    { sub: 'kc', roles: ['photographer'] },
    { id: 'album', media_id: 'm1' },
  );
  assert.deepEqual(locks[0], { mode: 'pessimistic_write' });
});
