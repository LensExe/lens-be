import type { DataSource, EntityManager } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type { TransactionEntity } from '@shared/database/entities/transaction.entity';

/** Payment operations required synchronously by subscription use cases. */
export abstract class SubscriptionPaymentsPort {
  abstract subscriptionIntent(
    manager: EntityManager,
    userId: string,
    subscriptionId: string,
    price: number,
    idempotencyKey: string,
  ): Promise<TransactionEntity>;

  abstract fulfill(
    dataSource: DataSource,
    transaction: TransactionEntity,
  ): Promise<TransactionEntity>;

  abstract webhook(
    manager: EntityManager,
    actor: Actor,
    input: { provider: string; payload: unknown },
  ): Promise<unknown>;
}
