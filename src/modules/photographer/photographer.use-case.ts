import { In, type EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  photographer,
  role,
  emit,
  publicPhotographer,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  VerificationStatus,
  type PhotographerEntity,
} from '@shared/database/entities/photographer.entity';
import type { UserEntity } from '@shared/database/entities/user.entity';
import {
  PhotographerApplication,
  PhotographerProfile,
} from './photographer.domain';
import { Rank } from './rank.domain';
import { Badge } from './badge.domain';
import { PhotographerRolePort } from './ports/photographer-role.port';
import { PhotographerRatingsPort } from './ports/photographer-ratings.port';

/** Nghiệp vụ hồ sơ thợ: đăng ký, duyệt, sửa hồ sơ, tìm kiếm, xếp hạng và huy hiệu. */
@Injectable()
export class PhotographerUseCases {
  constructor(
    private readonly roles: PhotographerRolePort,
    private readonly ratings: PhotographerRatingsPort,
  ) {}

  /**
   * Customer gửi (hoặc gửi lại sau khi bị từ chối) hồ sơ làm thợ; hồ sơ vào trạng thái `pending` chờ admin duyệt.
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
    await this.ratings.openRating(s, p.id);
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
      p = await this.lockedApplication(s, input.id);
    PhotographerApplication.assertNotOwnApplication(p.user_id, admin.user_id);
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
    const admin = await this.adminProfile(s, a),
      p = await this.lockedApplication(s, input.id);
    PhotographerApplication.assertNotOwnApplication(p.user_id, admin.user_id);
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
   * Hồ sơ thợ cần duyệt, khoá dòng để hai admin không cùng duyệt / từ chối một hồ sơ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param id ID hồ sơ thợ
   * @returns Hồ sơ thợ; 404 nếu không có
   */
  private async lockedApplication(s: EntityManager, id: string) {
    const p = await s.findOne(EntitySchemas.photographers, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(p, 'photographers not found', 'missing');
    return p;
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
   * @returns Hồ sơ thợ kèm rating, hạng (`rank`: mã + tên) và huy hiệu đã đạt (`badges`: mã, tên, ngày đạt); góc nhìn private có thêm `commission_percent`
   */
  private async details(s: EntityManager, id: string, privateView = false) {
    const pair = privateView
      ? await this.owner(s, id)
      : await publicPhotographer(s, id);
    const [{ profile, commissionPercent }] = await this.profiles(s, [pair]);
    const p = pair.photographer;
    return privateView
      ? {
          ...profile,
          tax_code: p.tax_code,
          user_id: p.user_id,
          rejection_reason: p.rejection_reason,
          reviewed_at: p.reviewed_at,
          commission_percent: commissionPercent,
        }
      : profile;
  }

  /**
   * Dựng hồ sơ public cho nhiều thợ cùng lúc: đọc rating, hạng, huy hiệu theo lô (số query không
   * tăng theo số thợ), giữ nguyên thứ tự đầu vào.
   *
   * @param s EntityManager của transaction hiện tại
   * @param pairs Hồ sơ thợ và user sở hữu, theo thứ tự cần trả
   * @returns Mỗi thợ một `{ profile, commissionPercent }`
   */
  private async profiles(
    s: EntityManager,
    pairs: readonly { photographer: PhotographerEntity; user: UserEntity }[],
  ) {
    const ids = pairs.map((pair) => pair.photographer.id);
    const ratings = await this.ratings.ratingsOf(s, ids);
    const ranks = await s.find(EntitySchemas.ranks);
    const names = new Map(
      (await s.find(EntitySchemas.badges)).map((d) => [d.code, d.name]),
    );
    const earned = await s.find(EntitySchemas.photographer_badges, {
      where: { photographer_id: In(ids) },
      order: { earned_at: 'ASC' },
    });
    return pairs.map(({ photographer: p, user: u }) => {
      const rating = ratings[p.id];
      const rank = Rank.of(rating?.total_bookings ?? 0, ranks);
      return {
        commissionPercent: rank.commission_percent,
        profile: {
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
          rank: { code: rank.code, name: rank.name },
          badges: earned
            .filter((b) => b.photographer_id === p.id)
            .map((b) => ({
              code: b.code,
              name: names.get(b.code) ?? b.code,
              earned_at: b.earned_at,
            })),
        },
      };
    });
  }

  /**
   * Khách xem hồ sơ public của một thợ (chỉ thợ đã duyệt, tài khoản active).
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param input ID hồ sơ thợ
   * @returns Hồ sơ public; 404 nếu thợ không public
   */
  get(s: EntityManager, _a: Actor, input: Inputs.PhotographerGetQueryInput) {
    return this.details(s, input.id);
  }

  /**
   * Thợ xem hồ sơ của chính mình (mọi trạng thái duyệt, kèm mã số thuế, lý do từ chối, % commission).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @returns Hồ sơ góc nhìn chủ hồ sơ
   */
  async me(s: EntityManager, a: Actor) {
    return this.details(s, (await photographer(s, a)).id, true);
  }

  /**
   * Thợ sửa hồ sơ (mô tả, phong cách, khu vực...). Mã số thuế khoá sau khi hồ sơ được duyệt.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input Các trường cần đổi
   * @returns Hồ sơ sau khi sửa; 400 nếu đổi mã số thuế khi đã duyệt
   */
  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerUpdateCommandInput,
  ) {
    const p = await photographer(s, a);
    PhotographerProfile.assertTaxCodeEditable(
      p.verification_status,
      p.tax_code,
      input.tax_code,
    );
    if (Object.keys(input).length)
      await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  /**
   * Thợ bật / tắt nhận lịch (`is_available`). Tắt thì lịch trống trả rỗng, không nhận booking mới.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input `is_available`
   * @returns Hồ sơ sau khi đổi
   */
  async status(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerStatusCommandInput,
  ) {
    const p = await photographer(s, a);
    await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  /**
   * Thợ cập nhật khu vực hoạt động.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API (thợ)
   * @param input Khu vực mới
   * @returns Hồ sơ sau khi đổi
   */
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
   * Số liệu để xét huy hiệu: thống kê rating và điểm đúng giờ trung bình của review đang hiện.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Số liệu đầu vào cho `Badge.earned`
   */
  private async badgeStats(s: EntityManager, photographerId: string) {
    const rating = (await this.ratings.ratingsOf(s, [photographerId]))[
      photographerId
    ];
    return {
      averageRating: rating?.average_rating ?? 0,
      averagePunctuality: await this.ratings.averagePunctuality(
        s,
        photographerId,
      ),
      visibleReviews: rating?.total_feedbacks ?? 0,
      returnCustomers: rating?.return_customers ?? 0,
    };
  }

  /**
   * Xét và cấp huy hiệu mới cho một thợ. Huy hiệu đã đạt giữ vĩnh viễn, không bao giờ bị gỡ.
   * Mỗi huy hiệu mới: ghi `earned_at` và báo realtime `photographer.badge_earned` cho thợ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Mã các huy hiệu vừa đạt trong lần xét này
   */
  async awardBadges(s: EntityManager, photographerId: string) {
    const earned = Badge.earned(
        await this.badgeStats(s, photographerId),
        await s.find(EntitySchemas.badges, {
          order: { created_at: 'ASC' },
        }),
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
      .leftJoin(
        EntitySchemas.photographer_ratings,
        'r',
        'r.photographer_id = p.id',
      )
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
    const ids = rows.map((row) => row.id);
    const found = new Map(
      (await s.findBy(EntitySchemas.photographers, { id: In(ids) })).map(
        (p) => [p.id, p],
      ),
    );
    const users = new Map(
      (
        await s.findBy(EntitySchemas.users, {
          id: In([...found.values()].map((p) => p.user_id)),
        })
      ).map((u) => [u.id, u]),
    );
    const pairs = ids.map((id) => {
      const photographer = found.get(id)!;
      return { photographer, user: users.get(photographer.user_id)! };
    });
    const items = (await this.profiles(s, pairs)).map((x) => x.profile);
    return { items, total, offset, limit };
  }

  /**
   * Danh sách thợ nổi bật: cùng cách xếp hạng với tìm kiếm (đang nhận lịch trước, rating cao trước).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người đang gọi API
   * @param input Bộ lọc và phân trang
   * @returns `{ items, total, offset, limit }`
   */
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
    const offset = input.offset ?? 0,
      limit = input.limit ?? 20;
    const [items, total] = await s.findAndCount(EntitySchemas.photographers, {
      where: input.verification_status
        ? { verification_status: input.verification_status }
        : {},
      order: { created_at: 'ASC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return { items, total, offset, limit };
  }
}
