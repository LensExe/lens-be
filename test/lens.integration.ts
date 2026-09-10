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
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { ApiModule } from '../src/features/api/api.module';
import {
  UnitOfWork,
  ObjectStorage,
  PaymentGateway,
  type Actor,
} from '../src/shared/database/unit-of-work/unit-of-work.port';
import { PostgresUnitOfWork } from '../src/shared/database/unit-of-work/postgres-unit-of-work';
import { KeycloakService } from '../src/shared/integrations/keycloak/keycloak.service';
import { setupApi } from '../src/features/api/setup';
import { OutboxWorker } from '../src/features/workers/outbox.worker';
import { Booking } from '../src/modules/booking/domain/booking';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';
import { S3ObjectStorage } from '../src/shared/integrations/s3/s3-storage.service';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';

let db: DataSource,
  uow: PostgresUnitOfWork,
  app: INestApplication,
  base: string,
  document: any;
const testSchema = 'lens_test_' + randomUUID().replaceAll('-', '');
let customer: string,
  photoUser: string,
  photo: string,
  plan: string,
  booking: string,
  deposit: string,
  remaining: string,
  media: string,
  conversation: string;
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
      extra: { options: `-c search_path=${testSchema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${testSchema}"`);
    await db.query(readFileSync('migrations/001_lens.sql', 'utf8'));
    uow = new PostgresUnitOfWork(db);
    const mod = await Test.createTestingModule({ imports: [ApiModule] })
      .overrideProvider(UnitOfWork)
      .useValue(uow)
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
test('OpenAPI covers the 94-operation implementation contract with security, body and response schemas', () => {
  const tracker = JSON.parse(
    readFileSync('docs/api-tracker.json', 'utf8'),
  ).filter((r: any) => ['GET', 'POST', 'PATCH', 'DELETE'].includes(r.method));
  let count = 0;
  for (const path of Object.values(document.paths))
    count += Object.keys(path as object).filter((m) =>
      ['get', 'post', 'patch', 'delete'].includes(m),
    ).length;
  assert.equal(count, 94);
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
    experience: 3,
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
    await uow.write((s) =>
      s.insert('booking_plans', {
        code: 'portrait',
        name: 'Portrait',
        price: 1000000,
      }),
    )
  ).id;
});
test('calendar ownership, interval validation and concurrent booking conflict', async () => {
  const start = new Date(Date.now() + 30 * 60e3).toISOString(),
    end = new Date(Date.now() + 3 * 36e5).toISOString();
  const slot = await ok('POST', '/calendar/availability', 'photographer', {
    from: start,
    to: end,
  });
  assert.equal(
    (
      await api('POST', '/calendar/availability', 'photographer', {
        from: end,
        to: start,
      })
    ).status,
    400,
  );
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
  assert.equal(
    (await api('DELETE', `/calendar/availability/${slot.id}`, 'photographer'))
      .status,
    409,
  );
  const available = await ok('GET', `/photographers/${photo}/availability`);
  assert.equal(available.items.length, 2);
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
    await uow.read((s) => s.find('transactions', { reference_id: booking }))
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
    (await uow.read((s) => s.find('transactions', { reference_id: booking })))
      .length,
    1,
  );
});
test('webhook signature, amount checks and replay are idempotent', async () => {
  const t = await uow.read((s) => s.get('transactions', deposit));
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
  assert.equal((await uow.read((s) => s.find('payment_webhooks'))).length, 1);
  assert.equal(
    (await ok('POST', `/bookings/${booking}/start`, 'photographer')).status,
    'in_progress',
  );
});
test('tracking is owner scoped and stop removes coordinates', async () => {
  await ok('POST', `/bookings/${booking}/location/start`, 'photographer');
  await ok('POST', `/bookings/${booking}/location/update`, 'photographer', {
    latitude: 16.05,
    longitude: 108.2,
  });
  assert.equal(
    (await ok('GET', `/bookings/${booking}/location`, 'customer')).latitude,
    16.05,
  );
  assert.equal(
    (await api('GET', `/bookings/${booking}/location`, 'stranger')).status,
    403,
  );
  await ok('POST', `/bookings/${booking}/location/stop`, 'photographer');
  assert.equal(
    (await ok('GET', `/bookings/${booking}/location`, 'customer')).latitude,
    null,
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
test('chat participant authorization and realtime message deduplication', async () => {
  conversation = (
    await ok('POST', '/conversations', 'admin', { booking_id: booking })
  ).id;
  assert.equal(
    (await api('GET', `/conversations/${conversation}/messages`, 'stranger'))
      .status,
    403,
  );
  const socket = io(base + '/lens', {
    auth: { token: 'customer' },
    transports: ['websocket'],
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  try {
    const payload = {
      id: conversation,
      client_message_id: randomUUID(),
      content: 'Hello',
    };
    const first: any = await socket
      .timeout(3000)
      .emitWithAck('message.send', payload);
    assert.equal(first.ok, true);
    const second: any = await socket
      .timeout(3000)
      .emitWithAck('message.send', payload);
    assert.equal(second.data.id, first.data.id);
    const bad: any = await socket
      .timeout(3000)
      .emitWithAck('message.send', { ...payload, content: 'Changed' });
    assert.equal(bad.ok, false);
  } finally {
    socket.disconnect();
  }
});
test('outbox consumes events once and notification ownership is enforced', async () => {
  await app.get(OutboxWorker).tick();
  const before = (await uow.read((s) => s.find('notifications'))).length;
  assert.ok(before > 0);
  await app.get(OutboxWorker).tick();
  assert.equal((await uow.read((s) => s.find('notifications'))).length, before);
  const list = await ok('GET', '/notifications', 'customer');
  assert.ok(list.items.length);
  assert.equal(
    (await api('PATCH', `/notifications/${list.items[0].id}/read`, 'stranger'))
      .status,
    403,
  );
  await ok('PATCH', '/notifications/read-all', 'customer');
  assert.ok(
    (await ok('GET', '/notifications', 'customer')).items.every(
      (n: any) => n.read_at,
    ),
  );
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
  const plan = await uow.write((s) =>
    s.insert('photographer_plans', {
      code: 'vip',
      name: 'VIP',
      price: 99000,
      billing_cycle: 30,
    }),
  );
  const result = await ok('POST', '/subscriptions', 'customer', {
    plan_id: plan.id,
    idempotency_key: 'subscription-test',
  });
  await uow.write((s) =>
    s.update('photographer_plans', plan.id, {
      price: 199000,
      billing_cycle: 60,
    }),
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
  const me = await ok('GET', '/subscriptions/me', 'customer');
  assert.equal(me.subscription.status, 'active');
  assert.ok(Date.parse(me.subscription.expired_in) < Date.now() + 31 * 864e5);
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
        'customer',
      )
    ).auto_renew,
    false,
  );
  await uow.write((s) =>
    s.update('subscriptions', result.subscription.id, {
      expired_in: new Date(Date.now() - 1).toISOString(),
    }),
  );
  assert.equal(
    (await ok('GET', '/subscriptions/me', 'customer')).subscription.status,
    'expired',
  );
});
test('report resolution is audited and suspended accounts lose access', async () => {
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
    (await ok('GET', `/admin/reports/${report.id}`, 'admin')).history.length,
    1,
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
