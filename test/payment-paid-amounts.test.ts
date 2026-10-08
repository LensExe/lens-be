import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { EntityManager } from 'typeorm';
import { TransactionUseCases } from '../src/modules/payment/transaction/transaction.use-case';

test('paid amounts sum deposit and remaining per booking, 0 when nothing is paid', async () => {
  let queries = 0;
  const s = {
    findBy: async (_entity: unknown, where: Record<string, unknown>) => {
      queries++;
      return [
        {
          id: 't1',
          reference_id: 'b1',
          type: 'deposit',
          status: 'paid',
          amount: 300000,
        },
        {
          id: 't2',
          reference_id: 'b1',
          type: 'remaining',
          status: 'paid',
          amount: 700000,
        },
        {
          id: 't3',
          reference_id: 'b2',
          type: 'deposit',
          status: 'paid',
          amount: 300000,
        },
      ];
    },
    createQueryBuilder: () => ({
      innerJoin() {
        return this;
      },
      where() {
        return this;
      },
      andWhere() {
        return this;
      },
      getMany: async () => [],
    }),
  } as unknown as EntityManager;
  const paid = await new TransactionUseCases().paidAmounts(s, [
    'b1',
    'b2',
    'b3',
  ]);
  assert.deepEqual(paid, { b1: 1000000, b2: 300000, b3: 0 });
  assert.equal(queries, 1);
});
