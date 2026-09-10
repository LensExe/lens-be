import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ModerationUseCases } from './application/moderation';
import {
  ModerationCreateCommandHandler,
  ModerationResolveCommandHandler,
} from './application/commands/moderation';
import {
  ModerationDashboardQueryHandler,
  ModerationListQueryHandler,
  ModerationMineQueryHandler,
  ModerationGetQueryHandler,
} from './application/queries/moderation';

const CommandHandlers = [
  ModerationCreateCommandHandler,
  ModerationResolveCommandHandler,
];

const QueryHandlers = [
  ModerationDashboardQueryHandler,
  ModerationListQueryHandler,
  ModerationMineQueryHandler,
  ModerationGetQueryHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [ModerationUseCases, ...CommandHandlers, ...QueryHandlers],
  exports: [ModerationUseCases],
})
export class ModerationModule {}
