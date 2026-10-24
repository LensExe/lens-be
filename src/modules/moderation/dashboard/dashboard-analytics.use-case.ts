import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { currentUser, role } from '@shared/common/access';
import type * as Inputs from '@shared/contracts/contracts';
import type { Actor } from '@shared/platform/auth/actor';

interface MonthlyBookingsRow {
  month: string;
  bookings: number | string;
}

interface MonthlyPaymentsRow {
  month: string;
  paid_volume_vnd: number | string;
}

interface BookingLocationRow {
  location: string;
  bookings: number | string;
}

interface BookingStyleRow {
  style: string;
  bookings: number | string;
}

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Read-only analytics backing the additional admin dashboard endpoint. */
@Injectable()
export class AdminDashboardAnalyticsUseCases {
  /** Return monthly trends, booking breakdowns, and the latest admin activity. */
  async dashboardAnalytics(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.AdminDashboardAnalyticsQueryInput,
  ): Promise<Inputs.AdminDashboardAnalyticsData> {
    role(actor, 'admin');
    await currentUser(manager, actor);

    const months = Math.min(12, Math.max(1, Math.trunc(input.months ?? 6)));
    const now = new Date();
    const vietnamNow = new Date(now.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);
    const startAt = new Date(
      Date.UTC(
        vietnamNow.getUTCFullYear(),
        vietnamNow.getUTCMonth() - months + 1,
        1,
      ) - VIETNAM_TIMEZONE_OFFSET_MS,
    );
    const endAt = new Date(
      Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth() + 1, 1) -
        VIETNAM_TIMEZONE_OFFSET_MS,
    );

    const [
      bookingMonths,
      paymentMonths,
      bookingLocations,
      bookingStyles,
      recentActivity,
    ] = await Promise.all([
      manager.query<MonthlyBookingsRow[]>(
        `SELECT
             TO_CHAR(DATE_TRUNC('month', booking.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS month,
             COUNT(*)::int AS bookings
           FROM bookings booking
           WHERE booking.created_at >= $1 AND booking.created_at < $2
           GROUP BY 1
           ORDER BY 1`,
        [startAt, endAt],
      ),
      manager.query<MonthlyPaymentsRow[]>(
        `SELECT
             TO_CHAR(
               DATE_TRUNC(
                 'month',
                 COALESCE(
                   payment_webhook.received_at,
                   txn.checkout_review_resolved_at,
                   txn.updated_at,
                   txn.created_at
                 ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
               ),
               'YYYY-MM'
             ) AS month,
             COALESCE(SUM(txn.amount), 0)::text AS paid_volume_vnd
           FROM transactions txn
           LEFT JOIN LATERAL (
             SELECT MIN(webhook.created_at) AS received_at
             FROM payment_webhooks webhook
             WHERE webhook.transaction_id = txn.id
           ) payment_webhook ON TRUE
           WHERE COALESCE(
               payment_webhook.received_at,
               txn.checkout_review_resolved_at,
               txn.updated_at,
               txn.created_at
             ) >= $1
             AND COALESCE(
               payment_webhook.received_at,
               txn.checkout_review_resolved_at,
               txn.updated_at,
               txn.created_at
             ) < $2
             AND txn.status = 'paid'
             AND txn.type IN ('deposit', 'remaining')
           GROUP BY 1
           ORDER BY 1`,
        [startAt, endAt],
      ),
      manager.query<BookingLocationRow[]>(
        `SELECT
             COALESCE(NULLIF(BTRIM(booking.location), ''), 'Chưa xác định') AS location,
             COUNT(*)::int AS bookings
           FROM bookings booking
           WHERE booking.created_at >= $1 AND booking.created_at < $2
           GROUP BY 1
           ORDER BY bookings DESC, location ASC
           LIMIT 10`,
        [startAt, endAt],
      ),
      manager.query<BookingStyleRow[]>(
        `SELECT
             COALESCE(NULLIF(BTRIM(style_row.style), ''), 'Chưa xác định') AS style,
             COUNT(*)::int AS bookings
           FROM bookings booking
           INNER JOIN photographers photographer
             ON photographer.id = booking.photographer_id
           CROSS JOIN LATERAL jsonb_array_elements_text(
             COALESCE(photographer.styles, '[]'::jsonb)
           ) AS style_row(style)
           WHERE booking.created_at >= $1 AND booking.created_at < $2
           GROUP BY 1
           ORDER BY bookings DESC, style ASC
           LIMIT 10`,
        [startAt, endAt],
      ),
      manager.query<Inputs.AdminDashboardAnalyticsData['recent_activity']>(
        `SELECT
             activity.id,
             activity.kind,
             activity.title,
             activity.detail,
             activity.status,
             activity.created_at
           FROM (
             SELECT
               booking.id::text AS id,
               'booking'::text AS kind,
               COALESCE(NULLIF(BTRIM(customer_user.fullname), ''), 'Khách hàng') AS title,
               CONCAT_WS(
                 ' · ',
                 CASE
                   WHEN NULLIF(BTRIM(booking.location), '') IS NOT NULL
                     THEN 'Địa điểm: ' || BTRIM(booking.location)
                 END,
                 CASE
                   WHEN NULLIF(BTRIM(photographer_user.fullname), '') IS NOT NULL
                     THEN 'Nhiếp ảnh gia: ' || BTRIM(photographer_user.fullname)
                 END
               ) AS detail,
               booking.status::text AS status,
               booking.created_at
             FROM bookings booking
             LEFT JOIN customers customer ON customer.id = booking.customer_id
             LEFT JOIN users customer_user ON customer_user.id = customer.user_id
             LEFT JOIN photographers photographer
               ON photographer.id = booking.photographer_id
             LEFT JOIN users photographer_user
               ON photographer_user.id = photographer.user_id

             UNION ALL

             SELECT
               report.id::text AS id,
               'report'::text AS kind,
               report.target_type::text AS title,
               LEFT(report.reason, 240) AS detail,
               report.status::text AS status,
               report.created_at
             FROM reports report
           ) activity
           ORDER BY activity.created_at DESC, activity.id DESC
           LIMIT 10`,
      ),
    ]);

    const bookingCountByMonth = new Map(
      bookingMonths.map((row) => [row.month, Number(row.bookings)]),
    );
    const paidVolumeByMonth = new Map(
      paymentMonths.map((row) => [row.month, Number(row.paid_volume_vnd)]),
    );
    const monthKeys = Array.from({ length: months }, (_, index) => {
      const month = new Date(
        Date.UTC(
          vietnamNow.getUTCFullYear(),
          vietnamNow.getUTCMonth() - months + 1 + index,
          1,
        ),
      );
      return month.toISOString().slice(0, 7);
    });

    return {
      monthly: monthKeys.map((month) => ({
        month,
        bookings: bookingCountByMonth.get(month) ?? 0,
        paid_volume_vnd: paidVolumeByMonth.get(month) ?? 0,
      })),
      booking_by_location: bookingLocations.map((row) => ({
        location: row.location,
        bookings: Number(row.bookings),
      })),
      booking_by_style: bookingStyles.map((row) => ({
        style: row.style,
        bookings: Number(row.bookings),
      })),
      recent_activity: recentActivity,
    };
  }
}
