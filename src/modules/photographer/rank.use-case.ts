import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas, updateEntity } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { Rank } from './rank.domain';

/** Danh mục hạng thợ (`ranks`): public xem, admin chỉnh tên, mốc và % commission. */
@Injectable()
export class RankUseCases {
  /**
   * Danh sách hạng để FE hiển thị tên và mốc.
   *
   * @param s EntityManager của transaction hiện tại
   * @returns `{ items }`: các hạng theo mốc số buổi tăng dần
   */
  async list(s: EntityManager) {
    return {
      items: await s.find(EntitySchemas.ranks, {
        order: { min_completed: 'ASC' },
      }),
    };
  }

  /**
   * Admin sửa một hạng: tên, mốc số buổi, % commission.
   * Danh mục sau khi sửa vẫn phải có hạng mốc 0; mốc trùng hạng khác thì 409 (UNIQUE).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (admin)
   * @param input Mã hạng và các trường cần đổi
   * @returns Hạng sau khi sửa; 404 nếu không có mã này
   */
  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.RankUpdateCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const { code, ...fields } = input;
    const rank = await s.findOneBy(EntitySchemas.ranks, { code });
    ensure(rank, 'Rank not found', 'missing');
    const updated = await updateEntity(s, EntitySchemas.ranks, rank.id, fields);
    Rank.assertCatalog(await s.find(EntitySchemas.ranks));
    return updated;
  }
}
