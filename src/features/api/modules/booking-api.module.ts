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
} from '@modules/booking/bookings.command';
import {
  BookingAdminQueryHandler,
  BookingGetQueryHandler,
  BookingListQueryHandler,
  BookingTimelineQueryHandler,
} from '@modules/booking/bookings.query';

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
