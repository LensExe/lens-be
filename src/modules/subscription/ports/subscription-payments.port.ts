import type { DataSource, EntityManager } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type { TransactionEntity } from '@shared/database/entities/transaction.entity';
import type { SubscriptionPaymentReviewResolutionInput } from '@shared/contracts/contracts';

/** Payment operations required synchronously by subscription use cases. */
export abstract class SubscriptionPaymentsPort {
  /**
   * Create a subscription payment transaction and attach an idempotency key.
   *
   * @param manager EntityManager for the current transaction.
   * @param userId User ID associated with the operation.
   * @param subscriptionId Subscription ID.
   * @param price Price to apply to the plan or transaction.
   * @param idempotencyKey Idempotency key.
   * @returns Result of the operation described above.
   */
  abstract subscriptionIntent(
    manager: EntityManager,
    userId: string,
    subscriptionId: string,
    price: number,
    idempotencyKey: string,
  ): Promise<TransactionEntity>;

  /**
   * Settle a paid transaction and update the balance or related status.
   *
   * @param dataSource Data source used to open a transaction.
   * @param transaction Transaction, of type `TransactionEntity`.
   * @returns Result of the operation described above.
   */
  abstract fulfill(
    dataSource: DataSource,
    transaction: TransactionEntity,
  ): Promise<TransactionEntity>;

  /**
   * Validate and process a webhook from the provider.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result of the operation described above.
   */
  abstract webhook(
    manager: EntityManager,
    actor: Actor,
    input: {
      provider: string;
      payload: unknown;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): Promise<unknown>;

  /** Record the payment side of an administrator's subscription checkout decision. */
  abstract resolveSubscriptionReview(
    manager: EntityManager,
    actor: Actor,
    input: SubscriptionPaymentReviewResolutionInput,
  ): Promise<{
    transaction: TransactionEntity;
    refund: unknown;
  }>;
}
