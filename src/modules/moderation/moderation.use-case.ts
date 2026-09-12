import type { EntityManager } from 'typeorm';
import {
  EntitySchemas,
  updateEntity,
  ReportTargetType,
} from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import { currentUser, required, page, role } from '@shared/common/access';
import type { TableName } from '@shared/database/entities';
import { Report } from './report.domain';
import { ensure } from '@shared/platform/exceptions/domain.error';

@Injectable()
export class ModerationUseCases {
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.ModerationCreateCommandInput,
  ) {
    const u = await currentUser(s, a),
      table = {
        [ReportTargetType.USER]: 'users',
        [ReportTargetType.BOOKING]: 'bookings',
        [ReportTargetType.PHOTOGRAPHER]: 'photographers',
        [ReportTargetType.PORTFOLIO]: 'portfolios',
        [ReportTargetType.FEEDBACK]: 'feedbacks',
      }[i.target_type] as TableName;
    Report.assertValidTargetType(i.target_type);
    await required(s, table, i.target_id);
    for (const mediaId of i.evidence_media_ids ?? []) {
      const media = await required(s, 'media', mediaId);
      ensure(
        media.user_id === u.id,
        'Evidence media access denied',
        'forbidden',
      );
    }
    return s.save(EntitySchemas.reports, {
      ...i,
      evidence_media_ids: i.evidence_media_ids ?? [],
      user_id: u.id,
    });
  }

  async mine(s: EntityManager, a: Actor, i: Inputs.ModerationMineQueryInput) {
    const u = await currentUser(s, a);
    return page(await s.findBy(EntitySchemas.reports, { user_id: u.id }), i);
  }

  async list(s: EntityManager, a: Actor, i: Inputs.ModerationListQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find(EntitySchemas.reports)).filter(
        (r) =>
          (!i.status || r.status === i.status) &&
          (!i.target_type || r.target_type === i.target_type),
      ),
      i,
    );
  }

  async get(s: EntityManager, a: Actor, i: Inputs.ModerationGetQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return required(s, 'reports', i.id);
  }

  async resolve(
    s: EntityManager,
    a: Actor,
    i: Inputs.ModerationResolveCommandInput,
  ) {
    role(a, 'admin');
    const u = await currentUser(s, a),
      r = await required(s, 'reports', i.id);
    Report.assertResolvable(r.status);
    return updateEntity(s, EntitySchemas.reports, r.id, {
      status: i.status,
      resolution: i.resolution,
      resolved_by: u.id,
    });
  }

  async dashboard(s: EntityManager, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);
    return {
      users: (await s.find(EntitySchemas.users)).length,
      bookings: (await s.find(EntitySchemas.bookings)).length,
      photographers: (await s.find(EntitySchemas.photographers)).length,
      open_reports: (await s.findBy(EntitySchemas.reports, { status: 'open' }))
        .length,
      paid_volume_vnd: (
        await s.findBy(EntitySchemas.transactions, { status: 'paid' })
      ).reduce((n, t) => n + Number(t.amount), 0),
    };
  }
}
