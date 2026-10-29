import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { currentUser, required, role, pageWindow } from '@shared/common/access';
import { EntitySchemas, updateEntity } from '@shared/database';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/customer.contract';
import { Customer } from './customer.domain';
import { CustomerBookingStatsPort } from './ports/customer-booking-stats.port';
import { PhotographerSearchPort } from './ports/photographer-search.port';

@Injectable()
export class CustomerUseCases {
  constructor(
    private readonly bookingStats: CustomerBookingStatsPort,
    private readonly photographerSearch: PhotographerSearchPort,
  ) {}

  /**
   * Customer views their own profile.
   * Return the customer record with user details (`fullname`, `avatar_url`).
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor making the request; must be registered.
   * @returns Customer profile with `fullname` and `avatar_url` from the `users` table.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
   * Customer updates their own `description`, `preferred_styles`, and `location`.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor making the request; must be registered.
   * @param input Fields to update: `description`, `preferred_styles`, and `location`.
   * @returns Updated customer profile.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
   * Admin views any customer profile by `customer_id`.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor making the request; must have the admin role.
   * @param input Customer ID to look up.
   * @returns Customer profile with `fullname` and `avatar_url` from the `users` table.
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
   * Admin views the customer list, optionally filtered by keyword (name or email) and location.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `items`, `total`, `offset`, `limit`.
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
   * Customer views their own booking statistics.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `statsForCustomer`.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
   * Recommend photographers to a customer based on `preferred_styles` and location.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `searchPhotographersForCustomer`.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
