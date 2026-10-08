import { Module } from '@nestjs/common';
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
import { ModerationDashboardQueryHandler } from '@modules/moderation/dashboard/dashboard.query';

@Module({
  controllers: [ModerationController],
  providers: [
    ModerationCreateCommandHandler,
    ModerationResolveCommandHandler,
    ModerationDashboardQueryHandler,
    ModerationGetQueryHandler,
    ModerationListQueryHandler,
    ModerationMineQueryHandler,
  ],
})
export class ModerationApiModule {}
