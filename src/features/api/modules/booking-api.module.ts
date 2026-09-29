import { Module } from '@nestjs/common';
import { BookingController } from '../http/booking.controller';
import {
  BookingAcceptCommandHandler,
  BookingAdminCancelCommandHandler,
  BookingAutoCompleteCommandHandler,
  BookingCancelCommandHandler,
  BookingCancelUnpaidCommandHandler,
  BookingCompleteCommandHandler,
  BookingCompleteShootCommandHandler,
  BookingConfirmReceiptCommandHandler,
  BookingCreateCommandHandler,
  BookingDisputeCommandHandler,
  BookingExpirePendingCommandHandler,
  BookingRejectCommandHandler,
  BookingStartCommandHandler,
} from '@modules/booking/core/bookings.command';
import {
  BookingCollaboratorAcceptCommandHandler,
  BookingCollaboratorDeclineCommandHandler,
  BookingCollaboratorInviteCommandHandler,
  BookingCollaboratorRevokeCommandHandler,
} from '@modules/booking/collaborator/collaborator.command';
import {
  BookingAdminQueryHandler,
  BookingGetQueryHandler,
  BookingListQueryHandler,
  BookingTimelineQueryHandler,
} from '@modules/booking/core/bookings.query';
import {
  BookingCollaboratorListQueryHandler,
  BookingCollaboratorMeQueryHandler,
} from '@modules/booking/collaborator/collaborator.query';
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
