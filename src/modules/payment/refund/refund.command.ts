import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RefundUseCases } from './refund.use-case';

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
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Route the refund request command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentRefundCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.refund(s, message.actor, message.input),
    );
  }
}

export class PaymentCustomerRefundCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundCommandInput,
  ) {}
}

@CommandHandler(PaymentCustomerRefundCommand)
export class PaymentCustomerRefundCommandHandler implements ICommandHandler<PaymentCustomerRefundCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Route the refund request command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentCustomerRefundCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.customerRefund(manager, message.actor, message.input),
    );
  }
}

export class PaymentApproveRefundCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundReviewCommandInput,
  ) {}
}

@CommandHandler(PaymentApproveRefundCommand)
export class PaymentApproveRefundCommandHandler implements ICommandHandler<PaymentApproveRefundCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Route the refund approval command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentApproveRefundCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.approveRefund(manager, message.actor, message.input),
    );
  }
}

export class PaymentRejectRefundCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundReviewCommandInput,
  ) {}
}

@CommandHandler(PaymentRejectRefundCommand)
export class PaymentRejectRefundCommandHandler implements ICommandHandler<PaymentRejectRefundCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Route the refund rejection command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentRejectRefundCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.rejectRefund(manager, message.actor, message.input),
    );
  }
}

export class PaymentCompleteRefundCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundCompleteCommandInput,
  ) {}
}

@CommandHandler(PaymentCompleteRefundCommand)
export class PaymentCompleteRefundCommandHandler implements ICommandHandler<PaymentCompleteRefundCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /**
   * Route the refund completion command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PaymentCompleteRefundCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.completeRefund(manager, message.actor, message.input),
    );
  }
}

export class PaymentExtendRequestDeadlineCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentDeadlineExtensionInput,
  ) {}
}

@CommandHandler(PaymentExtendRequestDeadlineCommand)
export class PaymentExtendRequestDeadlineCommandHandler implements ICommandHandler<PaymentExtendRequestDeadlineCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /** Extend an active refund or withdrawal deadline with an audit record. */
  execute(message: PaymentExtendRequestDeadlineCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.extendProcessingDeadline(
        manager,
        message.actor,
        message.input,
      ),
    );
  }
}

export class PaymentProcessRequestSlaCommand {
  constructor(public readonly actor: Actor) {}
}

@CommandHandler(PaymentProcessRequestSlaCommand)
export class PaymentProcessRequestSlaCommandHandler implements ICommandHandler<PaymentProcessRequestSlaCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RefundUseCases,
  ) {}

  /** Notify administrators about overdue refund and withdrawal requests. */
  execute(message: PaymentProcessRequestSlaCommand) {
    return this.dataSource.transaction((manager) =>
      this.useCases.processOverduePaymentRequests(manager, message.actor),
    );
  }
}
