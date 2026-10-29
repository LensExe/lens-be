import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { SubscriptionUseCases } from './subscription.use-case';

export class SubscriptionCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionCreateCommandInput,
  ) {}
}
@CommandHandler(SubscriptionCreateCommand)
export class SubscriptionCreateCommandHandler implements ICommandHandler<SubscriptionCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Route the subscription creation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result returned by `then`.
   */
  execute(message: SubscriptionCreateCommand) {
    return this.dataSource
      .transaction((s) => this.useCases.create(s, message.actor, message.input))
      .then((result) => this.useCases.fulfill(this.dataSource, result));
  }
}

export class SubscriptionCancelCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionCancelCommandInput,
  ) {}
}
@CommandHandler(SubscriptionCancelCommand)
export class SubscriptionCancelCommandHandler implements ICommandHandler<SubscriptionCancelCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Route the subscription cancellation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionCancelCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.cancel(s, message.actor, message.input),
    );
  }
}

export class SubscriptionResolvePaymentReviewCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionPaymentReviewResolutionInput,
  ) {}
}

@CommandHandler(SubscriptionResolvePaymentReviewCommand)
export class SubscriptionResolvePaymentReviewCommandHandler implements ICommandHandler<SubscriptionResolvePaymentReviewCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /** Resolve subscription lifecycle state and payment status atomically. */
  execute(message: SubscriptionResolvePaymentReviewCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.resolvePaymentReview(manager, message.actor, message.input),
    );
  }
}

export class SubscriptionWebhookCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionWebhookCommandInput,
  ) {}
}

export class SubscriptionExpireDueCommand {
  constructor(public readonly actor: Actor) {}
}

@CommandHandler(SubscriptionExpireDueCommand)
export class SubscriptionExpireDueCommandHandler implements ICommandHandler<SubscriptionExpireDueCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /** Route scheduled subscription expiration through the normal transactional use case. */
  execute(message: SubscriptionExpireDueCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.expireDue(s, message.actor),
    );
  }
}
@CommandHandler(SubscriptionWebhookCommand)
export class SubscriptionWebhookCommandHandler implements ICommandHandler<SubscriptionWebhookCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Route the subscription webhook command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionWebhookCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}
