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
import type { PhotographerEntity } from '@shared/database/entities/photographer.entity';
import { VerificationStatus } from '@shared/domain/values/photographer.values';
import type { UserEntity } from '@shared/database/entities/user.entity';
import {
  PhotographerApplication,
  PhotographerProfile,
} from './photographer.domain';
import { Rank } from './rank/rank.domain';
import { Badge } from './badge/badge.domain';
import { PhotographerRolePort } from './ports/photographer-role.port';
import { PhotographerRatingsPort } from './ports/photographer-ratings.port';
import {
  PhotographerSearchPort,
  PhotographerSearchFilter,
  PhotographerSearchResult,
} from '@modules/customer/ports/photographer-search.port';

/** Photographer profile operations: apply, approve, edit profiles, search, rank, and award badges. */
@Injectable()
export class PhotographerUseCases implements PhotographerSearchPort {
  constructor(
    private readonly roles: PhotographerRolePort,
    private readonly ratings: PhotographerRatingsPort,
  ) {}

  /**
   * A customer submits or resubmits an application after rejection; it enters `pending` for admin review.
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer actor making the request.
   * @param input Professional profile details: styles, location, description, tax ID, and years of experience.
   * @returns Photographer profile from the owner’s perspective; throws HTTP 409 if the application is pending or the user is already a photographer.
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
      styles: PhotographerProfile.normalizeStyles(input.styles),
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
   * An admin approves a photographer application: set it to `verified`, record the approver, assign the `photographer` role, and notify the applicant in real time.
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin actor; must have an `admins` record.
   * @param input Photographer profile ID.
   * @returns Photographer profile after approval; throws HTTP 409 if the profile is not pending.
   */
  async approve(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerApproveCommandInput,
  ) {
    const admin = await this.adminProfile(s, a),
      p = await this.lockedApplication(s, input.photographer_id);
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
   * An admin rejects a photographer application with a reason; the applicant may edit it and resubmit.
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin actor; must have an `admins` record.
   * @param input Photographer profile ID and rejection reason.
   * @returns Photographer profile after rejection; throws HTTP 409 if the profile is not pending.
   */
  async reject(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerRejectCommandInput,
  ) {
    const admin = await this.adminProfile(s, a),
      p = await this.lockedApplication(s, input.photographer_id);
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
   * Lock the photographer application row while it is under review so two admins cannot approve or reject it simultaneously.
   *
   * @param s EntityManager for the current transaction.
   * @param id Photographer profile ID.
   * @returns Photographer profile; throws HTTP 404 if it does not exist.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
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
   * Get the calling user's `admins` record (required for the `approved_by` column).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request.
   * @returns Admin record; throws HTTP 403 if the caller lacks the admin role or an admin profile.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async adminProfile(s: EntityManager, a: Actor) {
    role(a, 'admin');
    const u = await currentUser(s, a);
    const [admin] = await s.findBy(EntitySchemas.admins, { user_id: u.id });
    ensure(admin, 'Admin profile required', 'forbidden');
    return admin;
  }

  /**
   * Build the photographer profile returned by the API.
   *
   * @param s EntityManager for the current transaction.
   * @param id Photographer profile ID.
   * @param privateView `true` for the owner/admin view (all statuses, tax ID, and rejection reason included);
   * `false`: public view (only verified photographers with active accounts are shown; otherwise return 404).
   * @returns Photographer profile with rating, rank (`rank`: code and name), and earned badges (`badges`: code, name, and award date); the private view also includes `commission_percent`.
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
   * Build public profiles for multiple photographers at once. Fetch ratings, ranks, and badges in batches (the query count
   * does not grow with the number of photographers), while preserving the input order.
   *
   * @param s EntityManager for the current transaction.
   * @param pairs Photographer profiles and their owners, in the requested return order.
   * @returns One `{ profile, commissionPercent }` entry per photographer.
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
      const rank = Rank.of(rating.total_bookings, ranks);
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
   * A customer views a photographer's public profile (only approved photographers with active accounts are shown).
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param input Photographer profile ID.
   * @returns Public profile; throws HTTP 404 if the photographer is not public.
   */
  get(s: EntityManager, _a: Actor, input: Inputs.PhotographerGetQueryInput) {
    return this.details(s, input.photographer_id);
  }

  /**
   * A photographer views their own profile (all approval states, including tax ID, rejection reason, and commission percentage).
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @returns Photographer profile from the owner’s perspective.
   */
  async me(s: EntityManager, a: Actor) {
    return this.details(s, (await photographer(s, a)).id, true);
  }

  /**
   * A photographer edits their profile (description, styles, service areas, etc.). The tax ID is locked after approval.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input Fields to update.
   * @returns Updated profile; throws HTTP 400 if the tax ID changes after approval.
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
    const normalizedInput = { ...input };
    if (input.styles !== undefined)
      normalizedInput.styles = PhotographerProfile.normalizeStyles(
        input.styles,
      );
    if (Object.keys(normalizedInput).length)
      await updateEntity(s, EntitySchemas.photographers, p.id, normalizedInput);
    return this.details(s, p.id, true);
  }

  /**
   * A photographer enables or disables availability (`is_available`). When disabled, available slots are empty and no new bookings are accepted.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input `is_available`
   * @returns Updated profile.
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
   * A photographer updates their service areas.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param input New location.
   * @returns Updated profile.
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
   * Metrics used to evaluate badges: rating statistics and average punctuality from visible reviews.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Input statistics for `Badge.earned`.
   */
  private async badgeStats(s: EntityManager, photographerId: string) {
    const rating = (await this.ratings.ratingsOf(s, [photographerId]))[
      photographerId
    ];
    return {
      averageRating: rating.average_rating,
      averagePunctuality: await this.ratings.averagePunctuality(
        s,
        photographerId,
      ),
      visibleReviews: rating.total_feedbacks,
      returnCustomers: rating.return_customers,
    };
  }

  /**
   * Evaluate and award new badges to a photographer. Earned badges are permanent and are never revoked.
   * For each newly earned badge, record `earned_at` and send the photographer a real-time `photographer.badge_earned` notification.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Codes of the badges newly earned in this evaluation.
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
   * Daily job (role `system`): evaluate badges for every approved photographer.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have the `system` role.
   * @returns `{ checked, awarded }`: number of photographers evaluated and new badges awarded.
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
   * Photographer profile and its owning user, without filtering by status (for profile owners and admins).
   *
   * @param s EntityManager for the current transaction.
   * @param id Photographer profile ID.
   * @returns Photographer profile and user; throws HTTP 404 if either is missing.
   */
  private async owner(s: EntityManager, id: string) {
    const photographer = await required(s, 'photographers', id),
      user = await required(s, 'users', photographer.user_id);
    return { photographer, user };
  }

  /**
   * Customer photographer search: include only verified photographers with active accounts. Filter, sort, and paginate in the database.
   * Sort by available photographers first, then highest rating, and finally by ID for stable ordering.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param input Filters: `location`, `keyword` (name or style), `min_rating`, `limit`, and `offset`.
   * @returns `{ items, total, offset, limit }`
   * @param filter filter data of type PhotographerSearchFilter.
   */

  async searchPhotographersForCustomer(
    s: EntityManager,
    filter: PhotographerSearchFilter,
  ): Promise<PhotographerSearchResult> {
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 20;
    const contains = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
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

    if (filter.location) {
      query.andWhere('p.location ILIKE :location', {
        location: contains(filter.location),
      });
    }

    if (filter.styles && filter.styles.length > 0) {
      // `styles` is a JSONB array; `?|` checks whether it contains at least one style.
      query.andWhere('p.styles ?| ARRAY[:...styles]', {
        styles: filter.styles,
      });
    }

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
    if (!ids.length) return { items: [], total, offset, limit };

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
      const photographer = found.get(id)!,
        user = users.get(photographer.user_id)!;
      return { photographer, user };
    });
    const items = (await this.profiles(s, pairs)).map((x) => x.profile);
    return { items, total, offset, limit };
  }

  /**
   * Search photographers by keyword, location, and the supplied filters.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Actor passed through the interface; unused by this code path.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `items`, `total`, `offset`, `limit`.
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
    // This part may need reconsideration (location calculation).
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
      const photographer = found.get(id)!,
        user = users.get(photographer.user_id)!;
      return { photographer, user };
    });
    const items = (await this.profiles(s, pairs)).map((x) => x.profile);
    return { items, total, offset, limit };
  }

  /**
   * Featured photographer list, using the same ordering as search (available first, then highest rating).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request.
   * @param input Filters and pagination options.
   * @returns `{ items, total, offset, limit }`
   */
  top(s: EntityManager, a: Actor, input: Inputs.PhotographerTopQueryInput) {
    return this.search(s, a, input);
  }

  /**
   * Admin photographer profile list, with an optional approval-status filter (for example, `pending` to view the review queue).
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin actor making the request.
   * @param input Filter by `verification_status`, `limit`, and `offset`.
   * @returns `{ items, total, limit, offset }`, oldest profiles first.
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
