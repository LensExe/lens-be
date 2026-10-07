import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { ConfigService } from '@nestjs/config';
import { ExternalPaymentProvider } from '../src/shared/domain/values/payment.values';
import { PaymentGateway } from '../src/shared/integrations/payment/port/payment.port';
import { PayOsStandaloneTestController } from '../src/features/api/http/payos-standalone-test.controller';

function setup(configValues: Record<string, unknown>) {
  const calls: unknown[][] = [];
  const gateway = {
    create: (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve({
        checkout_url: 'https://pay.example/test',
        qr_code: 'qr-payload',
      });
    },
  } as unknown as PaymentGateway;
  const config = {
    get: (key: string) => configValues[key],
  } as unknown as ConfigService;
  return {
    calls,
    controller: new PayOsStandaloneTestController(gateway, config),
  };
}

void test('standalone PayOS checkout is disabled by default', async () => {
  const { calls, controller } = setup({
    'app.isProduction': false,
    'payos.standaloneTestEnabled': false,
  });
  await assert.rejects(controller.create({ amount: 1000 }), {
    message: 'Set PAYOS_STANDALONE_TEST_ENABLED=true to enable this endpoint',
  });
  assert.equal(calls.length, 0);
});

void test('standalone PayOS checkout creates no Lens transaction and uses a short description', async () => {
  const { calls, controller } = setup({
    'app.isProduction': false,
    'payos.standaloneTestEnabled': true,
  });
  const result = await controller.create({ amount: 1000 });

  assert.equal(result.provider, 'payos');
  assert.equal(result.amount, 1000);
  assert.equal(result.checkout_url, 'https://pay.example/test');
  assert.equal(result.qr_code, 'qr-payload');
  assert.equal(result.persisted, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 1000);
  assert.equal(calls[0][2], ExternalPaymentProvider.PAYOS);
  assert.equal(calls[0][4], 'PAYOSTEST');
  assert.ok(Number.isSafeInteger(calls[0][0]));
});

void test('standalone PayOS checkout remains disabled in production', async () => {
  const { calls, controller } = setup({
    'app.isProduction': true,
    'payos.standaloneTestEnabled': true,
  });
  await assert.rejects(controller.create({ amount: 1000 }), {
    message: 'Standalone PayOS test endpoint is disabled in production',
  });
  assert.equal(calls.length, 0);
});
