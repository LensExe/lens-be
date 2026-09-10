import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser, required, page, role } from '@shared/common/access';
import type { TableName } from '@shared/database/records/records';
import { Report } from '../domain/report';

@Injectable()
export class ModerationUseCases {
  async create(s: Session, a: Actor, i: Inputs.ModerationCreateCommandInput) {
    const u = await currentUser(s, a),
      table = {
        user: 'users',
        review: 'feedbacks',
        booking: 'bookings',
        media: 'media',
      }[i.target_type] as TableName;
    Report.assertValidTargetType(i.target_type);
    await required(s, table, i.target_id);
    return s.insert('reports', { ...i, user_id: u.id });
  }
  async mine(s: Session, a: Actor, i: Inputs.ModerationMineQueryInput) {
    const u = await currentUser(s, a);
    return page(await s.find('reports', { user_id: u.id }), i);
  }
  async list(s: Session, a: Actor, i: Inputs.ModerationListQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find('reports')).filter(
        (r) =>
          (!i.status || r.status === i.status) &&
          (!i.target_type || r.target_type === i.target_type),
      ),
      i,
    );
  }
  async get(s: Session, a: Actor, i: { id: string }) {
    role(a, 'admin');
    await currentUser(s, a);
    return {
      ...(await required(s, 'reports', i.id)),
      history: await s.find('report_history', { report_id: i.id }),
    };
  }
  async resolve(
    s: Session,
    a: Actor,
    i: { id: string; status: string; resolution: string },
  ) {
    role(a, 'admin');
    const u = await currentUser(s, a),
      r = await required(s, 'reports', i.id);
    Report.assertResolvable(r.status);
    await s.insert('report_history', {
      report_id: r.id,
      actor_id: u.id,
      status: i.status,
      resolution: i.resolution,
    });
    return s.update('reports', r.id, {
      status: i.status,
      resolution: i.resolution,
      resolved_by: u.id,
    });
  }
  async dashboard(s: Session, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);
    return {
      users: (await s.find('users')).length,
      bookings: (await s.find('bookings')).length,
      photographers: (await s.find('photographers')).length,
      open_reports: (await s.find('reports', { status: 'open' })).length,
      paid_volume_vnd: (
        await s.find('transactions', { status: 'paid' })
      ).reduce((n, t) => n + Number(t.amount), 0),
    };
  }
}
