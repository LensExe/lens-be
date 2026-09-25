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
  publicPhotographer,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { VerificationStatus } from '@shared/database/entities/photographer.entity';
import { PhotographerApplication } from './photographer.domain';
import { PhotographerRank } from './photographer-rank.domain';
import { PhotographerBadges } from './photographer-badge.domain';
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

  /**
   * Dựng hồ sơ thợ để trả về API.
   *
   * @param s EntityManager của transaction hiện tại
   * @param id ID hồ sơ thợ
   * @param privateView `true`: góc nhìn chủ hồ sơ/admin (mọi trạng thái, thêm mã số thuế, lý do từ chối);
   *   `false`: góc nhìn public (chỉ thợ `verified` và còn active, không thì 404)
   * @returns Hồ sơ thợ kèm rating, hạng (`rank`) và huy hiệu đã đạt (`badges`: mã + ngày đạt); góc nhìn private có thêm `commission_percent`
   */
  async details(s: EntityManager, id: string, privateView = false) {
    const { photographer: p, user: u } = privateView
      ? await this.owner(s, id)
      : await publicPhotographer(s, id);
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: id,
    });
    const rank = PhotographerRank.of(rating?.total_bookings ?? 0),
      badges = (
        await s.find(EntitySchemas.photographer_badges, {
          where: { photographer_id: p.id },
          order: { earned_at: 'ASC' },
        })
      ).map((b) => ({ code: b.code, earned_at: b.earned_at }));
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
      rank: rank.rank,
      badges,
    };
    return privateView
      ? {
          ...result,
          tax_code: p.tax_code,
          user_id: p.user_id,
          rejection_reason: p.rejection_reason,
          reviewed_at: p.reviewed_at,
          commission_percent: rank.commission_percent,
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

  /**
   * Số liệu để xét huy hiệu (D11): thống kê rating và điểm đúng giờ trung bình của review đang hiện.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Số liệu đầu vào cho `PhotographerBadges.of`
   */
  private async badgeStats(s: EntityManager, photographerId: string) {
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: photographerId,
    });
    const row = await s
      .createQueryBuilder(EntitySchemas.feedbacks, 'f')
      .innerJoin(EntitySchemas.bookings, 'b', 'b.id = f.booking_id')
      .select('AVG(f.punctuality_rating)', 'punctuality')
      .where('b.photographer_id = :photographerId', { photographerId })
      .andWhere('f.is_visible = true')
      .getRawOne<{ punctuality: string | null }>();
    return {
      averageRating: rating?.average_rating ?? 0,
      averagePunctuality: Number(row?.punctuality ?? 0),
      visibleReviews: rating?.total_feedbacks ?? 0,
      returnCustomers: rating?.return_customers ?? 0,
    };
  }

  /**
   * Xét và cấp huy hiệu mới cho một thợ (D13). Huy hiệu đã đạt giữ vĩnh viễn, không bao giờ bị gỡ.
   * Mỗi huy hiệu mới: ghi `earned_at` và báo realtime `photographer.badge_earned` cho thợ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Mã các huy hiệu vừa đạt trong lần xét này
   */
  async awardBadges(s: EntityManager, photographerId: string) {
    const earned = PhotographerBadges.of(
        await this.badgeStats(s, photographerId),
      ),
      owned = new Set(
        (
          await s.findBy(EntitySchemas.photographer_badges, {
            photographer_id: photographerId,
          })
        ).map((b) => b.code),
      ),
      fresh = earned.filter((code) => !owned.has(code));
    if (!fresh.length) return fresh;
    const p = await required(s, 'photographers', photographerId);
    for (const code of fresh) {
      await s.save(EntitySchemas.photographer_badges, {
        photographer_id: photographerId,
        code,
        earned_at: new Date().toISOString(),
      });
      await emit(s, 'photographer.badge_earned', [p.user_id], {
        photographer_id: photographerId,
        code,
      });
    }
    return fresh;
  }

  /**
   * Job hằng ngày (role `system`): xét huy hiệu cho mọi thợ đã được duyệt.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người gọi (phải có role `system`)
   * @returns `{ checked, awarded }`: số thợ đã xét và số huy hiệu mới cấp
   */
  async awardAllBadges(s: EntityManager, a: Actor) {
    role(a, 'system');
    const photographers = await s.findBy(EntitySchemas.photographers, {
      verification_status: VerificationStatus.VERIFIED,
    });
    let awarded = 0;
    for (const p of photographers)
      awarded += (await this.awardBadges(s, p.id)).length;
    return { checked: photographers.length, awarded };
  }

  /**
   * Hồ sơ thợ và user sở hữu, không lọc trạng thái (dùng cho góc nhìn chủ hồ sơ / admin).
   *
   * @param s EntityManager của transaction hiện tại
   * @param id ID hồ sơ thợ
   * @returns Hồ sơ photographer và user; 404 nếu không có
   */
  private async owner(s: EntityManager, id: string) {
    const photographer = await required(s, 'photographers', id),
      user = await required(s, 'users', photographer.user_id);
    return { photographer, user };
  }

  /**
   * Khách tìm thợ: chỉ thợ `verified` và còn active. Lọc, sắp xếp, phân trang ngay trong DB.
   * Thứ tự: thợ đang nhận việc trước, rồi rating cao trước, cuối cùng theo id cho ổn định.
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param input Bộ lọc `location`, `keyword` (tên hoặc style), `min_rating` và phân trang `limit`/`offset`
   * @returns `{ items, total, offset, limit }`
   */
  async search(
    s: EntityManager,
    _a: Actor,
    input: Inputs.PhotographerSearchQueryInput,
  ) {
    const offset = input.offset ?? 0,
      limit = input.limit ?? 20,
      contains = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
    const query = s
      .createQueryBuilder(EntitySchemas.photographers, 'p')
      .innerJoin(EntitySchemas.users, 'u', 'u.id = p.user_id')
      .leftJoin(EntitySchemas.ratings, 'r', 'r.photographer_id = p.id')
      .where('u.status = :active', { active: 'active' })
      .andWhere('p.verification_status = :verified', {
        verified: VerificationStatus.VERIFIED,
      });
    if (input.location)
      query.andWhere('p.location ILIKE :location', {
        location: contains(input.location),
      });
    if (input.keyword)
      query.andWhere(
        '(u.fullname ILIKE :keyword OR p.styles::text ILIKE :keyword)',
        {
          keyword: contains(input.keyword),
        },
      );
    if (input.min_rating)
      query.andWhere('COALESCE(r.average_rating, 0) >= :minRating', {
        minRating: input.min_rating,
      });
    const total = await query.getCount();
    const rows = await query
      .select('p.id', 'id')
      .orderBy('p.is_available', 'DESC')
      .addOrderBy('COALESCE(r.average_rating, 0)', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: string }>();
    const items: Awaited<ReturnType<PhotographerUseCases['details']>>[] = [];
    for (const row of rows) items.push(await this.details(s, row.id));
    return { items, total, offset, limit };
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
