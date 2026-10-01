import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { WalletUseCases } from './wallet.use-case';

export class PaymentWalletQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(PaymentWalletQuery)
export class PaymentWalletQueryHandler implements IQueryHandler<PaymentWalletQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: WalletUseCases,
  ) {}

  /**
   * Run the wallet payment query in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentWalletQuery) {
    return this.dataSource.transaction((manager) =>
      this.useCases.current(manager, message.actor),
    );
  }
}

export class PaymentWalletLedgerQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentAdminQueryInput,
  ) {}
}

@QueryHandler(PaymentWalletLedgerQuery)
export class PaymentWalletLedgerQueryHandler implements IQueryHandler<PaymentWalletLedgerQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: WalletUseCases,
  ) {}

  /**
   * Run the wallet ledger query using the supplied pagination filters.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentWalletLedgerQuery) {
    return this.dataSource.transaction((manager) =>
      this.useCases.currentLedger(manager, message.actor, message.input),
    );
  }
}
