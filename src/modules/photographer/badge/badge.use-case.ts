import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas, updateEntity } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';

/** Danh mục huy hiệu (`badges`): public xem, admin chỉnh nội dung và ngưỡng. */
@Injectable()
export class BadgeUseCases {
  /**
   * Danh sách huy hiệu để FE hiển thị tên, mô tả, điều kiện.
   *
   * @param s EntityManager của transaction hiện tại
   * @returns `{ items }`: các huy hiệu theo thứ tự tạo
   */
  async list(s: EntityManager) {
    return {
      items: await s.find(EntitySchemas.badges, {
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Admin sửa một huy hiệu: tên, mô tả, ngưỡng, số review tối thiểu, bật/tắt.
   * Tắt huy hiệu chỉ ngừng cấp mới; huy hiệu đã cấp vẫn giữ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (admin)
   * @param input Mã huy hiệu và các trường cần đổi
   * @returns Huy hiệu sau khi sửa; 404 nếu không có mã này
   */
  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.BadgeUpdateCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const { code, ...fields } = input;
    const badge = await s.findOneBy(EntitySchemas.badges, { code });
    ensure(badge, 'Badge not found', 'missing');
    return updateEntity(s, EntitySchemas.badges, badge.id, fields);
  }
}
