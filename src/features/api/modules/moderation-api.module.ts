import { Module } from '@nestjs/common';
import { ModerationController } from '../http/moderation.controller';
import {
  ModerationCreateCommandHandler,
  ModerationResolveCommandHandler,
} from '@modules/moderation/moderation.command';
import {
  ModerationDashboardQueryHandler,
  ModerationGetQueryHandler,
  ModerationListQueryHandler,
  ModerationMineQueryHandler,
} from '@modules/moderation/moderation.query';

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
