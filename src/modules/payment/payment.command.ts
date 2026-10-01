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

  /**
   * Route the booking deposit payment command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result returned by `then`.
   */
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

  /**
   * Route the booking balance payment command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result returned by `then`.
   */
  execute(message: PaymentRemainingCommand) {
    return this.dataSource
      .transaction((s) =>
        this.useCases.remaining(s, message.actor, message.input),
      )
      .then((result) => this.useCases.fulfill(this.dataSource, result));
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

  /**
   * Route the payment webhook command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentWebhookCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.webhook(s, message.actor, message.input),
    );
  }
}

export class PaymentReleaseDueEscrowCommand {
  constructor(public readonly actor: Actor) {}
}

@CommandHandler(PaymentReleaseDueEscrowCommand)
export class PaymentReleaseDueEscrowCommandHandler implements ICommandHandler<PaymentReleaseDueEscrowCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}

  /**
   * Release completed-booking escrow whose review period has elapsed.
   *
   * @param message Command or query message to execute.
   * @returns Result object containing the number of settlements processed.
   */
  execute(message: PaymentReleaseDueEscrowCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.releaseDueBookingEscrow(manager, message.actor),
    );
  }
}

export class PaymentExtendEscrowReleaseCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentDeadlineExtensionInput,
  ) {}
}

@CommandHandler(PaymentExtendEscrowReleaseCommand)
export class PaymentExtendEscrowReleaseCommandHandler implements ICommandHandler<PaymentExtendEscrowReleaseCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}

  /** Extend the escrow release time while retaining the customer's refund-request deadline. */
  execute(message: PaymentExtendEscrowReleaseCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.extendBookingEscrowRelease(
        manager,
        message.actor,
        message.input.id,
        message.input.hours,
        message.input.reason,
      ),
    );
  }
}

export class PaymentExpireDueCheckoutsCommand {
  constructor(public readonly actor: Actor) {}
}

@CommandHandler(PaymentExpireDueCheckoutsCommand)
export class PaymentExpireDueCheckoutsCommandHandler implements ICommandHandler<PaymentExpireDueCheckoutsCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}

  /** Reconcile and expire checkout links whose payment window has ended. */
  execute(message: PaymentExpireDueCheckoutsCommand) {
    return this.useCases.expireDuePaymentCheckouts(
      this.dataSource,
      message.actor,
    );
  }
}
