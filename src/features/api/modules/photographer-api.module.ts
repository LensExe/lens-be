import { Module } from '@nestjs/common';
import { PhotographerController } from '../http/photographer.controller';
import {
  PhotographerCreateCommandHandler,
  PhotographerLocationCommandHandler,
  PhotographerStatusCommandHandler,
  PhotographerUpdateCommandHandler,
} from '@modules/photographer/application/commands/photographers';
import {
  PhotographerAdminQueryHandler,
  PhotographerGetQueryHandler,
  PhotographerMeQueryHandler,
  PhotographerSearchQueryHandler,
  PhotographerTopQueryHandler,
} from '@modules/photographer/application/queries/photographers';

@Module({
  controllers: [PhotographerController],
  providers: [
    PhotographerCreateCommandHandler,
    PhotographerLocationCommandHandler,
    PhotographerStatusCommandHandler,
    PhotographerUpdateCommandHandler,
    PhotographerAdminQueryHandler,
    PhotographerGetQueryHandler,
    PhotographerMeQueryHandler,
    PhotographerSearchQueryHandler,
    PhotographerTopQueryHandler,
  ],
})
export class PhotographerApiModule {}
