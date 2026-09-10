import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LocationUseCases } from './application/location';
import {
  LocationStartCommandHandler,
  LocationStopCommandHandler,
  LocationUpdateCommandHandler,
} from './application/commands/location';
import { LocationGetQueryHandler } from './application/queries/location';

const CommandHandlers = [
  LocationStartCommandHandler,
  LocationStopCommandHandler,
  LocationUpdateCommandHandler,
];

const QueryHandlers = [LocationGetQueryHandler];

@Module({
  imports: [CqrsModule],
  providers: [LocationUseCases, ...CommandHandlers, ...QueryHandlers],
  exports: [LocationUseCases],
})
export class LocationModule {}
