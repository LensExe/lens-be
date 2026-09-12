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
  execute(message: SubscriptionCancelCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.cancel(s, message.actor, message.input),
    );
  }
}

export class SubscriptionWebhookCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionWebhookCommandInput,
  ) {}
}
@CommandHandler(SubscriptionWebhookCommand)
export class SubscriptionWebhookCommandHandler implements ICommandHandler<SubscriptionWebhookCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionWebhookCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}
