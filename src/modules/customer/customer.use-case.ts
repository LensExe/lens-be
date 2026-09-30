import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { currentUser, required, role, pageWindow } from '@shared/common/access';
import { EntitySchemas, updateEntity } from '@shared/database';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/customer.contract';
import { Customer } from './customer.domain';
import type { CustomerBookingStatsPort } from './ports/customer-booking-stats.port';
import type { PhotographerSearchPort } from './ports/photographer-search.port';

@Injectable()
export class CustomerUseCases {
  constructor(
    private readonly bookingStats: CustomerBookingStatsPort,
    private readonly photographerSearch: PhotographerSearchPort,
  ) {}

  /**
   * Khách hàng xem profile của chính mình.
   * Trả về customer record kèm thông tin user (fullname, avatar_url).
   *
   * @param s EntityManager của transaction hiện tại
   * @param actor Người đang gọi API (phải đã đăng ký)
   * @returns Customer profile kèm fullname và avatar_url từ bảng users
   */
  async me(s: EntityManager, actor: Actor) {
    const user = await currentUser(s, actor);
    const [customer] = await s.findBy(EntitySchemas.customers, {
      user_id: user.id,
    });
    ensure(customer, 'customers not found', 'missing');
    return {
      ...customer,
      fullname: user.fullname,
      avatar_url: user.avatar_url,
    };
  }

  /**
   * Khách hàng cập nhật description, preferred_styles và location của mình.
   *
   * @param s EntityManager của transaction hiện tại
   * @param actor Người đang gọi API (phải đã đăng ký)
   * @param input Các trường cần đổi: description, preferred_styles, location
   * @returns Customer profile sau khi cập nhật
   */
  async update(
    s: EntityManager,
    actor: Actor,
    input: Inputs.CustomerUpdateCommandInput,
  ) {
    const user = await currentUser(s, actor);
    const [customer] = await s.findBy(EntitySchemas.customers, {
      user_id: user.id,
    });
    ensure(customer, 'customers not found', 'missing');

    const normalizedInput = { ...input };
    if (input.description !== undefined) {
      normalizedInput.description = Customer.normalizeDescription(
        input.description,
      );
    }
    if (input.preferred_styles !== undefined) {
      normalizedInput.preferred_styles = Customer.normalizeStyles(
        input.preferred_styles,
      );
    }
    if (input.location !== undefined) {
      normalizedInput.location = Customer.normalizeLocation(input.location);
    }

    return updateEntity(
      s,
      EntitySchemas.customers,
      customer.id,
      normalizedInput,
    );
  }

  /**
   * Admin xem customer profile của bất kỳ khách hàng nào theo customer_id.
   *
   * @param s EntityManager của transaction hiện tại
   * @param actor Người đang gọi API (phải có role admin)
   * @param input Chứa customer_id cần xem
   * @returns Customer profile kèm fullname và avatar_url từ bảng users
   */
  async adminGet(
    s: EntityManager,
    actor: Actor,
    input: Inputs.CustomerAdminGetQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(s, actor);
    const customer = await required(s, 'customers', input.customer_id);
    const user = await required(s, 'users', customer.user_id);
    return {
      ...customer,
      fullname: user.fullname,
      avatar_url: user.avatar_url,
    };
  }

  /**
   * Admin xem danh sách customer, có lọc theo keyword (tên, email) và location.
   */
  async adminList(
    s: EntityManager,
    actor: Actor,
    input: Inputs.CustomerAdminListQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(s, actor);

    const { offset, limit } = pageWindow(input);

    const qb = s
      .createQueryBuilder(EntitySchemas.customers, 'c')
      .innerJoin(EntitySchemas.users, 'u', 'u.id = c.user_id');

    if (input.keyword) {
      const kw = `%${input.keyword}%`;
      qb.andWhere('(u.fullname ILIKE :kw OR u.email ILIKE :kw)', { kw });
    }
    if (input.location) {
      qb.andWhere('c.location ILIKE :loc', { loc: `%${input.location}%` });
    }

    const total = await qb.getCount();
    const rows = await qb
      .select([
        'c.id AS id',
        'c.user_id AS user_id',
        'c.description AS description',
        'c.preferred_styles AS preferred_styles',
        'c.location AS location',
        'c.created_at AS created_at',
        'c.updated_at AS updated_at',
        'u.fullname AS fullname',
        'u.email AS email',
        'u.avatar_url AS avatar_url',
        'u.status AS status',
      ])
      .orderBy('c.created_at', 'DESC')
      .addOrderBy('c.id', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    return { items: rows, total, offset, limit };
  }

  /**
   * Khách hàng xem thống kê booking của chính mình.
   */
  async myBookingSummary(
    s: EntityManager,
    actor: Actor,
    input: Inputs.CustomerMyBookingSummaryQueryInput,
  ) {
    void input;
    const user = await currentUser(s, actor);
    const [customer] = await s.findBy(EntitySchemas.customers, {
      user_id: user.id,
    });
    ensure(customer, 'customers not found', 'missing');
    return this.bookingStats.statsForCustomer(s, customer.id);
  }

  /**
   * Gợi ý thợ ảnh cho customer dựa trên preferred_styles và location.
   */
  async recommend(
    s: EntityManager,
    actor: Actor,
    input: Inputs.CustomerRecommendQueryInput,
  ) {
    const user = await currentUser(s, actor);
    const [customer] = await s.findBy(EntitySchemas.customers, {
      user_id: user.id,
    });
    ensure(customer, 'customers not found', 'missing');

    return this.photographerSearch.searchPhotographersForCustomer(s, {
      styles: customer.preferred_styles.length
        ? customer.preferred_styles
        : undefined,
      location: customer.location ?? undefined,
      limit: input.limit ?? 10,
      offset: input.offset ?? 0,
    });
  }
}
