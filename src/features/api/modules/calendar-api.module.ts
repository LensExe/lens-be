import { Module } from '@nestjs/common';
import { CalendarController } from '../http/calendar.controller';
import {
  CalendarBlockCommandHandler,
  CalendarUnblockCommandHandler,
} from '@modules/calendar/calendar.command';
import {
  CalendarAvailabilityQueryHandler,
  CalendarMeQueryHandler,
} from '@modules/calendar/calendar.query';

@Module({
  controllers: [CalendarController],
  providers: [
    CalendarBlockCommandHandler,
    CalendarUnblockCommandHandler,
    CalendarAvailabilityQueryHandler,
    CalendarMeQueryHandler,
  ],
})
export class CalendarApiModule {}
