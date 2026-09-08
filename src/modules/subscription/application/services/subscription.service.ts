import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/repositories/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async findByPhotographerId(photographerId: string) {
    const subscription =
      await this.subscriptionRepository.findByPhotographerId(photographerId);
    if (!subscription) {
      throw new NotFoundException(
        `Subscription for photographer "${photographerId}" not found.`,
      );
    }
    return subscription;
  }

  async findAll() {
    return this.subscriptionRepository.findAll();
  }
}
