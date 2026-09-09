import { Module } from '@nestjs/common';
import { ModerationController } from '../http/moderation.controller';
import {
  ModerationCreateCommandHandler,
  ModerationResolveCommandHandler,
} from '@modules/moderation/application/commands/moderation';
import {
  ModerationDashboardQueryHandler,
  ModerationGetQueryHandler,
  ModerationListQueryHandler,
  ModerationMineQueryHandler,
} from '@modules/moderation/application/queries/moderation';

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
