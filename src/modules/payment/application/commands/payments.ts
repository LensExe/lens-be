import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentUseCases } from '../payments';
export class PaymentDepositCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentDepositCommandInput,
  ) {}
}
@CommandHandler(PaymentDepositCommand)
export class PaymentDepositCommandHandler implements ICommandHandler<PaymentDepositCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentDepositCommand) {
    return this.uow
      .write((s) => this.useCases.deposit(s, message.actor, message.input))
      .then((result) => this.useCases.fulfill(this.uow, result));
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
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRemainingCommand) {
    return this.uow
      .write((s) => this.useCases.remaining(s, message.actor, message.input))
      .then((result) => this.useCases.fulfill(this.uow, result));
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
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRefundCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentWebhookCommand) {
    return this.uow.write((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}
