import { Module } from '@nestjs/common';
import { CalendarController } from '../http/calendar.controller';
import {
  CalendarBlockCommandHandler,
  CalendarUnblockCommandHandler,
} from '@modules/calendar/schedule/calendar.command';
import {
  CalendarAvailabilityQueryHandler,
  CalendarBlockPreviewQueryHandler,
  CalendarMeQueryHandler,
  CalendarOfflineSlotsQueryHandler,
} from '@modules/calendar/schedule/calendar.query';

@Module({
  controllers: [CalendarController],
  providers: [
    CalendarBlockCommandHandler,
    CalendarUnblockCommandHandler,
    CalendarAvailabilityQueryHandler,
    CalendarOfflineSlotsQueryHandler,
    CalendarMeQueryHandler,
    CalendarBlockPreviewQueryHandler,
  ],
})
export class CalendarApiModule {}
