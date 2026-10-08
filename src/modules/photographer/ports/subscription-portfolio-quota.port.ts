import type { EntityManager } from 'typeorm';

/** Subscription quota check requested by Photographer before creating a portfolio. */
export abstract class SubscriptionPortfolioQuotaPort {
  abstract assertPortfolioCreationAllowed(
    manager: EntityManager,
    photographerId: string,
  ): Promise<void>;
}
