import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { SubscriptionUseCases } from './subscription.use-case';

export class SubscriptionUsageQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionUsageQueryInput,
  ) {}
}
@QueryHandler(SubscriptionUsageQuery)
export class SubscriptionUsageQueryHandler implements IQueryHandler<SubscriptionUsageQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Run the current subscription usage query.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionUsageQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.usage(s, message.actor),
    );
  }
}

export class SubscriptionMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionMeQueryInput,
  ) {}
}
@QueryHandler(SubscriptionMeQuery)
export class SubscriptionMeQueryHandler implements IQueryHandler<SubscriptionMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Run the query for the current user’s subscription.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

export class SubscriptionPlansQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionPlansQueryInput,
  ) {}
}
@QueryHandler(SubscriptionPlansQuery)
export class SubscriptionPlansQueryHandler implements IQueryHandler<SubscriptionPlansQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Run the subscription plan list query in the current transaction.
   *
   * @returns Result of the operation performed in the transaction.
   */
  execute() {
    return this.dataSource.transaction((s) => this.useCases.plans(s));
  }
}

export class SubscriptionHistoryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionHistoryQueryInput,
  ) {}
}

@QueryHandler(SubscriptionHistoryQuery)
export class SubscriptionHistoryQueryHandler implements IQueryHandler<SubscriptionHistoryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /** Run the current photographer's subscription timeline query. */
  execute(message: SubscriptionHistoryQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.history(s, message.actor),
    );
  }
}
