import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';

/** Admin dashboard read model, kept separate from report case processing. */
@Injectable()
export class ModerationDashboardUseCases {
  /** Summarize platform counts and paid volume for the admin dashboard. */
  async dashboard(s: EntityManager, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);

    const users = await s.count(EntitySchemas.users);
    const bookings = await s.count(EntitySchemas.bookings);
    const photographers = await s.count(EntitySchemas.photographers);
    const openReports = await s.countBy(EntitySchemas.reports, {
      status: 'open',
    });
    const paidVolume = await s
      .createQueryBuilder()
      .select('COALESCE(SUM(transaction.amount), 0)', 'paid_volume_vnd')
      .from(EntitySchemas.transactions, 'transaction')
      .where('transaction.status = :status', { status: 'paid' })
      .getRawOne<{ paid_volume_vnd: string | number }>();

    return {
      users,
      bookings,
      photographers,
      open_reports: openReports,
      paid_volume_vnd: Number(paidVolume?.paid_volume_vnd ?? 0),
    };
  }
}
