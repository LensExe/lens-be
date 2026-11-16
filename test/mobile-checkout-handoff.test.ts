import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { RedisService } from '../src/shared/database/redis/redis.service';
import { MobileCheckoutHandoffService } from '../src/features/api/payment-handoff/mobile-checkout-handoff.service';

test('mobile checkout handoff is one-time and binds the actor, booking, and purpose', async () => {
  const entries = new Map<string, string>();
  const redis = {
    setJson: async <T>(key: string, value: T) => {
      entries.set(key, JSON.stringify(value));
    },
    getAndDelete: async (key: string) => {
      const value = entries.get(key) ?? null;
      entries.delete(key);
      return value;
    },
    getJson: async <T>(key: string) => {
      const raw = entries.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
  } as unknown as RedisService;
  const service = new MobileCheckoutHandoffService(redis);
  const actor = { sub: 'customer-subject', roles: ['customer'] };
  const bookingId = '123e4567-e89b-42d3-a456-426614174000';

  const { code, expires_in } = await service.create(
    actor,
    bookingId,
    'remaining',
  );
  assert.equal(code.length, 43);
  assert.equal(expires_in, 90);
  assert.equal([...entries.keys()][0].includes(code), false);

  const exchange = await service.exchange(code);
  assert.deepEqual(exchange.session.actor, actor);
  assert.equal(exchange.session.booking_id, bookingId);
  assert.equal(exchange.session.payment_purpose, 'remaining');
  assert.equal(exchange.session.return_target, 'mobile');

  await assert.rejects(() => service.exchange(code), UnauthorizedException);
  await service.rememberPayment(exchange.token, 'payment-123');
  assert.equal(
    (await service.getSession(exchange.token))?.payment_id,
    'payment-123',
  );
});
