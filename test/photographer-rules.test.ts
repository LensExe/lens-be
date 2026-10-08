import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '../src/shared/database';
import {
  PhotographerApplication,
  PhotographerProfile,
} from '../src/modules/photographer/photographer.domain';
import { PortfolioUseCases } from '../src/modules/photographer/portfolio/portfolio.use-case';
import { BookingPlanUseCases } from '../src/modules/photographer/booking-plan/booking-plan.use-case';
import type { PlanBookingsPort } from '../src/modules/photographer/ports/plan-bookings.port';
import type { MediaOwnershipPort } from '../src/modules/photographer/ports/media-ownership.port';
import type { ObjectStorage } from '../src/shared/integrations/s3/storage.port';

test('the tax code is locked once the profile is approved', () => {
  PhotographerProfile.assertTaxCodeEditable('pending', '0312', '9999');
  PhotographerProfile.assertTaxCodeEditable('verified', '0312', '0312');
  PhotographerProfile.assertTaxCodeEditable('verified', '0312', undefined);
  assert.throws(
    () => PhotographerProfile.assertTaxCodeEditable('verified', '0312', '9999'),
    /Tax code cannot be changed after approval/,
  );
});

test('photographer styles use the shared vocabulary and are normalized', () => {
  assert.deepEqual(
    PhotographerProfile.normalizeStyles([' Wedding ', 'PORTRAIT']),
    ['wedding', 'portrait'],
  );
  assert.throws(
    () => PhotographerProfile.normalizeStyles(['unknown-style']),
    /Unsupported photography style/,
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
    { portfolio_id: 'album', media_id: 'm1' },
  );
  assert.deepEqual(locks[0], { mode: 'pessimistic_write' });
});

test("the photographer's own plan list returns all plans", async () => {
  const s = {
    findBy: async () => [
      { id: 'p1', user_id: 'u1', keycloak_id: 'kc', status: 'active' },
    ],
    find: async () => [
      { id: 'short', duration_minutes: 60 },
      { id: 'wedding', duration_minutes: 13 * 60 },
    ],
  } as unknown as EntityManager;
  const useCases = new BookingPlanUseCases({} as PlanBookingsPort);
  const { items } = await useCases.me(s, {
    sub: 'kc',
    roles: ['photographer'],
  });
  assert.deepEqual(
    items.map((plan) => plan.id),
    ['short', 'wedding'],
  );
});

test('viewing a portfolio costs the same number of queries for 1 or 3 photos', async () => {
  const run = async (count: number) => {
    const items = Array.from({ length: count }, (_, i) => `m${i}`);
    let reads = 0;
    const s = {
      findOneBy: async (entity: unknown, where: { id: string }) => {
        reads++;
        if (entity === EntitySchemas.portfolios)
          return {
            id: 'album',
            photographer_id: 'p1',
            items,
            cover_media_id: null,
          };
        if (entity === EntitySchemas.photographers)
          return { id: 'p1', user_id: 'u1', verification_status: 'verified' };
        if (entity === EntitySchemas.users)
          return { id: 'u1', status: 'active' };
        return { id: where.id, file_key: `key-${where.id}` };
      },
      findBy: async () => {
        reads++;
        return items.map((id) => ({ id, file_key: `key-${id}` }));
      },
    } as unknown as EntityManager;
    const storage = {
      downloadUrl: async (key: string) => `https://files/${key}`,
    } as unknown as ObjectStorage;
    const album = await new PortfolioUseCases(
      {} as MediaOwnershipPort,
      storage,
    ).get(s, { sub: '', roles: [] }, { portfolio_id: 'album' });
    assert.deepEqual(
      album.items.map((i: { media_id: string; download_url: string }) => [
        i.media_id,
        i.download_url,
      ]),
      items.map((id) => [id, `https://files/key-${id}`]),
    );
    return reads;
  };
  assert.equal(await run(3), await run(1));
});

test('a plan with bookings cannot be deleted; booking is asked, its table is not read', async () => {
  const run = (bookings: number) => {
    const s = {
      findBy: async () => [
        { id: 'p1', user_id: 'u1', keycloak_id: 'kc', status: 'active' },
      ],
      findOneBy: async () => ({ id: 'plan', photographer_id: 'p1' }),
      countBy: async () => {
        throw new Error('photographer must not read the bookings table');
      },
      delete: async () => ({}),
    } as unknown as EntityManager;
    return new BookingPlanUseCases({
      bookingCountForPlan: async () => bookings,
    } as unknown as PlanBookingsPort).remove(
      s,
      { sub: 'kc', roles: ['photographer'] },
      {
        booking_plan_id: 'plan',
      },
    );
  };
  await assert.rejects(run(2), /deactivate it instead/);
  assert.deepEqual(await run(0), { deleted: true });
});
