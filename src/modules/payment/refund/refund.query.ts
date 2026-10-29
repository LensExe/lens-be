import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RefundUseCases } from './refund.use-case';

export class PaymentRefundsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundsQueryInput,
  ) {}
}

@QueryHandler(PaymentRefundsQuery)
export class PaymentRefundsQueryHandler implements IQueryHandler<PaymentRefundsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Run the refund request query using the current permissions and filters.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentRefundsQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.refunds(s, message.actor, message.input),
    );
  }
}

export class PaymentAdminRefundsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentAdminQueryInput & { status?: string },
  ) {}
}

@QueryHandler(PaymentAdminRefundsQuery)
export class PaymentAdminRefundsQueryHandler implements IQueryHandler<PaymentAdminRefundsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Run the refund request query using the current permissions and filters.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentAdminRefundsQuery) {
    return this.dataSource.transaction((manager) =>
      this.useCases.adminRefundRequests(manager, message.actor, message.input),
    );
  }
}

export class PaymentMyRefundsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentAdminQueryInput,
  ) {}
}

@QueryHandler(PaymentMyRefundsQuery)
export class PaymentMyRefundsQueryHandler implements IQueryHandler<PaymentMyRefundsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Run the refund request query using the current permissions and filters.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentMyRefundsQuery) {
    return this.dataSource.transaction((manager) =>
      this.useCases.myRefundRequests(manager, message.actor, message.input),
    );
  }
}
