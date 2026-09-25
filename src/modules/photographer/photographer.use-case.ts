import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  photographer,
  page,
  role,
  emit,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { VerificationStatus } from '@shared/database/entities/photographer.entity';
import { PhotographerApplication } from './photographer.domain';
import { PhotographerRolePort } from './ports/photographer-role.port';

/** Application use cases for photographer profiles. */
@Injectable()
export class PhotographerUseCases {
  constructor(private readonly roles: PhotographerRolePort) {}

  /**
   * Customer gửi (hoặc gửi lại sau khi bị từ chối) hồ sơ làm thợ; hồ sơ vào trạng thái `pending` chờ admin duyệt (D9).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (customer)
   * @param input Hồ sơ nghề nghiệp: styles, khu vực, mô tả, mã số thuế, năm vào nghề
   * @returns Hồ sơ thợ (góc nhìn chủ hồ sơ); 409 nếu đang chờ duyệt hoặc đã là thợ
   */
  async create(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerCreateCommandInput,
  ) {
    const u = await currentUser(s, a);
    role(a, 'customer');
    const [existing] = await s.findBy(EntitySchemas.photographers, {
      user_id: u.id,
    });
    PhotographerApplication.assertCanSubmit(existing?.verification_status);
    const application = {
      ...input,
      verification_status: VerificationStatus.PENDING,
      rejection_reason: null,
    };
    if (existing) {
      await updateEntity(
        s,
        EntitySchemas.photographers,
        existing.id,
        application,
      );
      return this.details(s, existing.id, true);
    }
    const p = await s.save(EntitySchemas.photographers, {
      ...application,
      user_id: u.id,
    });
    await s.save(EntitySchemas.ratings, { photographer_id: p.id });
    return this.details(s, p.id, true);
  }

  /**
   * Admin duyệt hồ sơ thợ: chuyển `verified`, ghi người duyệt, gán role `photographer` và báo realtime cho người gửi.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (admin, phải có bản ghi `admins`)
   * @param input ID hồ sơ thợ
   * @returns Hồ sơ thợ sau khi duyệt; 409 nếu hồ sơ không ở `pending`
   */
  async approve(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerApproveCommandInput,
  ) {
    const admin = await this.adminProfile(s, a),
      p = await required(s, 'photographers', input.id);
    PhotographerApplication.assertReviewable(p.verification_status);
    await updateEntity(s, EntitySchemas.photographers, p.id, {
      verification_status: VerificationStatus.VERIFIED,
      is_verified: true,
      approved_by: admin.id,
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
    });
    const u = await required(s, 'users', p.user_id);
    await this.roles.grant(u.keycloak_id);
    await emit(s, 'photographer.verified', [u.id], { photographer_id: p.id });
    return this.details(s, p.id, true);
  }

  /**
   * Admin từ chối hồ sơ thợ kèm lý do; người gửi sửa rồi gửi lại được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (admin, phải có bản ghi `admins`)
   * @param input ID hồ sơ thợ và lý do từ chối
   * @returns Hồ sơ thợ sau khi từ chối; 409 nếu hồ sơ không ở `pending`
   */
  async reject(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerRejectCommandInput,
  ) {
    await this.adminProfile(s, a);
    const p = await required(s, 'photographers', input.id);
    PhotographerApplication.assertReviewable(p.verification_status);
    await updateEntity(s, EntitySchemas.photographers, p.id, {
      verification_status: VerificationStatus.REJECTED,
      is_verified: false,
      rejection_reason: input.reason,
      reviewed_at: new Date().toISOString(),
    });
    await emit(s, 'photographer.rejected', [p.user_id], {
      photographer_id: p.id,
      reason: input.reason,
    });
    return this.details(s, p.id, true);
  }

  /**
   * Lấy bản ghi `admins` của người đang gọi (cần cho cột `approved_by`).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API
   * @returns Bản ghi admin; 403 nếu không có role admin hoặc chưa có hồ sơ admin
   */
  private async adminProfile(s: EntityManager, a: Actor) {
    role(a, 'admin');
    const u = await currentUser(s, a);
    const [admin] = await s.findBy(EntitySchemas.admins, { user_id: u.id });
    ensure(admin, 'Admin profile required', 'forbidden');
    return admin;
  }

  async details(s: EntityManager, id: string, privateView = false) {
    const p = await required(s, 'photographers', id),
      u = await required(s, 'users', p.user_id);
    if (!privateView)
      ensure(u.status === 'active', 'Photographer not found', 'missing');
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: id,
    });
    const result = {
      id: p.id,
      fullname: u.fullname,
      avatar_url: u.avatar_url,
      styles: p.styles,
      started_career_at: p.started_career_at,
      is_verified: p.is_verified,
      verification_status: p.verification_status,
      location: p.location,
      is_available: p.is_available,
      description: p.description,
      rating,
    };
    return privateView
      ? {
          ...result,
          tax_code: p.tax_code,
          user_id: p.user_id,
          rejection_reason: p.rejection_reason,
          reviewed_at: p.reviewed_at,
        }
      : result;
  }

  get(s: EntityManager, _a: Actor, input: Inputs.PhotographerGetQueryInput) {
    return this.details(s, input.id);
  }

  async me(s: EntityManager, a: Actor) {
    return this.details(s, (await photographer(s, a)).id, true);
  }

  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerUpdateCommandInput,
  ) {
    const p = await photographer(s, a);
    if (Object.keys(input).length)
      await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async status(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerStatusCommandInput,
  ) {
    const p = await photographer(s, a);
    await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async location(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerLocationCommandInput,
  ) {
    const p = await photographer(s, a);
    await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async search(
    s: EntityManager,
    _a: Actor,
    input: Inputs.PhotographerSearchQueryInput,
  ) {
    const results: any[] = [];
    for (const p of await s.find(EntitySchemas.photographers)) {
      const u = await required(s, 'users', p.user_id);
      if (u.status !== 'active') continue;
      const item = await this.details(s, p.id);
      if (
        input.location &&
        !p.location.toLowerCase().includes(input.location.toLowerCase())
      )
        continue;
      if (
        input.keyword &&
        ![u.fullname, ...p.styles]
          .join(' ')
          .toLowerCase()
          .includes(input.keyword.toLowerCase())
      )
        continue;
      if (
        input.min_rating &&
        (item.rating?.average_rating ?? 0) < input.min_rating
      )
        continue;
      results.push(item);
    }
    results.sort(
      (x, y) =>
        (y.rating?.average_rating ?? 0) - (x.rating?.average_rating ?? 0) ||
        x.id.localeCompare(y.id),
    );
    return page(results, input);
  }

  top(s: EntityManager, a: Actor, input: Inputs.PhotographerTopQueryInput) {
    return this.search(s, a, input);
  }

  /**
   * Admin xem danh sách hồ sơ thợ, lọc được theo trạng thái duyệt (ví dụ `pending` để xem hàng chờ).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (admin)
   * @param input Bộ lọc `verification_status` và phân trang `limit`/`offset`
   * @returns `{ items, total, limit, offset }`, hồ sơ cũ nhất trước
   */
  async admin(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerAdminQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      await s.find(EntitySchemas.photographers, {
        where: input.verification_status
          ? { verification_status: input.verification_status }
          : {},
        order: { created_at: 'ASC' },
      }),
      input,
    );
  }
}
