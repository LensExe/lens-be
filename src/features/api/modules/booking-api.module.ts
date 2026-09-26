import { Module } from '@nestjs/common';
import { BookingController } from '../http/booking.controller';
import {
  BookingAcceptCommandHandler,
  BookingAdminCancelCommandHandler,
  BookingAutoCompleteCommandHandler,
  BookingCancelCommandHandler,
  BookingCancelUnpaidCommandHandler,
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
import { BookingCancelUnpaidJob } from '../../workers/booking-cancel-unpaid.job';

@Module({
  controllers: [BookingController],
  providers: [
    BookingAcceptCommandHandler,
    BookingAdminCancelCommandHandler,
    BookingAutoCompleteCommandHandler,
    BookingCancelCommandHandler,
    BookingCancelUnpaidCommandHandler,
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
    BookingCancelUnpaidJob,
  ],
})
export class BookingApiModule {}
