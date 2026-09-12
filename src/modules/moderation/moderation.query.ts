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
  execute(message: ModerationGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
