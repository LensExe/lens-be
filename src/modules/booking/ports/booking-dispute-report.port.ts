import type { EntityManager } from 'typeorm';
import type { ReportEntity } from '@shared/database/entities/report.entity';
import type { BookingReportCategory } from '@shared/domain/values/report.values';

export type CreatedBookingReport = ReportEntity & {
  evidence_media_ids: string[];
};

/** Create a moderation report after Booking has verified the dispute participants. */
export abstract class BookingDisputeReportPort {
  abstract createBookingDispute(
    manager: EntityManager,
    input: {
      user_id: string;
      booking_id: string;
      reason: string;
      booking_issue_type?: BookingReportCategory;
      evidence_media_ids?: readonly string[];
    },
  ): Promise<CreatedBookingReport>;
}
