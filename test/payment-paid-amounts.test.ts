import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { PaymentUseCases } from '../src/modules/payment/payment.use-case';
import type { PaymentGateway } from '../src/shared/integrations/payment/payment.port';

test('paid amounts sum deposit and remaining per booking, 0 when nothing is paid', async () => {
  let queries = 0;
  const s = {
    findBy: async () => {
      queries++;
      return [
        { reference_id: 'b1', type: 'deposit', amount: 300000 },
        { reference_id: 'b1', type: 'remaining', amount: 700000 },
        { reference_id: 'b2', type: 'deposit', amount: 300000 },
      ];
    },
  } as unknown as EntityManager;
  const paid = await new PaymentUseCases({} as PaymentGateway).paidAmounts(s, [
    'b1',
    'b2',
    'b3',
  ]);
  assert.deepEqual(paid, { b1: 1000000, b2: 300000, b3: 0 });
  assert.equal(queries, 1);
});
