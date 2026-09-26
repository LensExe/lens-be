import { Module } from '@nestjs/common';
import { BookingController } from '../http/booking.controller';
import {
  BookingAcceptCommandHandler,
  BookingAutoCompleteCommandHandler,
  BookingCancelCommandHandler,
  BookingCompleteCommandHandler,
  BookingCompleteShootCommandHandler,
  BookingConfirmReceiptCommandHandler,
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
import { BookingAutoCompleteJob } from '../../workers/booking-auto-complete.job';

@Module({
  controllers: [BookingController],
  providers: [
    BookingAcceptCommandHandler,
    BookingAutoCompleteCommandHandler,
    BookingCancelCommandHandler,
    BookingCompleteCommandHandler,
    BookingCompleteShootCommandHandler,
    BookingConfirmReceiptCommandHandler,
    BookingCreateCommandHandler,
    BookingDisputeCommandHandler,
    BookingRejectCommandHandler,
    BookingStartCommandHandler,
    BookingAdminQueryHandler,
    BookingGetQueryHandler,
    BookingListQueryHandler,
    BookingTimelineQueryHandler,
    BookingAutoCompleteJob,
  ],
})
export class BookingApiModule {}
