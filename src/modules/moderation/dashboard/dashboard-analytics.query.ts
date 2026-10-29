import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/contracts';
import { AdminDashboardAnalyticsUseCases } from './dashboard-analytics.use-case';

export class AdminDashboardAnalyticsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.AdminDashboardAnalyticsQueryInput,
  ) {}
}

@QueryHandler(AdminDashboardAnalyticsQuery)
export class AdminDashboardAnalyticsQueryHandler implements IQueryHandler<AdminDashboardAnalyticsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: AdminDashboardAnalyticsUseCases,
  ) {}

  execute(message: AdminDashboardAnalyticsQuery) {
    return this.dataSource.transaction((manager) =>
      this.useCases.dashboardAnalytics(manager, message.actor, message.input),
    );
  }
}
