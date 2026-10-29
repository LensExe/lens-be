import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { PaymentUseCases } from '../src/modules/payment/payment.use-case';
import type { RefundUseCases } from '../src/modules/payment/refund/refund.use-case';
import { PaymentGateway } from '../src/shared/integrations/payment/port/payment.port';
import type { WalletUseCases } from '../src/modules/payment/wallet/wallet.use-case';

void test('PayOS webhook provider names are normalized before routing', async () => {
  const providers: string[] = [];
  const gateway = {
    verify: async (_payload: unknown, provider: string) => {
      providers.push(provider);
      return {
        success: true,
        orderCode: 123,
        amount: 3000,
        reference: 'payos-webhook-validation',
      };
    },
  } as unknown as PaymentGateway;
  const useCases = new PaymentUseCases(
    gateway,
    {} as WalletUseCases,
    {} as RefundUseCases,
  );

  const result = await useCases.webhook(
    {} as EntityManager,
    { sub: '', roles: [] },
    { provider: 'PayOS', payload: {} },
  );

  assert.deepEqual(providers, ['payos']);
  assert.deepEqual(result, { received: true, validation: true });
});
