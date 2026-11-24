import type { EntityManager } from 'typeorm';
import type { SubscriptionHistoryActorRole } from '@shared/domain/values/subscription.values';
import type { SubscriptionEntity } from '@shared/database/entities/subscription.entity';

/** Lifecycle operations shared with photographer approval and payment flows. */
export abstract class SubscriptionDefaultPlanPort {
  /** Assign the configured free plan if the photographer has no active subscription. */
  abstract assignDefault(
    manager: EntityManager,
    photographerId: string,
    actorUserId: string | null,
    actorRole: SubscriptionHistoryActorRole,
  ): Promise<SubscriptionEntity | null>;

  /** Close an active free subscription after a paid checkout is confirmed. */
  abstract replaceDefaultWithPaid(
    manager: EntityManager,
    photographerId: string,
    transactionId: string,
  ): Promise<void>;
}
