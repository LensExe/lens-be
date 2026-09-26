import { Module } from '@nestjs/common';
import { BookingController } from '../http/booking.controller';
import {
  BookingAcceptCommandHandler,
  BookingAutoCompleteCommandHandler,
  BookingCancelCommandHandler,
  BookingCollaboratorAcceptCommandHandler,
  BookingCollaboratorDeclineCommandHandler,
  BookingCollaboratorInviteCommandHandler,
  BookingCollaboratorRevokeCommandHandler,
  BookingCompleteCommandHandler,
  BookingCompleteShootCommandHandler,
  BookingConfirmReceiptCommandHandler,
  BookingCreateCommandHandler,
  BookingDisputeCommandHandler,
  BookingExpirePendingCommandHandler,
  BookingRejectCommandHandler,
  BookingStartCommandHandler,
} from '@modules/booking/bookings.command';
import {
  BookingAdminQueryHandler,
  BookingCollaboratorListQueryHandler,
  BookingCollaboratorMeQueryHandler,
  BookingGetQueryHandler,
  BookingListQueryHandler,
  BookingTimelineQueryHandler,
} from '@modules/booking/bookings.query';
import { BookingAutoCompleteJob } from '../../workers/booking-auto-complete.job';
import { BookingExpirePendingJob } from '../../workers/booking-expire-pending.job';

@Module({
  controllers: [BookingController],
  providers: [
    BookingAcceptCommandHandler,
    BookingAutoCompleteCommandHandler,
    BookingCancelCommandHandler,
    BookingCollaboratorAcceptCommandHandler,
    BookingCollaboratorDeclineCommandHandler,
    BookingCollaboratorInviteCommandHandler,
    BookingCollaboratorRevokeCommandHandler,
    BookingCompleteCommandHandler,
    BookingCompleteShootCommandHandler,
    BookingConfirmReceiptCommandHandler,
    BookingCreateCommandHandler,
    BookingDisputeCommandHandler,
    BookingExpirePendingCommandHandler,
    BookingRejectCommandHandler,
    BookingStartCommandHandler,
    BookingAdminQueryHandler,
    BookingCollaboratorListQueryHandler,
    BookingCollaboratorMeQueryHandler,
    BookingGetQueryHandler,
    BookingListQueryHandler,
    BookingTimelineQueryHandler,
    BookingAutoCompleteJob,
    BookingExpirePendingJob,
  ],
})
export class BookingApiModule {}
