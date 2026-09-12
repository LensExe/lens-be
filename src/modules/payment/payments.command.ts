import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentUseCases } from './payment.use-case';

export class PaymentDepositCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentDepositCommandInput,
  ) {}
}
@CommandHandler(PaymentDepositCommand)
export class PaymentDepositCommandHandler implements ICommandHandler<PaymentDepositCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentDepositCommand) {
    return this.dataSource
      .transaction((s) =>
        this.useCases.deposit(s, message.actor, message.input),
      )
      .then((result) => this.useCases.fulfill(this.dataSource, result));
  }
}

export class PaymentRemainingCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRemainingCommandInput,
  ) {}
}
@CommandHandler(PaymentRemainingCommand)
export class PaymentRemainingCommandHandler implements ICommandHandler<PaymentRemainingCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRemainingCommand) {
    return this.dataSource
      .transaction((s) =>
        this.useCases.remaining(s, message.actor, message.input),
      )
      .then((result) => this.useCases.fulfill(this.dataSource, result));
  }
}

export class PaymentRefundCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundCommandInput,
  ) {}
}
@CommandHandler(PaymentRefundCommand)
export class PaymentRefundCommandHandler implements ICommandHandler<PaymentRefundCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRefundCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.refund(s, message.actor, message.input),
    );
  }
}

export class PaymentWebhookCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentWebhookCommandInput,
  ) {}
}
@CommandHandler(PaymentWebhookCommand)
export class PaymentWebhookCommandHandler implements ICommandHandler<PaymentWebhookCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentWebhookCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}
