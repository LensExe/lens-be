import { SubscriptionDomainEntity } from '../entities/subscription.domain-entity';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface ISubscriptionRepository {
  findById(id: string): Promise<SubscriptionDomainEntity | null>;
  findByPhotographerId(
    photographerId: string,
  ): Promise<SubscriptionDomainEntity | null>;
  findAll(): Promise<SubscriptionDomainEntity[]>;
  save(
    subscription: SubscriptionDomainEntity,
  ): Promise<SubscriptionDomainEntity>;
  delete(id: string): Promise<void>;
}
