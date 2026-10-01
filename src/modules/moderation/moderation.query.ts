import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { ModerationUseCases } from './moderation.use-case';

export class ModerationDashboardQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationDashboardQueryInput,
  ) {}
}
@QueryHandler(ModerationDashboardQuery)
export class ModerationDashboardQueryHandler implements IQueryHandler<ModerationDashboardQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}

  /**
   * Run the moderation dashboard query in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: ModerationDashboardQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.dashboard(s, message.actor),
    );
  }
}

export class ModerationListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationListQueryInput,
  ) {}
}
@QueryHandler(ModerationListQuery)
export class ModerationListQueryHandler implements IQueryHandler<ModerationListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}

  /**
   * Run the query for the moderation list in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: ModerationListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}

export class ModerationMineQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationMineQueryInput,
  ) {}
}
@QueryHandler(ModerationMineQuery)
export class ModerationMineQueryHandler implements IQueryHandler<ModerationMineQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}

  /**
   * Run the moderation query in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: ModerationMineQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.mine(s, message.actor, message.input),
    );
  }
}

export class ModerationGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationGetQueryInput,
  ) {}
}
@QueryHandler(ModerationGetQuery)
export class ModerationGetQueryHandler implements IQueryHandler<ModerationGetQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}

  /**
   * Run the query to fetch a moderation record in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: ModerationGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
