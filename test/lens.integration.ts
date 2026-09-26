/* eslint-disable */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID, generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ApiModule } from '../src/features/api/api.module';
import { ObjectStorage } from '../src/shared/integrations/s3/storage.port';
import { PaymentGateway } from '../src/shared/integrations/payment/payment.port';
import type { Actor } from '../src/shared/platform/auth/actor';
import {
  databaseEntities,
  EntitySchemas,
} from '../src/shared/database/entities';
import { KeycloakService } from '../src/shared/integrations/keycloak/keycloak.service';
import { setupApi } from '../src/features/api/setup';
import { OutboxWorker } from '../src/features/workers/outbox.worker';
import { PhotographerBadgeJob } from '../src/features/workers/photographer-badge.job';
import { BookingAutoCompleteJob } from '../src/features/workers/booking-auto-complete.job';
import { BookingExpirePendingJob } from '../src/features/workers/booking-expire-pending.job';
import { BookingCancelUnpaidJob } from '../src/features/workers/booking-cancel-unpaid.job';
import { Booking } from '../src/modules/booking/booking.domain';
import { CommandBus } from '@nestjs/cqrs';
import { IdentityCustomerRegisterCommand } from '../src/modules/identity/identity.command';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';
import { S3ObjectStorage } from '../src/shared/integrations/s3/s3-storage.service';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';

let db: DataSource, app: INestApplication, base: string, document: any;
const testSchema = 'lens_test_' + randomUUID().replaceAll('-', '');
let customer: string,
  adminUser: string,
  photoUser: string,
  photo: string,
  plan: string,
  booking: string,
  rival: string,
  deposit: string,
  remaining: string,
  media: string;
const actors: Record<string, Actor> = {
  customer: {
    sub: 'kc-customer',
    email: 'customer@example.test',
    roles: ['customer'],
  },
  photographer: {
    sub: 'kc-photographer',
    email: 'photographer@example.test',
    roles: ['customer', 'photographer'],
  },
  applicant: {
    sub: 'kc-applicant',
    email: 'applicant@example.test',
    roles: ['customer'],
  },
  stranger: {
    sub: 'kc-stranger',
    email: 'stranger@example.test',
    roles: ['customer'],
  },
  admin: {
    sub: 'kc-admin',
    email: 'admin@example.test',
    roles: ['admin', 'system', 'internal'],
  },
};
let failGateway = false;
async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
async function ok(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
) {
  const res = await api(method, path, token, body);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}
before(
  async () => {
    const url = process.env.LENS_TEST_DATABASE_URL;
    assert.ok(
      url && new URL(url).pathname === '/lens_test',
      'Tests require an isolated /lens_test database',
    );
    db = new DataSource({
      type: 'postgres',
      url,
      entities: databaseEntities,
      extra: { options: `-c search_path=${testSchema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${testSchema}"`);
    // Apply every numbered migration in order, same as scripts/migrate-lens.cjs.
    for (const file of readdirSync('migrations')
      .filter((f) => /^\d{3}_[a-z0-9_-]+\.sql$/i.test(f))
      .sort())
      await db.query(readFileSync(`migrations/${file}`, 'utf8'));
    // overrideProvider (not a root provider) replaces the DataSource that DatabaseModule
    // injects into handlers; otherwise tests write into the .env database.
    const mod = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(DataSource)
      .useValue(db)
      .overrideProvider(KeycloakService)
      .useValue({
        verifyToken: async (token: string) => {
          if (!actors[token]) throw new Error('Invalid token');
          return {
            ...actors[token],
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
        },
      })
      .overrideProvider(ObjectStorage)
      .useValue({
        uploadUrl: async () => 'https://storage.example.test/upload',
        verify: async () => {},
        downloadUrl: async () => 'https://storage.example.test/download',
        delete: async () => {},
      })
      .overrideProvider(PaymentGateway)
      .useValue({
        create: async (code: number) => {
          if (failGateway)
            throw new DomainError('unavailable', 'Simulated timeout');
          return {
            checkout_url: `https://payment.example.test/${code}`,
            qr_code: 'test-qr',
          };
        },
        verify: async (body: any) => {
          if (body.signature !== 'test-valid')
            throw new DomainError('invalid', 'Invalid signature');
          return { ...body.data, success: body.code === '00' };
        },
      })
      .compile();
    app = mod.createNestApplication({ logger: false });
    document = setupApi(app);
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    // Turn off the periodic worker so event processing assertions are deterministic.
    app.get(OutboxWorker).onApplicationShutdown();
  },
  { timeout: 30000 },
);
after(async () => {
  await app?.close();
  if (db?.isInitialized) {
    await db.query(`DROP SCHEMA "${testSchema}" CASCADE`);
    await db.destroy();
  }
});
test('OpenAPI covers the implementation contract with security, body and response schemas', () => {
  const tracker = JSON.parse(
    readFileSync('docs/api-tracker.json', 'utf8'),
  ).filter((r: any) =>
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method),
  );
  let count = 0;
  for (const path of Object.values(document.paths))
    count += Object.keys(path as object).filter((m) =>
      ['get', 'post', 'put', 'patch', 'delete'].includes(m),
    ).length;
  assert.equal(count, tracker.length);
  for (const r of tracker) {
    const path = r.path.replace(/:(\w+)/g, '{$1}'),
      op = document.paths[path]?.[r.method.toLowerCase()];
    assert.equal(op?.operationId, r.id);
    assert.ok(op.responses['200'].content['application/json'].schema);
    if (r.role !== 'Public' && r.role !== 'Payment Provider')
      assert.ok(op.security?.length);
  }
});
test('authentication, registration and profile isolation', async () => {
  assert.equal((await api('GET', '/users/me')).status, 401);
  // POST /auth/register now creates the Keycloak account first, so tests create the
  // local profile through the same command the register flow ends with.
  for (const token of Object.keys(actors)) {
    const u = await app
      .get(CommandBus)
      .execute(
        new IdentityCustomerRegisterCommand(actors[token], { fullname: token }),
      );
    if (token === 'customer') customer = u.id;
    if (token === 'photographer') photoUser = u.id;
    if (token === 'admin') adminUser = u.id;
  }
  await db.transaction((s) =>
    s.save(EntitySchemas.admins, { user_id: adminUser }),
  );
  assert.equal((await ok('GET', '/users/me', 'customer')).id, customer);
  assert.equal(
    (await api('PATCH', '/users/me', 'customer', { status: 'suspended' }))
      .status,
    400,
  );
  assert.equal(
    (await api('PATCH', '/users/me', 'customer', { fullname: null })).status,
    400,
  );
  const publicUser = await ok('GET', `/users/${customer}`, 'stranger');
  assert.equal(publicUser.email, undefined);
  assert.equal(publicUser.keycloak_id, undefined);
});
test('static photographer routes, validation and real persistence', async () => {
  const p = await ok('POST', '/photographers/profile', 'photographer', {
    styles: ['portrait'],
    started_career_at: 2023,
    location: 'Da Nang',
    description: 'Studio',
  });
  photo = p.id;
  assert.equal(p.verification_status, 'pending');
  assert.equal(
    (
      await api('POST', '/photographers/profile', 'photographer', {
        styles: ['portrait'],
        location: 'Da Nang',
      })
    ).status,
    409,
  );
  const approved = await ok(
    'POST',
    `/admin/photographers/${photo}/approve`,
    'admin',
  );
  assert.equal(approved.verification_status, 'verified');
  assert.equal(approved.is_verified, true);
  assert.equal(
    (await api('POST', `/admin/photographers/${photo}/approve`, 'admin'))
      .status,
    409,
  );
  const me = await ok('GET', '/photographers/me', 'photographer');
  assert.equal(me.id, photo);
  assert.equal(me.rank.code, 'newbie');
  assert.equal(me.commission_percent, 10);
  const publicProfile = await ok('GET', `/photographers/${photo}`);
  assert.equal(publicProfile.rank.code, 'newbie');
  assert.deepEqual(publicProfile.badges, []);
  assert.equal(publicProfile.commission_percent, undefined);
  assert.equal((await ok('GET', '/photographers/top-rated')).items.length, 1);
  assert.equal((await api('GET', '/photographers?limit=1000')).status, 400);
  assert.equal(
    (
      await api('PATCH', '/photographers/me/status', 'photographer', {
        is_available: 'false',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api('PATCH', '/photographers/me', 'photographer', {
        is_verified: true,
      })
    ).status,
    400,
  );
  const planBody = {
    name: 'Portrait',
    price: 1000000,
    duration_minutes: 60,
    photo_count: 20,
    retouched_photo_count: 5,
    features: ['All original photos'],
  };
  plan = (
    await ok(
      'POST',
      '/photographers/me/booking-plans',
      'photographer',
      planBody,
    )
  ).id;
  assert.equal(
    (
      await api('POST', '/photographers/me/booking-plans', 'photographer', {
        ...planBody,
        retouched_photo_count: 21,
      })
    ).status,
    400,
  );
  assert.equal(
    (await api('POST', '/photographers/me/booking-plans', 'customer', planBody))
      .status,
    403,
  );
  const spare = await ok(
    'POST',
    '/photographers/me/booking-plans',
    'photographer',
    { ...planBody, name: 'Spare' },
  );
  await ok('PATCH', `/booking-plans/${spare.id}`, 'photographer', {
    is_active: false,
  });
  const publicPlans = await ok('GET', `/photographers/${photo}/booking-plans`);
  assert.deepEqual(
    publicPlans.items.map((p: any) => p.id),
    [plan],
  );
  assert.equal(
    (await ok('GET', '/photographers/me/booking-plans', 'photographer')).items
      .length,
    2,
  );
  assert.deepEqual(
    await ok('DELETE', `/booking-plans/${spare.id}`, 'photographer'),
    { deleted: true },
  );
});
test('rejected photographer application can be fixed and resubmitted', async () => {
  const application = await ok('POST', '/photographers/profile', 'applicant', {
    styles: ['wedding'],
    location: 'Hue',
  });
  const pending = await ok(
    'GET',
    '/admin/photographers?verification_status=pending',
    'admin',
  );
  assert.deepEqual(
    pending.items.map((p: any) => p.id),
    [application.id],
  );
  assert.equal(
    (
      await api(
        'POST',
        `/admin/photographers/${application.id}/reject`,
        'customer',
        { reason: 'x' },
      )
    ).status,
    403,
  );
  await ok('POST', `/admin/photographers/${application.id}/reject`, 'admin', {
    reason: 'Need more portfolio photos',
  });
  const mine = await ok('GET', '/photographers/me', 'applicant');
  assert.equal(mine.verification_status, 'rejected');
  assert.equal(mine.rejection_reason, 'Need more portfolio photos');
  assert.equal(
    (
      await api(
        'POST',
        `/admin/photographers/${application.id}/approve`,
        'admin',
      )
    ).status,
    409,
  );
  const resubmitted = await ok('POST', '/photographers/profile', 'applicant', {
    styles: ['wedding'],
    location: 'Hue',
    description: 'Added portfolio',
  });
  assert.equal(resubmitted.id, application.id);
  assert.equal(resubmitted.verification_status, 'pending');
  assert.equal(resubmitted.rejection_reason, null);
});
test('only verified photographers are public; unavailable ones rank last', async () => {
  const applicant = (await ok('GET', '/photographers/me', 'applicant')).id;
  const publicIds = async () =>
    (await ok('GET', '/photographers?limit=100')).items.map((p: any) => p.id);
  // pending applicant is hidden everywhere public
  assert.equal((await api('GET', `/photographers/${applicant}`)).status, 404);
  assert.equal(
    (await api('GET', `/photographers/${applicant}/portfolios`)).status,
    404,
  );
  assert.equal(
    (await api('GET', `/photographers/${applicant}/booking-plans`)).status,
    404,
  );
  assert.equal(
    (await api('GET', `/photographers/${applicant}/availability`)).status,
    404,
  );
  assert.deepEqual(await publicIds(), [photo]);
  // once approved it shows up; switched off it ranks after available ones
  await ok('POST', `/admin/photographers/${applicant}/approve`, 'admin');
  await ok('GET', `/photographers/${applicant}`);
  await ok('PATCH', '/photographers/me/status', 'photographer', {
    is_available: false,
  });
  assert.deepEqual(await publicIds(), [applicant, photo]);
  await ok('PATCH', '/photographers/me/status', 'photographer', {
    is_available: true,
  });
  // a plan longer than every working shift could never be booked
  assert.equal(
    (
      await api('POST', '/photographers/me/booking-plans', 'photographer', {
        name: 'Whole-day wedding',
        price: 20000000,
        duration_minutes: 13 * 60,
        photo_count: 500,
        retouched_photo_count: 50,
      })
    ).status,
    400,
  );
  // the photographer sees whether each plan still fits the working hours
  assert.ok(
    (
      await ok('GET', '/photographers/me/booking-plans', 'photographer')
    ).items.every((p: { fits_working_hours: boolean }) => p.fits_working_hours),
  );
  // once approved, the tax code only changes through an admin
  assert.equal(
    (
      await api('PATCH', '/photographers/me', 'photographer', {
        tax_code: '9999999999',
      })
    ).status,
    400,
  );
  const found = await ok('GET', '/photographers?keyword=wedd&location=hu');
  assert.deepEqual(
    found.items.map((p: any) => p.id),
    [applicant],
  );
  assert.equal(found.total, 1);
});
test('photographer declares weekly working hours in Vietnam time', async () => {
  const initial = await ok('GET', '/calendar/me/working-hours', 'photographer');
  assert.equal(initial.is_default, true);
  assert.equal(initial.items.length, 7);
  assert.deepEqual(initial.items[0], {
    weekday: 1,
    start_time: '08:00',
    end_time: '20:00',
  });
  const week = [
    { weekday: 1, start_time: '08:00', end_time: '12:00' },
    { weekday: 1, start_time: '14:00', end_time: '18:00' },
    { weekday: 6, start_time: '07:00', end_time: '21:00' },
  ];
  assert.equal(
    (
      await api('PUT', '/calendar/me/working-hours', 'photographer', {
        items: [
          ...week,
          { weekday: 1, start_time: '11:00', end_time: '13:00' },
        ],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api('PUT', '/calendar/me/working-hours', 'photographer', {
        items: [{ weekday: 9, start_time: '08:00', end_time: '12:00' }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api('PUT', '/calendar/me/working-hours', 'customer', {
        items: week,
      })
    ).status,
    403,
  );
  const saved = await ok('PUT', '/calendar/me/working-hours', 'photographer', {
    items: week,
  });
  assert.deepEqual(saved, { items: week, is_default: false });
  const reset = await ok('PUT', '/calendar/me/working-hours', 'photographer', {
    items: [],
  });
  assert.equal(reset.is_default, true);
});
test('calendar blocking and concurrent booking conflict', async () => {
  const blockedDate = new Date(Date.now() + 2 * 864e5)
    .toISOString()
    .slice(0, 10);
  const slot = await ok('POST', '/calendar/blocked-times', 'photographer', {
    date: blockedDate,
    reason: 'Unavailable',
  });
  // a blocked date is the whole day in Vietnam time
  assert.equal(
    slot.from,
    new Date(`${blockedDate}T00:00:00+07:00`).toISOString(),
  );
  assert.equal(
    slot.to,
    new Date(`${blockedDate}T24:00:00+07:00`).toISOString(),
  );
  const at = (hour: number) =>
    new Date(
      Date.parse(`${blockedDate}T00:00:00+07:00`) + hour * 36e5,
    ).toISOString();
  for (const body of [{ date: blockedDate }, { from: at(20), to: at(30) }])
    assert.equal(
      (await api('POST', '/calendar/blocked-times', 'photographer', body))
        .status,
      409,
    );
  assert.equal(
    (
      await api('POST', '/calendar/blocked-times', 'photographer', {
        date: blockedDate,
        from: at(30),
        to: at(32),
      })
    ).status,
    400,
  );
  for (const date of ['2026-13-45', '2026-02-30'])
    assert.equal(
      (await api('POST', '/calendar/blocked-times', 'photographer', { date }))
        .status,
      400,
    );
  // a range may span days and may start right where another block ends
  const range = await ok('POST', '/calendar/blocked-times', 'photographer', {
    from: at(24),
    to: at(60),
  });
  const mine = await ok('GET', '/calendar/me', 'photographer');
  assert.ok(mine.blocked.some((b: { id: string }) => b.id === range.id));
  // from/to keeps only items overlapping the window
  const dayAfter = await ok(
    'GET',
    `/calendar/me?from=${encodeURIComponent(at(24))}&to=${encodeURIComponent(at(48))}`,
    'photographer',
  );
  assert.deepEqual(
    dayAfter.blocked.map((b: { id: string }) => b.id),
    [range.id],
  );
  // free time is the 08:00-20:00 Vietnam shift minus blocks: nothing on the
  // blocked day, the next day's shift starts only after the range ends
  const free = await ok(
    'GET',
    `/photographers/${photo}/availability?from=${encodeURIComponent(at(0))}&to=${encodeURIComponent(at(72))}`,
  );
  assert.deepEqual(free.items, [{ from: at(60), to: at(68) }]);
  await ok('DELETE', `/calendar/blocked-times/${range.id}`, 'photographer');
  await ok('DELETE', `/calendar/blocked-times/${slot.id}`, 'photographer');
  const input = {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: at(33),
    to: at(34),
  };
  // the plan lasts 60 minutes and the default shift ends at 20:00 Vietnam time
  for (const [body, status] of [
    [{ ...input, to: at(35) }, 400],
    [{ ...input, from: at(44), to: at(45) }, 409],
  ] as const)
    assert.equal(
      (await api('POST', '/bookings', 'customer', body)).status,
      status,
    );
  const attempts = await Promise.all([
    api('POST', '/bookings', 'customer', input),
    api('POST', '/bookings', 'stranger', input),
  ]);
  // a pending request does not hold the time: both customers may ask for it
  assert.deepEqual(
    attempts.map((x) => x.status),
    [200, 200],
  );
  booking = attempts[0].body.id;
  rival = attempts[1].body.id;
  // the same customer cannot send the same request twice
  assert.equal((await api('POST', '/bookings', 'customer', input)).status, 409);
  const available = await ok('GET', `/photographers/${photo}/availability`);
  assert.ok(available.items.length > 0);
});
test('booking ownership and lifecycle checks', async () => {
  assert.equal(
    (await api('GET', `/bookings/${booking}`, 'stranger')).status,
    403,
  );
  assert.equal(
    (await api('POST', `/bookings/${booking}/accept`, 'customer')).status,
    403,
  );
  assert.equal(
    (await ok('POST', `/bookings/${booking}/accept`, 'photographer')).status,
    'accepted',
  );
  assert.equal(
    (await api('POST', `/bookings/${booking}/start`, 'photographer')).status,
    409,
  );
  // accepting records when, so the deposit deadline can be counted from it
  assert.ok(
    (await db.manager.findOneByOrFail(EntitySchemas.bookings, { id: booking }))
      .accepted_at,
  );
  // accepting one request turns down the other requests for the same time
  const turnedDown = await ok('GET', `/bookings/${rival}`, 'stranger');
  assert.equal(turnedDown.status, 'rejected');
  const [, last] = (await ok('GET', `/bookings/${rival}/timeline`, 'stranger'))
    .items;
  assert.equal(last.actor_role, 'system');
  assert.equal(last.actor_user_id, null);
  assert.match(last.reason, /accepted another booking/);
  // an admin can look into any booking to handle disputes
  assert.equal((await ok('GET', `/bookings/${booking}`, 'admin')).id, booking);
  assert.ok(
    (await ok('GET', `/bookings/${booking}/timeline`, 'admin')).items.length,
  );
  // every transition leaves one history row with who did it
  const timeline = await ok('GET', `/bookings/${booking}/timeline`, 'customer');
  assert.deepEqual(
    timeline.items.map(
      (x: {
        from_status: string | null;
        to_status: string;
        actor_role: string;
      }) => [x.from_status, x.to_status, x.actor_role],
    ),
    [
      [null, 'pending', 'customer'],
      ['pending', 'accepted', 'photographer'],
    ],
  );
});
test('cancel reason is kept in the booking history', async () => {
  const day = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const draft = await ok('POST', '/bookings', 'customer', {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: new Date(`${day}T09:00:00+07:00`).toISOString(),
    to: new Date(`${day}T10:00:00+07:00`).toISOString(),
  });
  await ok('POST', `/bookings/${draft.id}/cancel`, 'customer', {
    reason: 'Changed plans',
  });
  const { items } = await ok(
    'GET',
    `/bookings/${draft.id}/timeline`,
    'photographer',
  );
  assert.equal(items.length, 2);
  assert.equal(items[1].to_status, 'cancelled');
  assert.equal(items[1].actor_role, 'customer');
  assert.equal(items[1].reason, 'Changed plans');
});
test('blocking time over pending requests asks first, then declines them', async () => {
  const day = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
  const vn = (hour: string) =>
    new Date(`${day}T${hour}:00+07:00`).toISOString();
  const request = await ok('POST', '/bookings', 'customer', {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: vn('09:00'),
    to: vn('10:00'),
  });
  const block = { from: vn('08:00'), to: vn('12:00') };
  // preview lists the requests that would be declined
  const preview = await ok(
    'GET',
    `/calendar/blocked-times/affected?from=${encodeURIComponent(block.from)}&to=${encodeURIComponent(block.to)}`,
    'photographer',
  );
  assert.deepEqual(
    preview.items.map((b: { id: string }) => b.id),
    [request.id],
  );
  // without the photographer's consent nothing is saved
  assert.equal(
    (await api('POST', '/calendar/blocked-times', 'photographer', block))
      .status,
    409,
  );
  assert.equal(
    (await ok('GET', `/bookings/${request.id}`, 'customer')).status,
    'pending',
  );
  const slot = await ok('POST', '/calendar/blocked-times', 'photographer', {
    ...block,
    decline_pending: true,
  });
  assert.equal(
    (await ok('GET', `/bookings/${request.id}`, 'customer')).status,
    'rejected',
  );
  const [, last] = (
    await ok('GET', `/bookings/${request.id}/timeline`, 'customer')
  ).items;
  assert.equal(last.actor_role, 'system');
  assert.match(last.reason, /blocked this time/);
  await ok('DELETE', `/calendar/blocked-times/${slot.id}`, 'photographer');
});
test('shortening working hours over pending requests asks first, then declines them', async () => {
  const day = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);
  const request = await ok('POST', '/bookings', 'customer', {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: new Date(`${day}T19:00:00+07:00`).toISOString(),
    to: new Date(`${day}T20:00:00+07:00`).toISOString(),
  });
  const shorter = {
    items: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      start_time: '08:00',
      end_time: '17:00',
    })),
  };
  const preview = await ok(
    'POST',
    '/calendar/me/working-hours/affected',
    'photographer',
    shorter,
  );
  assert.deepEqual(
    preview.items.map((b: { id: string }) => b.id),
    [request.id],
  );
  assert.equal(
    (await api('PUT', '/calendar/me/working-hours', 'photographer', shorter))
      .status,
    409,
  );
  assert.equal(
    (await ok('GET', '/calendar/me/working-hours', 'photographer')).is_default,
    true,
  );
  await ok('PUT', '/calendar/me/working-hours', 'photographer', {
    ...shorter,
    decline_pending: true,
  });
  const after = await ok('GET', `/bookings/${request.id}`, 'customer');
  assert.equal(after.status, 'rejected');
  const [, last] = (
    await ok('GET', `/bookings/${request.id}/timeline`, 'customer')
  ).items;
  assert.match(last.reason, /changed working hours/);
  // a shift may run until midnight
  const late = await ok('PUT', '/calendar/me/working-hours', 'photographer', {
    items: [{ weekday: 1, start_time: '20:00', end_time: '24:00' }],
    decline_pending: true,
  });
  assert.equal(late.items[0].end_time, '24:00');
  // back to the default hours for the tests after this one
  await ok('PUT', '/calendar/me/working-hours', 'photographer', { items: [] });
});
test('cancel and accept at the same time: only one of them wins', async () => {
  const day = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const request = await ok('POST', '/bookings', 'customer', {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: new Date(`${day}T09:00:00+07:00`).toISOString(),
    to: new Date(`${day}T10:00:00+07:00`).toISOString(),
  });
  // a request older than 24 hours cannot be accepted even before the job runs
  await db.query(
    "UPDATE bookings SET created_at = now() - interval '25 hours' WHERE id = $1",
    [request.id],
  );
  assert.equal(
    (await api('POST', `/bookings/${request.id}/accept`, 'photographer'))
      .status,
    409,
  );
  await db.query('UPDATE bookings SET created_at = now() WHERE id = $1', [
    request.id,
  ]);
  const results = await Promise.all([
    api('POST', `/bookings/${request.id}/cancel`, 'customer', {
      reason: 'Changed plans',
    }),
    api('POST', `/bookings/${request.id}/accept`, 'photographer'),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const { items } = await ok(
    'GET',
    `/bookings/${request.id}/timeline`,
    'customer',
  );
  // creation + exactly one change
  assert.equal(items.length, 2);
  // leave the time free for later tests
  const final = await ok('GET', `/bookings/${request.id}`, 'customer');
  if (final.status === 'accepted')
    await ok('POST', `/bookings/${request.id}/cancel`, 'customer', {
      reason: 'Cleanup',
    });
});
test('an admin can cancel a booking with a reason, others use the normal route', async () => {
  const day = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
  const request = await ok('POST', '/bookings', 'customer', {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: new Date(`${day}T09:00:00+07:00`).toISOString(),
    to: new Date(`${day}T10:00:00+07:00`).toISOString(),
  });
  assert.equal(
    (
      await api('POST', `/admin/bookings/${request.id}/cancel`, 'customer', {
        reason: 'x',
      })
    ).status,
    403,
  );
  const cancelled = await ok(
    'POST',
    `/admin/bookings/${request.id}/cancel`,
    'admin',
    { reason: 'Photographer account suspended' },
  );
  assert.equal(cancelled.status, 'cancelled');
  const [, last] = (
    await ok('GET', `/bookings/${request.id}/timeline`, 'customer')
  ).items;
  assert.equal(last.actor_role, 'admin');
  assert.equal(last.reason, 'Photographer account suspended');
});
test('booking lists are filtered and paged in the database', async () => {
  const all = await ok('GET', '/bookings', 'customer');
  assert.equal(all.total, 6);
  const page1 = await ok('GET', '/bookings?limit=1&offset=1', 'customer');
  assert.equal(page1.total, 6);
  assert.deepEqual(
    page1.items.map((b: { id: string }) => b.id),
    [all.items[1].id],
  );
  const accepted = await ok('GET', '/bookings?status=accepted', 'photographer');
  assert.deepEqual(
    accepted.items.map((b: { id: string }) => b.id),
    [booking],
  );
  const later = new Date(Date.now() + 30 * 864e5).toISOString();
  assert.equal(
    (await ok('GET', `/bookings?from=${encodeURIComponent(later)}`, 'customer'))
      .total,
    0,
  );
  assert.equal((await ok('GET', '/bookings', 'stranger')).total, 1);
  const admin = await ok(
    'GET',
    '/admin/bookings?status=cancelled&limit=5',
    'admin',
  );
  assert.equal(admin.total, 3);
  assert.equal(admin.limit, 5);
});
test('main photographer invites a collaborator who answers once', async () => {
  // approval gives the applicant the photographer role on the next token
  actors.applicant.roles = ['customer', 'photographer'];
  const other = (await ok('GET', '/photographers/me', 'applicant')).id;
  const invite = (body: object, who = 'photographer') =>
    api('POST', `/bookings/${booking}/collaborators`, who, body);
  assert.equal(
    (await invite({ photographer_id: photo, share_percent: 10 })).status,
    400,
  );
  assert.equal(
    (await invite({ photographer_id: other, share_percent: 10 }, 'customer'))
      .status,
    403,
  );
  // only a verified, active photographer can be invited
  assert.equal(
    (
      await invite({
        photographer_id: '11111111-1111-4111-8111-111111111111',
        share_percent: 10,
      })
    ).status,
    404,
  );
  const first = (await invite({ photographer_id: other, share_percent: 60 }))
    .body;
  assert.equal(first.status, 'invited');
  assert.equal(
    (await invite({ photographer_id: other, share_percent: 5 })).status,
    409,
  );
  // a pending invitation can be revoked and sent again with another share
  assert.equal(
    (
      await ok(
        'POST',
        `/booking-collaborators/${first.id}/revoke`,
        'photographer',
      )
    ).status,
    'revoked',
  );
  const second = (await invite({ photographer_id: other, share_percent: 50 }))
    .body;
  assert.equal(second.share_percent, 50);
  const mine = await ok('GET', '/booking-collaborators/me', 'applicant');
  assert.equal(mine.total, 2);
  // a status filter outside the known statuses is a 400, not an empty list
  assert.equal(
    (await api('GET', '/bookings?status=foo', 'customer')).status,
    400,
  );
  assert.deepEqual(
    mine.items.map((c: { id: string; status: string }) => [c.id, c.status]),
    [
      [second.id, 'invited'],
      [first.id, 'revoked'],
    ],
  );
  // an invitation alone does not open the booking details
  assert.equal(
    (await api('GET', `/bookings/${booking}`, 'applicant')).status,
    403,
  );
  // the invited photographer cannot accept while blocked at that time
  const shoot = await ok('GET', `/bookings/${booking}`, 'customer');
  const busy = await ok('POST', '/calendar/blocked-times', 'applicant', {
    from: shoot.from,
    to: shoot.to,
  });
  assert.equal(
    (
      await api(
        'POST',
        `/booking-collaborators/${second.id}/accept`,
        'applicant',
      )
    ).status,
    409,
  );
  await ok('DELETE', `/calendar/blocked-times/${busy.id}`, 'applicant');
  // only the invited photographer answers
  assert.equal(
    (
      await api(
        'POST',
        `/booking-collaborators/${second.id}/accept`,
        'photographer',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await ok(
        'POST',
        `/booking-collaborators/${second.id}/accept`,
        'applicant',
      )
    ).status,
    'accepted',
  );
  // once accepted, that time is taken on the collaborator's own calendar too
  const otherPlan = (
    await ok('POST', '/photographers/me/booking-plans', 'applicant', {
      name: 'Portrait',
      price: 1000000,
      duration_minutes: 60,
      photo_count: 20,
      retouched_photo_count: 5,
      features: ['All original photos'],
    })
  ).id;
  const clash = await api('POST', '/bookings', 'stranger', {
    photographer_id: other,
    plan_id: otherPlan,
    location: 'Studio',
    from: shoot.from,
    to: shoot.to,
  });
  assert.equal(clash.status, 409);
  // ...so it is not offered as free time, and they cannot block over it
  assert.deepEqual(
    (
      await ok(
        'GET',
        `/photographers/${other}/availability?from=${encodeURIComponent(shoot.from)}&to=${encodeURIComponent(shoot.to)}`,
      )
    ).items,
    [],
  );
  assert.equal(
    (
      await api('POST', '/calendar/blocked-times', 'applicant', {
        from: shoot.from,
        to: shoot.to,
      })
    ).status,
    409,
  );
  // once accepted, the collaborator also follows the booking history
  assert.ok(
    (await ok('GET', `/bookings/${booking}/timeline`, 'applicant')).items
      .length,
  );
  // once accepted, the collaborator sees where and when to shoot
  assert.equal(
    (await ok('GET', `/bookings/${booking}`, 'applicant')).id,
    booking,
  );
  for (const [path, who] of [
    ['decline', 'applicant'],
    ['revoke', 'photographer'],
  ])
    assert.equal(
      (await api('POST', `/booking-collaborators/${second.id}/${path}`, who))
        .status,
      409,
    );
  // customer, main and invited photographer see the list; others do not
  for (const who of ['customer', 'photographer', 'applicant'])
    assert.deepEqual(
      (await ok('GET', `/bookings/${booking}/collaborators`, who)).items.map(
        (c: { status: string; share_percent: number }) => [
          c.status,
          c.share_percent,
        ],
      ),
      [
        ['revoked', 60],
        ['accepted', 50],
      ],
    );
  assert.equal(
    (await api('GET', `/bookings/${booking}/collaborators`, 'stranger')).status,
    403,
  );
});
test('booking plan with bookings can only be deactivated', async () => {
  assert.equal(
    (await api('DELETE', `/booking-plans/${plan}`, 'photographer')).status,
    409,
  );
  assert.equal(
    (await api('PATCH', `/booking-plans/${plan}`, 'stranger', { name: 'x' }))
      .status,
    403,
  );
});
test('payment intent survives provider timeout and retries without duplicate order', async () => {
  failGateway = true;
  assert.equal(
    (
      await api('POST', `/bookings/${booking}/payments/deposit`, 'customer', {
        idempotency_key: 'deposit-test',
      })
    ).status,
    503,
  );
  failGateway = false;
  const first = (
    await Promise.resolve(
      db.manager.findBy(EntitySchemas.transactions, { reference_id: booking }),
    )
  )[0];
  assert.ok(first);
  const p = await ok(
    'POST',
    `/bookings/${booking}/payments/deposit`,
    'customer',
    { idempotency_key: 'deposit-test' },
  );
  deposit = p.id;
  assert.equal(p.id, first.id);
  assert.equal(p.amount, 300000);
  assert.equal(p.provider_order_code, first.provider_order_code);
  assert.equal(
    (
      await Promise.resolve(
        db.manager.findBy(EntitySchemas.transactions, {
          reference_id: booking,
        }),
      )
    ).length,
    1,
  );
});
test('webhook signature, amount checks and replay are idempotent', async () => {
  const t = await Promise.resolve(
    db.manager.findOneBy(EntitySchemas.transactions, { id: deposit }),
  );
  const data = {
    orderCode: t!.provider_order_code,
    amount: 300000,
    reference: 'provider-1',
  };
  const payload = {
    code: '00',
    desc: 'success',
    success: true,
    data,
    signature: 'test-valid',
  };
  assert.equal(
    (
      await api('POST', '/payments/webhooks/payos', undefined, {
        ...payload,
        signature: 'bad',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api('POST', '/payments/webhooks/payos', undefined, {
        ...payload,
        data: { ...data, amount: 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await ok('POST', '/payments/webhooks/payos', undefined, payload))
      .duplicate,
    false,
  );
  assert.equal(
    (await ok('POST', '/payments/webhooks/payos', undefined, payload))
      .duplicate,
    true,
  );
  assert.equal(
    (await db.manager.find(EntitySchemas.payment_webhooks)).length,
    1,
  );
  assert.equal(
    (await ok('POST', `/bookings/${booking}/start`, 'photographer')).status,
    'in_progress',
  );
});
test('gallery upload ownership and publish gate', async () => {
  media = (
    await ok('POST', '/media/upload-url', 'photographer', {
      content_type: 'image/jpeg',
      file_size: 1024,
    })
  ).media.id;
  assert.equal(
    (
      await api('POST', '/media/complete-upload', 'stranger', {
        media_id: media,
      })
    ).status,
    403,
  );
  await ok('POST', '/media/complete-upload', 'photographer', {
    media_id: media,
  });
  await ok('POST', `/bookings/${booking}/gallery`, 'photographer');
  await ok('POST', `/bookings/${booking}/gallery/items`, 'photographer', {
    media_id: media,
  });
  assert.equal(
    (await api('GET', `/bookings/${booking}/gallery`, 'customer')).status,
    403,
  );
  assert.equal(
    (await api('POST', `/bookings/${booking}/gallery/publish`, 'photographer'))
      .status,
    409,
  );
  await ok('POST', `/bookings/${booking}/complete-shoot`, 'photographer');
  await ok('POST', `/bookings/${booking}/gallery/publish`, 'photographer');
  assert.equal(
    (await ok('GET', `/bookings/${booking}/gallery`, 'customer')).items.length,
    1,
  );
  assert.equal(
    (await api('DELETE', `/media/${media}`, 'photographer')).status,
    409,
  );
  assert.equal(
    (await api('POST', `/bookings/${booking}/complete`, 'admin')).status,
    409,
  );
});
test('remaining payment, completion and review uniqueness', async () => {
  const p = await ok(
    'POST',
    `/bookings/${booking}/payments/remaining`,
    'customer',
    { idempotency_key: 'remaining-test' },
  );
  remaining = p.id;
  assert.equal(p.amount, 700000);
  await ok('POST', '/payments/webhooks/payos', undefined, {
    code: '00',
    desc: 'success',
    success: true,
    signature: 'test-valid',
    data: {
      orderCode: p.provider_order_code,
      amount: 700000,
      reference: 'provider-2',
    },
  });
  // only the customer of the booking confirms receiving the photos
  for (const who of ['photographer', 'stranger'])
    assert.equal(
      (await api('POST', `/bookings/${booking}/confirm-receipt`, who)).status,
      403,
    );
  // a double click completes the booking once, the second click gets 409
  const clicks = await Promise.all([
    api('POST', `/bookings/${booking}/confirm-receipt`, 'customer'),
    api('POST', `/bookings/${booking}/confirm-receipt`, 'customer'),
  ]);
  assert.deepEqual(clicks.map((c) => c.status).sort(), [200, 409]);
  // booking tells feedback how many bookings the photographer has completed
  const [stats] = await db.manager.findBy(EntitySchemas.ratings, {
    photographer_id: photo,
  });
  assert.equal(
    stats.total_bookings,
    await db.manager.countBy(EntitySchemas.bookings, {
      photographer_id: photo,
      status: 'completed',
    }),
  );
  const history = await ok('GET', `/bookings/${booking}/timeline`, 'customer');
  assert.equal(
    history.items.filter(
      (h: { to_status: string }) => h.to_status === 'completed',
    ).length,
    1,
  );
  assert.equal(history.items.at(-1).actor_role, 'customer');
  assert.equal(
    (await api('POST', `/bookings/${booking}/complete`, 'admin')).status,
    409,
  );
  const body = {
    rating: 5,
    punctuality_rating: 4,
    attitude_rating: 5,
    comment: 'Great',
  };
  const review = await ok(
    'POST',
    `/bookings/${booking}/reviews`,
    'customer',
    body,
  );
  assert.equal(
    (await api('POST', `/bookings/${booking}/reviews`, 'customer', body))
      .status,
    409,
  );
  assert.equal(
    (await api('PATCH', `/reviews/${review.id}`, 'stranger', { rating: 1 }))
      .status,
    403,
  );
  assert.equal(
    (await ok('GET', `/photographers/${photo}/rating-summary`)).average_rating,
    5,
  );
  // the photographer is told about the new review
  assert.ok(
    await db.manager.existsBy(EntitySchemas.outbox_events, {
      topic: 'review.created',
    }),
  );
  // only the photographer of the booking replies; replying again edits it
  assert.equal(
    (
      await api('PUT', `/reviews/${review.id}/reply`, 'customer', {
        reply: 'x',
      })
    ).status,
    403,
  );
  await ok('PUT', `/reviews/${review.id}/reply`, 'photographer', {
    reply: 'Thank you',
  });
  const replied = await ok(
    'PUT',
    `/reviews/${review.id}/reply`,
    'photographer',
    {
      reply: 'Thank you so much',
    },
  );
  assert.equal(replied.photographer_reply, 'Thank you so much');
  assert.ok(replied.replied_at);
  // list and summary come from the photographer's visible reviews, paged
  const listed = await ok('GET', `/photographers/${photo}/reviews?limit=1`);
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0].id, review.id);
  // the public list shows who wrote it, never the customer or booking id
  assert.ok(listed.items[0].customer.name);
  for (const field of ['customer_id', 'booking_id', 'status'])
    assert.equal(field in listed.items[0], false);
  // an edit tells the photographer and keeps the old reply
  const edited = await ok('PATCH', `/reviews/${review.id}`, 'customer', {
    comment: 'Great, edited',
  });
  assert.equal(edited.photographer_reply, 'Thank you so much');
  assert.ok(
    await db.manager.existsBy(EntitySchemas.outbox_events, {
      topic: 'review.updated',
    }),
  );
  // an empty edit is rejected instead of marking the review as edited
  assert.equal(
    (await api('PATCH', `/reviews/${review.id}`, 'customer', {})).status,
    400,
  );
  // only an admin hides a review, with a reason; the score follows
  assert.equal(
    (
      await api('POST', `/admin/reviews/${review.id}/hide`, 'customer', {
        reason: 'x',
      })
    ).status,
    403,
  );
  assert.equal(
    (await api('POST', `/admin/reviews/${review.id}/hide`, 'admin', {})).status,
    400,
  );
  const hidden = await ok('POST', `/admin/reviews/${review.id}/hide`, 'admin', {
    reason: 'Spam',
  });
  assert.equal(hidden.status, 'hidden_by_admin');
  assert.equal(hidden.hidden_reason, 'Spam');
  assert.equal(
    (await ok('GET', `/photographers/${photo}/rating-summary`)).total_feedbacks,
    0,
  );
  assert.ok(
    await db.manager.existsBy(EntitySchemas.outbox_events, {
      topic: 'review.hidden',
    }),
  );
  // a hidden review cannot be edited, replied to or hidden again
  for (const [method, path, who, payload] of [
    ['PATCH', `/reviews/${review.id}`, 'customer', { rating: 1 }],
    ['PUT', `/reviews/${review.id}/reply`, 'photographer', { reply: 'x' }],
    ['POST', `/admin/reviews/${review.id}/hide`, 'admin', { reason: 'x' }],
  ] as const)
    assert.equal((await api(method, path, who, payload)).status, 409);
  assert.equal(
    (await api('POST', `/admin/reviews/${review.id}/restore`, 'customer'))
      .status,
    403,
  );
  // the admin finds hidden reviews in the admin list, customers cannot
  assert.equal((await api('GET', '/admin/reviews', 'customer')).status, 403);
  const hiddenList = await ok(
    'GET',
    `/admin/reviews?status=hidden_by_admin&photographer_id=${photo}`,
    'admin',
  );
  assert.deepEqual(
    hiddenList.items.map((r: { id: string }) => r.id),
    [review.id],
  );
  assert.equal(
    (await ok('GET', '/admin/reviews?status=visible', 'admin')).items.some(
      (r: { id: string }) => r.id === review.id,
    ),
    false,
  );
  const restored = await ok(
    'POST',
    `/admin/reviews/${review.id}/restore`,
    'admin',
  );
  assert.equal(restored.hidden_reason, null);
  assert.equal(
    (await ok('GET', `/photographers/${photo}/rating-summary`)).average_rating,
    5,
  );
  assert.equal(
    (await api('POST', `/admin/reviews/${review.id}/restore`, 'admin')).status,
    409,
  );
  // an edit racing the author's delete never brings the review back
  await Promise.all([
    api('PATCH', `/reviews/${review.id}`, 'customer', { comment: 'Edited' }),
    api('DELETE', `/reviews/${review.id}`, 'customer'),
  ]);
  const [gone] = await db.manager.findBy(EntitySchemas.feedbacks, {
    id: review.id,
  });
  assert.equal(gone.status, 'deleted_by_author');
  // the admin cannot delete it and cannot bring back what the author deleted
  assert.equal(
    (await api('DELETE', `/reviews/${review.id}`, 'admin')).status,
    403,
  );
  assert.equal(
    (await api('POST', `/admin/reviews/${review.id}/restore`, 'admin')).status,
    409,
  );
  assert.equal(
    (await ok('GET', `/photographers/${photo}/rating-summary`)).total_feedbacks,
    0,
  );
});
test('outbox marks core realtime events as processed', async () => {
  await app.get(OutboxWorker).tick();
  const events = await db.manager.find(EntitySchemas.outbox_events);
  assert.ok(events.length > 0);
  assert.ok(events.every((event) => event.processed_at));
});
test('refund reserves are bounded and admin routes are protected', async () => {
  assert.equal((await api('GET', '/admin/dashboard', 'customer')).status, 403);
  await ok('POST', `/payments/${deposit}/refund`, 'admin', {
    amount: 100000,
    reason: 'Customer request',
  });
  assert.equal(
    (
      await api('POST', `/payments/${deposit}/refund`, 'admin', {
        amount: 300000,
        reason: 'Excess refund',
      })
    ).status,
    409,
  );
  assert.equal(
    (await ok('GET', '/admin/dashboard', 'admin')).paid_volume_vnd,
    1000000,
  );
});
test('portfolio ordering, ownership and public signed image URLs', async () => {
  const album = await ok(
    'POST',
    '/photographers/me/portfolios',
    'photographer',
    { name: 'Portraits', cover_media_id: media },
  );
  const item = await ok(
    'POST',
    `/portfolios/${album.id}/items`,
    'photographer',
    { media_id: media },
  );
  assert.equal(
    (
      await api(
        'PATCH',
        `/portfolios/${album.id}/items/reorder`,
        'photographer',
        { item_ids: [item.id, item.id] },
      )
    ).status,
    400,
  );
  const sorted = await ok(
    'PATCH',
    `/portfolios/${album.id}/items/reorder`,
    'photographer',
    { item_ids: [item.id] },
  );
  assert.equal(sorted.items[0].id, item.id);
  assert.ok((await ok('GET', `/portfolios/${album.id}`)).items[0].download_url);
  assert.equal(
    (await api('DELETE', `/portfolios/${album.id}`, 'stranger')).status,
    403,
  );
  const second = await ok(
    'POST',
    '/photographers/me/portfolios',
    'photographer',
    { name: 'Weddings' },
  );
  const firstPage = await ok(
    'GET',
    `/photographers/${photo}/portfolios?limit=1`,
  );
  assert.deepEqual(
    { ...firstPage, items: firstPage.items.map((p: any) => p.id) },
    { items: [album.id], total: 2, offset: 0, limit: 1 },
  );
  const secondPage = await ok(
    'GET',
    `/photographers/${photo}/portfolios?limit=1&offset=1`,
  );
  assert.deepEqual(
    secondPage.items.map((p: any) => p.id),
    [second.id],
  );
});
test('subscription plan snapshot, payment activation, ownership and cancellation', async () => {
  const plan = await db.transaction((s) =>
    s.save(EntitySchemas.photographer_plans, {
      code: 'vip',
      name: 'VIP',
      price: 99000,
      billing_cycle: 30,
    }),
  );
  const result = await ok('POST', '/subscriptions', 'photographer', {
    plan_id: plan.id,
    idempotency_key: 'subscription-test',
  });
  await db.transaction((s) =>
    s.update(
      EntitySchemas.photographer_plans,
      { id: plan.id },
      {
        price: 199000,
        billing_cycle: 60,
      },
    ),
  );
  assert.equal(result.subscription.price, 99000);
  await ok('POST', '/subscriptions/webhooks/payos', undefined, {
    code: '00',
    desc: 'success',
    success: true,
    signature: 'test-valid',
    data: {
      orderCode: result.payment.provider_order_code,
      amount: 99000,
      reference: 'provider-sub',
    },
  });
  const me = await ok('GET', '/subscriptions/me', 'photographer');
  assert.equal(me.subscription.status, 'active');
  assert.ok(Date.parse(me.subscription.end_at) < Date.now() + 31 * 864e5);
  assert.equal(
    (
      await api(
        'POST',
        `/subscriptions/${result.subscription.id}/cancel`,
        'stranger',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await ok(
        'POST',
        `/subscriptions/${result.subscription.id}/cancel`,
        'photographer',
      )
    ).auto_renew,
    false,
  );
  await db.transaction((s) =>
    s.update(
      EntitySchemas.subscriptions,
      { id: result.subscription.id },
      {
        end_at: new Date(Date.now() - 1).toISOString(),
      },
    ),
  );
  assert.equal(
    (await ok('GET', '/subscriptions/me', 'photographer')).subscription.status,
    'expired',
  );
});
test('report resolution and suspended account access', async () => {
  const report = await ok('POST', '/reports', 'customer', {
    target_type: 'booking',
    target_id: booking,
    reason: 'Please investigate',
  });
  await ok('POST', `/admin/reports/${report.id}/resolve`, 'admin', {
    status: 'resolved',
    resolution: 'Resolved with customer',
  });
  assert.equal(
    (await ok('GET', `/admin/reports/${report.id}`, 'admin')).status,
    'resolved',
  );
  const stranger = await ok('GET', '/users/me', 'stranger');
  await ok('POST', `/admin/users/${stranger.id}/suspend`, 'admin');
  assert.equal((await api('GET', '/users/me', 'stranger')).status, 403);
  await ok('POST', `/admin/users/${stranger.id}/unsuspend`, 'admin');
});
test('ranks and badges are public and editable by admin only', async () => {
  const ranks = (await ok('GET', '/ranks')).items;
  assert.deepEqual(
    ranks.map((r: any) => [r.code, r.min_completed, r.commission_percent]),
    [
      ['newbie', 0, 10],
      ['bronze', 10, 9],
      ['silver', 30, 8],
      ['gold', 60, 7],
      ['diamond', 120, 5],
    ],
  );
  assert.deepEqual(
    (await ok('GET', '/badges')).items.map((b: any) => b.code),
    ['top-rated', 'punctual', 'loyal'],
  );
  assert.equal(
    (
      await api('PATCH', '/admin/ranks/newbie', 'customer', {
        name: 'x',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api('PATCH', '/admin/ranks/unknown', 'admin', {
        name: 'x',
      })
    ).status,
    404,
  );
  // the catalog must keep a tier starting at 0 completed bookings
  assert.equal(
    (
      await api('PATCH', '/admin/ranks/newbie', 'admin', {
        min_completed: 1,
      })
    ).status,
    400,
  );
  const renamed = await ok('PATCH', '/admin/ranks/newbie', 'admin', {
    name: 'Người mới',
    commission_percent: 9.5,
  });
  assert.equal(renamed.commission_percent, 9.5);
  const me = await ok('GET', '/photographers/me', 'photographer');
  assert.deepEqual(me.rank, { code: 'newbie', name: 'Người mới' });
  assert.equal(me.commission_percent, 9.5);
  await ok('PATCH', '/admin/ranks/newbie', 'admin', {
    name: 'Tân binh',
    commission_percent: 10,
  });
  await ok('PATCH', '/admin/badges/loyal', 'admin', {
    name: 'Khách trung thành',
  });
  assert.equal(
    (await ok('GET', '/badges')).items.find((b: any) => b.code === 'loyal')
      .name,
    'Khách trung thành',
  );
});
test('photographer badges come from visible reviews and returning customers', async () => {
  // Booking completion is blocked by the payment bug on dev, so the stats are written directly.
  await db.transaction(async (s) => {
    const [c] = await s.findBy(EntitySchemas.customers, { user_id: customer });
    for (let i = 0; i < 10; i++) {
      const from = new Date(Date.UTC(2020, 0, i + 1, 3)).toISOString();
      const to = new Date(Date.UTC(2020, 0, i + 1, 5)).toISOString();
      const b = await s.save(EntitySchemas.bookings, {
        customer_id: c.id,
        photographer_id: photo,
        booking_plan_id: plan,
        location: 'Da Nang',
        from,
        to,
        deposit_amount: 300000,
        total_amount: 1000000,
        status: 'completed',
      });
      await s.save(EntitySchemas.feedbacks, {
        booking_id: b.id,
        customer_id: c.id,
        photographer_id: photo,
        rating: 5,
        punctuality_rating: 5,
        attitude_rating: 5,
      });
    }
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: photo,
    });
    await s.update(EntitySchemas.ratings, rating.id, {
      average_rating: 4.9,
      total_feedbacks: 10,
      return_customers: 5,
    });
  });
  const job = app.get(PhotographerBadgeJob);
  assert.equal(await job.run(), true);
  const badges = (await ok('GET', `/photographers/${photo}`)).badges;
  assert.deepEqual(
    badges.map((b: any) => b.code),
    ['top-rated', 'punctual', 'loyal'],
  );
  assert.equal(badges[2].name, 'Khách trung thành');
  assert.ok(badges.every((b: any) => !Number.isNaN(Date.parse(b.earned_at))));
  const events = await db.manager.findBy(EntitySchemas.outbox_events, {
    topic: 'photographer.badge_earned',
  });
  assert.equal(events.length, 3);
  // once earned, badges stay even when the stats drop
  await db.transaction(async (s) => {
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: photo,
    });
    await s.update(EntitySchemas.ratings, rating.id, {
      average_rating: 3,
      return_customers: 0,
    });
  });
  await job.run();
  assert.equal((await ok('GET', `/photographers/${photo}`)).badges.length, 3);
  assert.equal(
    (
      await db.manager.findBy(EntitySchemas.outbox_events, {
        topic: 'photographer.badge_earned',
      })
    ).length,
    3,
  );
});
test(
  'S3 adapter signs uploads, verifies metadata and removes objects',
  { skip: !process.env.LENS_TEST_S3_ENDPOINT },
  async () => {
    const endpoint = process.env.LENS_TEST_S3_ENDPOINT!;
    assert.equal(new URL(endpoint).hostname, '127.0.0.1');
    const bucket = 'lens-test-' + randomUUID(),
      saved = { ...process.env };
    const client = new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'lens-test',
        secretAccessKey: 'lens-test-only',
      },
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    Object.assign(process.env, {
      S3_MINIO_BUCKET: bucket,
      S3_MINIO_ENDPOINT: endpoint,
      S3_MINIO_PUBLIC_ENDPOINT: endpoint,
      S3_MINIO_REGION: 'us-east-1',
      S3_MINIO_ACCESS_KEY_ID: 'lens-test',
      S3_MINIO_SECRET_ACCESS_KEY: 'lens-test-only',
    });
    try {
      const storage = new S3ObjectStorage(),
        url = await storage.uploadUrl('test-image', 'image/jpeg', 4);
      assert.ok(url.includes('X-Amz-Signature'));
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: Buffer.from([1, 2, 3, 4]),
      });
      assert.equal(response.status, 200);
      await storage.verify('test-image', 'image/jpeg', 4);
      await assert.rejects(storage.verify('test-image', 'image/jpeg', 5));
      const download = await fetch(await storage.downloadUrl('test-image'));
      assert.equal((await download.arrayBuffer()).byteLength, 4);
      await storage.delete('test-image');
      await assert.rejects(storage.verify('test-image', 'image/jpeg', 4));
    } finally {
      for (const key of [
        'S3_MINIO_BUCKET',
        'S3_MINIO_ENDPOINT',
        'S3_MINIO_PUBLIC_ENDPOINT',
        'S3_MINIO_REGION',
        'S3_MINIO_ACCESS_KEY_ID',
        'S3_MINIO_SECRET_ACCESS_KEY',
      ])
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
      client.destroy();
    }
  },
);
test('job completes shot bookings 7 days after the gallery is published, once', async () => {
  const base = await db.manager.findOneByOrFail(EntitySchemas.bookings, {
    id: booking,
  });
  const days = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
  // [published days ago, fully paid] -> only the first one is due
  const cases = [
    [8, true],
    [8, false],
    [6, true],
  ] as const;
  const ids: string[] = [];
  for (const [i, [age, paid]] of cases.entries()) {
    const row = await db.manager.save(EntitySchemas.bookings, {
      customer_id: base.customer_id,
      photographer_id: base.photographer_id,
      booking_plan_id: base.booking_plan_id,
      location: 'Studio',
      from: days(30 + i),
      to: new Date(Date.parse(days(30 + i)) + 36e5).toISOString(),
      deposit_amount: 300000,
      total_amount: 1000000,
      status: 'shot',
      gallery_published_at: days(age),
    });
    ids.push(row.id);
    const customer = await db.manager.findOneByOrFail(EntitySchemas.customers, {
      id: base.customer_id,
    });
    for (const [type, amount] of [
      ['deposit', 300000],
      ['remaining', 700000],
    ] as const)
      if (paid || type === 'deposit')
        await db.manager.save(EntitySchemas.transactions, {
          user_id: customer.user_id,
          transaction_code: `AUTO-${row.id}-${type}`,
          type,
          reference_id: row.id,
          amount,
          status: 'paid',
          idempotency_key: `auto-${row.id}-${type}`,
        });
  }
  const job = app.get(BookingAutoCompleteJob);
  for (let run = 0; run < 2; run++) {
    assert.equal(await job.run(), true);
    const rows = await Promise.all(
      ids.map((id) =>
        db.manager.findOneByOrFail(EntitySchemas.bookings, { id }),
      ),
    );
    assert.deepEqual(
      rows.map((b) => b.status),
      ['completed', 'shot', 'shot'],
    );
    const history = await db.manager.findBy(
      EntitySchemas.booking_status_history,
      { booking_id: ids[0] },
    );
    // the second run changes nothing
    assert.equal(history.length, 1);
    assert.equal(history[0].actor_role, 'system');
    assert.equal(history[0].actor_user_id, null);
  }
});
test('job expires pending requests at whichever comes first: 24 hours or the shoot start', async () => {
  const base = await db.manager.findOneByOrFail(EntitySchemas.bookings, {
    id: booking,
  });
  const at = (hours: number) =>
    new Date(Date.now() + hours * 36e5).toISOString();
  // [sent, shoot starts, status] -> expected status after the job
  const cases = [
    [at(-25), at(48), 'pending', 'expired'], // no answer for 24 hours
    [at(-1), at(-0.1), 'pending', 'expired'], // shoot time already started
    [at(-1), at(48), 'pending', 'pending'], // still waiting
    [at(-25), at(48), 'accepted', 'accepted'], // already answered
  ] as const;
  const ids: string[] = [];
  for (const [sent, start, status] of cases) {
    const row = await db.manager.save(EntitySchemas.bookings, {
      customer_id: base.customer_id,
      photographer_id: base.photographer_id,
      booking_plan_id: base.booking_plan_id,
      location: 'Studio',
      from: start,
      to: new Date(Date.parse(start) + 36e5).toISOString(),
      deposit_amount: 300000,
      total_amount: 1000000,
      status,
    });
    // created_at is set by the database on insert, so move it back explicitly
    await db.query('UPDATE bookings SET created_at = $1 WHERE id = $2', [
      sent,
      row.id,
    ]);
    ids.push(row.id);
  }
  const job = app.get(BookingExpirePendingJob);
  for (let run = 0; run < 2; run++) {
    assert.equal(await job.run(), true);
    const rows = await Promise.all(
      ids.map((id) =>
        db.manager.findOneByOrFail(EntitySchemas.bookings, { id }),
      ),
    );
    assert.deepEqual(
      rows.map((b) => b.status),
      cases.map((c) => c[3]),
    );
    const history = await db.manager.findBy(
      EntitySchemas.booking_status_history,
      { booking_id: ids[0] },
    );
    // the second run changes nothing
    assert.equal(history.length, 1);
    assert.equal(history[0].to_status, 'expired');
    assert.equal(history[0].actor_role, 'system');
    assert.match(history[0].reason ?? '', /did not respond/);
  }
});
test('job cancels accepted bookings whose deposit is not paid in time', async () => {
  const base = await db.manager.findOneByOrFail(EntitySchemas.bookings, {
    id: booking,
  });
  const customer = await db.manager.findOneByOrFail(EntitySchemas.customers, {
    id: base.customer_id,
  });
  const at = (hours: number) =>
    new Date(Date.now() + hours * 36e5).toISOString();
  // [accepted at, shoot starts, deposit paid] -> expected status
  const cases = [
    [at(-25), at(48), false, 'cancelled'], // 24 hours without paying
    [at(-1), at(-0.1), false, 'cancelled'], // shoot started, still unpaid
    [at(-25), at(48), true, 'accepted'], // paid in time
    [at(-1), at(48), false, 'accepted'], // still has time
  ] as const;
  const ids: string[] = [];
  for (const [accepted, start, paid] of cases) {
    const row = await db.manager.save(EntitySchemas.bookings, {
      customer_id: base.customer_id,
      photographer_id: base.photographer_id,
      booking_plan_id: base.booking_plan_id,
      location: 'Studio',
      from: start,
      to: new Date(Date.parse(start) + 36e5).toISOString(),
      deposit_amount: 300000,
      total_amount: 1000000,
      status: 'accepted',
      accepted_at: accepted,
    });
    ids.push(row.id);
    if (paid)
      await db.manager.save(EntitySchemas.transactions, {
        user_id: customer.user_id,
        transaction_code: `DEP-${row.id}`,
        type: 'deposit',
        reference_id: row.id,
        amount: 300000,
        status: 'paid',
        idempotency_key: `dep-${row.id}`,
      });
  }
  const job = app.get(BookingCancelUnpaidJob);
  for (let run = 0; run < 2; run++) {
    assert.equal(await job.run(), true);
    const rows = await Promise.all(
      ids.map((id) =>
        db.manager.findOneByOrFail(EntitySchemas.bookings, { id }),
      ),
    );
    assert.deepEqual(
      rows.map((b) => b.status),
      cases.map((c) => c[3]),
    );
    const history = await db.manager.findBy(
      EntitySchemas.booking_status_history,
      { booking_id: ids[0] },
    );
    assert.equal(history.length, 1);
    assert.equal(history[0].actor_role, 'system');
    assert.match(history[0].reason ?? '', /Deposit not paid in time/);
  }
});
test('a customer cannot keep more than 3 open requests with one photographer', async () => {
  const created: string[] = [];
  let refused = 0;
  for (let d = 10; d < 15; d++) {
    const day = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    const res = await api('POST', '/bookings', 'customer', {
      photographer_id: photo,
      plan_id: plan,
      location: 'Studio',
      from: new Date(`${day}T09:00:00+07:00`).toISOString(),
      to: new Date(`${day}T10:00:00+07:00`).toISOString(),
    });
    if (res.status === 200) created.push(res.body.id);
    else {
      assert.equal(res.status, 409);
      assert.match(res.body.message, /Too many open requests/);
      refused++;
    }
  }
  const open = await ok(
    'GET',
    '/bookings?status=pending&limit=100',
    'customer',
  );
  assert.equal(
    open.items.filter(
      (b: { photographer_id: string }) => b.photographer_id === photo,
    ).length,
    3,
  );
  assert.ok(refused > 0);
  for (const id of created)
    await ok('POST', `/bookings/${id}/cancel`, 'customer', {
      reason: 'Cleanup',
    });
});
test('domain rejects unsupported booking transitions', () => {
  assert.throws(
    () =>
      new Booking('pending').transition('complete', {
        paidAmount: 1000,
        depositAmount: 300,
        totalAmount: 1000,
        galleryPublished: true,
      }),
    /Cannot complete/,
  );
});
test('Keycloak cryptographically verifies issuer, audience, expiration and access-token type', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }),
    jwk = publicKey.export({ format: 'jwk' });
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as any).port}`,
      issuer = url + '/realms/test';
    const service = new KeycloakService(
      new ConfigService({
        auth: {
          keycloakAuthServerUrl: url,
          keycloakRealm: 'test',
          keycloakClientId: 'lens',
        },
      }),
    );
    const sign = (payload: any = {}, options: any = {}) =>
      jwt.sign({ sub: 'abc', typ: 'Bearer', ...payload }, privateKey, {
        algorithm: 'RS256',
        keyid: 'test-key',
        issuer,
        audience: 'lens',
        expiresIn: 60,
        ...options,
      });
    assert.equal((await service.verifyToken(sign())).sub, 'abc');
    await assert.rejects(service.verifyToken(sign({}, { audience: 'wrong' })));
    await assert.rejects(service.verifyToken(sign({}, { issuer: 'wrong' })));
    await assert.rejects(service.verifyToken(sign({}, { expiresIn: -10 })));
    await assert.rejects(service.verifyToken(sign({ typ: 'ID' })));
    const unconfigured = new KeycloakService(new ConfigService({}));
    await assert.rejects(unconfigured.verifyToken(sign()));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
