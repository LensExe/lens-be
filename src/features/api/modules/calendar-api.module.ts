import { Module } from '@nestjs/common';
import { CalendarController } from '../http/calendar.controller';
import {
  CalendarBlockCommandHandler,
  CalendarCreateCommandHandler,
  CalendarRemoveCommandHandler,
  CalendarUnblockCommandHandler,
  CalendarUpdateCommandHandler,
} from '@modules/calendar/application/commands/calendar';
import {
  CalendarAvailabilityQueryHandler,
  CalendarMeQueryHandler,
} from '@modules/calendar/application/queries/calendar';

@Module({
  controllers: [CalendarController],
  providers: [
    CalendarBlockCommandHandler,
    CalendarCreateCommandHandler,
    CalendarRemoveCommandHandler,
    CalendarUnblockCommandHandler,
    CalendarUpdateCommandHandler,
    CalendarAvailabilityQueryHandler,
    CalendarMeQueryHandler,
  ],
})
export class CalendarApiModule {}
