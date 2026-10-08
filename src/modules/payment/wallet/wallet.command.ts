import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentUseCases } from '../payment.use-case';
import { WalletUseCases } from './wallet.use-case';

export class PaymentTopUpCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentTopUpCommandInput,
  ) {}
}

@CommandHandler(PaymentTopUpCommand)
export class PaymentTopUpCommandHandler implements ICommandHandler<PaymentTopUpCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: WalletUseCases,
    private readonly payments: PaymentUseCases,
  ) {}

  /**
   * Route the wallet deposit command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result returned by `then`.
   */
  execute(message: PaymentTopUpCommand) {
    return this.dataSource
      .transaction((manager) =>
        this.useCases.topUpIntent(manager, message.actor, message.input),
      )
      .then((transaction) =>
        this.payments.fulfill(this.dataSource, transaction),
      );
  }
}

export class PaymentWithdrawalCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentWithdrawalCommandInput,
  ) {}
}

@CommandHandler(PaymentWithdrawalCommand)
export class PaymentWithdrawalCommandHandler implements ICommandHandler<PaymentWithdrawalCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: WalletUseCases,
  ) {}

  /**
   * Route the wallet withdrawal request command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentWithdrawalCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.requestWithdrawal(manager, message.actor, message.input),
    );
  }
}
