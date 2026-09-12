/* eslint-disable */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
import { Booking } from '../src/modules/booking/booking.domain';
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
  photoUser: string,
  photo: string,
  plan: string,
  booking: string,
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
    roles: ['photographer'],
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
    await db.query(readFileSync('migrations/001_lens.sql', 'utf8'));
    const mod = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [{ provide: DataSource, useValue: db }],
    })
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
  ).filter((r: any) => ['GET', 'POST', 'PATCH', 'DELETE'].includes(r.method));
  let count = 0;
  for (const path of Object.values(document.paths))
    count += Object.keys(path as object).filter((m) =>
      ['get', 'post', 'patch', 'delete'].includes(m),
    ).length;
  assert.equal(count, 80);
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
  for (const token of Object.keys(actors)) {
    const u = await ok('POST', '/auth/register', token, { fullname: token });
    if (token === 'customer') customer = u.id;
    if (token === 'photographer') photoUser = u.id;
  }
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
  assert.equal(
    (await ok('GET', '/photographers/me', 'photographer')).id,
    photo,
  );
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
  plan = (
    await db.transaction((s) =>
      s.save(EntitySchemas.booking_plans, {
        photographer_id: photo,
        name: 'Portrait',
        price: 1000000,
      }),
    )
  ).id;
});
test('calendar blocking and concurrent booking conflict', async () => {
  const blockedDate = new Date(Date.now() + 2 * 864e5)
    .toISOString()
    .slice(0, 10);
  const slot = await ok('POST', '/calendar/blocked-times', 'photographer', {
    date: blockedDate,
    reason: 'Unavailable',
  });
  assert.equal(
    (
      await api('POST', '/calendar/blocked-times', 'photographer', {
        date: blockedDate,
      })
    ).status,
    409,
  );
  await ok('DELETE', `/calendar/blocked-times/${slot.id}`, 'photographer');
  const input = {
    photographer_id: photo,
    plan_id: plan,
    location: 'Studio',
    from: new Date(Date.now() + 36e5).toISOString(),
    to: new Date(Date.now() + 2 * 36e5).toISOString(),
  };
  const attempts = await Promise.all([
    api('POST', '/bookings', 'customer', input),
    api('POST', '/bookings', 'stranger', input),
  ]);
  assert.deepEqual(attempts.map((x) => x.status).sort(), [200, 409]);
  booking = attempts.find((x) => x.status === 200)!.body.id;
  // Ensure subsequent tests use the winner's identity.
  if (attempts[1].status === 200)
    [actors.customer, actors.stranger] = [actors.stranger, actors.customer];
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
  assert.equal(
    (await ok('POST', `/bookings/${booking}/complete`, 'admin')).status,
    'completed',
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
test('domain rejects unsupported booking transitions', () => {
  assert.throws(
    () => new Booking('pending').transition('complete', true, true),
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
