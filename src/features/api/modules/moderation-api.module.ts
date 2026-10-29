import { Module } from '@nestjs/common';
import { AdminDashboardAnalyticsController } from '../http/admin-dashboard-analytics.controller';
import { ModerationController } from '../http/moderation.controller';
import {
  ModerationCreateCommandHandler,
  ModerationResolveCommandHandler,
} from '@modules/moderation/report/report.command';
import {
  ModerationGetQueryHandler,
  ModerationListQueryHandler,
  ModerationMineQueryHandler,
} from '@modules/moderation/report/report.query';
import {
  AdminFinanceSummaryQueryHandler,
  AdminQueueQueryHandler,
  AdminStorageQueryHandler,
  ModerationDashboardQueryHandler,
} from '@modules/moderation/dashboard/dashboard.query';
import { AdminDashboardAnalyticsQueryHandler } from '@modules/moderation/dashboard/dashboard-analytics.query';

@Module({
  controllers: [ModerationController, AdminDashboardAnalyticsController],
  providers: [
    ModerationCreateCommandHandler,
    ModerationResolveCommandHandler,
    ModerationDashboardQueryHandler,
    AdminQueueQueryHandler,
    AdminStorageQueryHandler,
    AdminFinanceSummaryQueryHandler,
    AdminDashboardAnalyticsQueryHandler,
    ModerationGetQueryHandler,
    ModerationListQueryHandler,
    ModerationMineQueryHandler,
  ],
})
export class ModerationApiModule {}
