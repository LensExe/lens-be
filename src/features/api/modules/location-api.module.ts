import { Module } from '@nestjs/common';
import { LocationController } from '../http/location.controller';
import {
  LocationStartCommandHandler,
  LocationStopCommandHandler,
  LocationUpdateCommandHandler,
} from '@modules/location/application/commands/location';
import { LocationGetQueryHandler } from '@modules/location/application/queries/location';

@Module({
  controllers: [LocationController],
  providers: [
    LocationStartCommandHandler,
    LocationStopCommandHandler,
    LocationUpdateCommandHandler,
    LocationGetQueryHandler,
  ],
})
export class LocationApiModule {}
