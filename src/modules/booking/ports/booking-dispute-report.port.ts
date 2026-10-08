import type { EntityManager } from 'typeorm';
import type { ReportEntity } from '@shared/database/entities/report.entity';

export type CreatedBookingReport = ReportEntity & {
  evidence_media_ids: string[];
};

/** Create a moderation report after Booking has verified the dispute participants. */
export abstract class BookingDisputeReportPort {
  abstract createBookingDispute(
    manager: EntityManager,
    input: { user_id: string; booking_id: string; reason: string },
  ): Promise<CreatedBookingReport>;
}
