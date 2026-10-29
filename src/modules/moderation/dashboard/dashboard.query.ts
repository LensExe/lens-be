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

export class AdminQueueQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(AdminQueueQuery)
export class AdminQueueQueryHandler implements IQueryHandler<AdminQueueQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationDashboardUseCases,
  ) {}

  execute(message: AdminQueueQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminQueue(s, message.actor),
    );
  }
}

export class AdminStorageQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.AdminStorageQueryInput,
  ) {}
}

@QueryHandler(AdminStorageQuery)
export class AdminStorageQueryHandler implements IQueryHandler<AdminStorageQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationDashboardUseCases,
  ) {}

  execute(message: AdminStorageQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminStorage(s, message.actor, message.input),
    );
  }
}

export class AdminFinanceSummaryQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(AdminFinanceSummaryQuery)
export class AdminFinanceSummaryQueryHandler implements IQueryHandler<AdminFinanceSummaryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationDashboardUseCases,
  ) {}

  execute(message: AdminFinanceSummaryQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminFinanceSummary(s, message.actor),
    );
  }
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
