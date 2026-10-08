import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/contracts';
import { ModerationDashboardUseCases } from './dashboard.use-case';

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
    private readonly useCases: ModerationDashboardUseCases,
  ) {}

  execute(message: ModerationDashboardQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.dashboard(s, message.actor),
    );
  }
}
