import { Module } from '@nestjs/common';
import { PhotographerController } from '../http/photographer.controller';
import {
  PhotographerCreateCommandHandler,
  PhotographerLocationCommandHandler,
  PhotographerStatusCommandHandler,
  PhotographerUpdateCommandHandler,
} from '@modules/photographer/photographers.command';
import {
  PhotographerAdminQueryHandler,
  PhotographerGetQueryHandler,
  PhotographerMeQueryHandler,
  PhotographerSearchQueryHandler,
  PhotographerTopQueryHandler,
} from '@modules/photographer/photographers.query';

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
