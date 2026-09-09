import { Module } from '@nestjs/common';
import { BookingController } from '../http/booking.controller';
import {
  BookingAcceptCommandHandler,
  BookingCancelCommandHandler,
  BookingCompleteCommandHandler,
  BookingCompleteShootCommandHandler,
  BookingCreateCommandHandler,
  BookingDisputeCommandHandler,
  BookingRejectCommandHandler,
  BookingStartCommandHandler,
} from '@modules/booking/application/commands/bookings';
import {
  BookingAdminQueryHandler,
  BookingGetQueryHandler,
  BookingListQueryHandler,
  BookingTimelineQueryHandler,
} from '@modules/booking/application/queries/bookings';

@Module({
  controllers: [BookingController],
  providers: [
    BookingAcceptCommandHandler,
    BookingCancelCommandHandler,
    BookingCompleteCommandHandler,
    BookingCompleteShootCommandHandler,
    BookingCreateCommandHandler,
    BookingDisputeCommandHandler,
    BookingRejectCommandHandler,
    BookingStartCommandHandler,
    BookingAdminQueryHandler,
    BookingGetQueryHandler,
    BookingListQueryHandler,
    BookingTimelineQueryHandler,
  ],
})
export class BookingApiModule {}
