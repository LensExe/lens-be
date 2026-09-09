import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { SubscriptionUseCases } from '../subscriptions';
export class SubscriptionCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionCreateCommandInput,
  ) {}
}
@CommandHandler(SubscriptionCreateCommand)
export class SubscriptionCreateCommandHandler implements ICommandHandler<SubscriptionCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionCreateCommand) {
    return this.uow
      .write((s) => this.useCases.create(s, message.actor, message.input))
      .then((result) => this.useCases.fulfill(this.uow, result));
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
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionCancelCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionWebhookCommand) {
    return this.uow.write((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}
