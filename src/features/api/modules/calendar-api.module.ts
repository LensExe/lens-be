import { Module } from '@nestjs/common';
import { CalendarController } from '../http/calendar.controller';
import {
  CalendarBlockCommandHandler,
  CalendarSetWorkingHoursCommandHandler,
  CalendarUnblockCommandHandler,
} from '@modules/calendar/calendar.command';
import {
  CalendarAvailabilityQueryHandler,
  CalendarBlockPreviewQueryHandler,
  CalendarWorkingHoursPreviewQueryHandler,
  CalendarMeQueryHandler,
  CalendarWorkingHoursQueryHandler,
} from '@modules/calendar/calendar.query';

@Module({
  controllers: [CalendarController],
  providers: [
    CalendarBlockCommandHandler,
    CalendarUnblockCommandHandler,
    CalendarAvailabilityQueryHandler,
    CalendarMeQueryHandler,
    CalendarSetWorkingHoursCommandHandler,
    CalendarWorkingHoursQueryHandler,
    CalendarBlockPreviewQueryHandler,
    CalendarWorkingHoursPreviewQueryHandler,
  ],
})
export class CalendarApiModule {}
