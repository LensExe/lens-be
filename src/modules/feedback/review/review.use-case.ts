import { In, type EntityManager } from 'typeorm';
import type { PhotographerRatingEntity } from '@shared/database/entities/photographer-rating.entity';
import type { FeedbackEntity } from '@shared/database/entities/feedback.entity';
import { ReviewStatus } from '@shared/domain/values/review.values';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Review } from './review.domain';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  photographer,
  emit,
  paged,
  pageWindow,
  publicPhotographer,
  required,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';
import type { PhotographerRatingStats } from '@modules/photographer/ports/photographer-ratings.port';

/** Review business operations: submit, edit, hide or restore, photographer replies, and photographer aggregate ratings. */
@Injectable()
export class ReviewUseCases implements RatingUpdaterPort {
  /**
   * A customer reviews a booking after it is completed (one review per booking); the photographer's review score is recalculated
   * and the photographer is notified.
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer actor for the booking.
   * @param i Booking ID, overall score, punctuality score, attitude score, and comment.
   * @returns Review just created; throws HTTP 409 if the booking is incomplete or already has a review.
   */
  async create(s: EntityManager, a: Actor, i: Inputs.ReviewCreateCommandInput) {
    const { id, ...values } = i,
      { booking: b, photographer: p } = await bookingAccess(
        s,
        a,
        id,
        'customer',
      );
    Review.requireCompletedBooking(b.status);
    const r = await s.save(EntitySchemas.feedbacks, {
      ...values,
      booking_id: b.id,
      customer_id: b.customer_id,
      photographer_id: b.photographer_id,
    });
    await this.refreshReviewStats(s, b.photographer_id);
    await emit(s, 'review.created', [p.user_id], {
      review_id: r.id,
      booking_id: b.id,
      rating: r.rating,
    });
    return r;
  }

  /**
   * Visible reviews for a photographer, newest first, paginated in SQL. Unapproved or locked photographers receive a 404.
   * Return only publicly visible fields: rating, comment, reply, and the customer's name and avatar; do not
   * return customer or booking IDs.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param i Photographer profile ID, `limit`, and `offset`.
   * @returns `{ items, total, offset, limit }`
   */
  async list(s: EntityManager, _a: Actor, i: Inputs.ReviewListQueryInput) {
    const { photographer: p } = await publicPhotographer(s, i.id);
    const { offset, limit } = pageWindow(i);
    const [rows, total] = await s.findAndCount(EntitySchemas.feedbacks, {
      where: { photographer_id: p.id, status: ReviewStatus.VISIBLE },
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(await this.publicReviews(s, rows), total, i);
  }

  /**
   * Admins can view all reviews (including deleted or hidden ones), filter by status and photographer, sort newest first, and paginate
   * in SQL. Use this to find reviews that need to be hidden or restored.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor (admin)
   * @param i `status`, `photographer_id`, `limit`, `offset`
   * @returns `{ items, total, offset, limit }`, where each item is a full review record.
   */
  async adminList(
    s: EntityManager,
    a: Actor,
    i: Inputs.ReviewAdminListQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const { offset, limit } = pageWindow(i);
    const [items, total] = await s.findAndCount(EntitySchemas.feedbacks, {
      where: {
        ...(i.status ? { status: i.status } : {}),
        ...(i.photographer_id ? { photographer_id: i.photographer_id } : {}),
      },
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(items, total, i);
  }

  /**
   * Convert a page of reviews to the public response format, fetching customer names and avatars with two queries for the entire
   * page instead of querying once per review.
   *
   * @param s EntityManager for the current transaction.
   * @param rows Reviews for the current page.
   * @returns Public review records in their original order.
   */
  private async publicReviews(s: EntityManager, rows: FeedbackEntity[]) {
    if (!rows.length) return [];
    const customers = await s.findBy(EntitySchemas.customers, {
      id: In([...new Set(rows.map((r) => r.customer_id))]),
    });
    const users = await s.findBy(EntitySchemas.users, {
      id: In([...new Set(customers.map((c) => c.user_id))]),
    });
    const userOf = new Map(
      customers.map((c) => [c.id, users.find((u) => u.id === c.user_id)]),
    );
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      punctuality_rating: r.punctuality_rating,
      attitude_rating: r.attitude_rating,
      comment: r.comment,
      is_edited: r.is_edited,
      photographer_reply: r.photographer_reply,
      replied_at: r.replied_at,
      created_at: r.created_at,
      customer: {
        name: userOf.get(r.customer_id)?.fullname ?? '',
        avatar_url: userOf.get(r.customer_id)?.avatar_url ?? null,
      },
    }));
  }

  /**
   * A photographer's public rating: the average overall score and distribution of ratings from 1 to 5 across visible reviews, aggregated in SQL.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param i Photographer profile ID.
   * @returns `{ average_rating, total_feedbacks, distribution }`; throws HTTP 404 if the photographer is not public.
   */
  async summary(
    s: EntityManager,
    _a: Actor,
    i: Inputs.ReviewSummaryQueryInput,
  ) {
    const { photographer: p } = await publicPhotographer(s, i.id);
    return Review.summaryFromCounts(await this.ratingCounts(s, p.id));
  }

  /**
   * Number of visible reviews for the photographer at each rating level.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Number of reviews at each score.
   */
  private async ratingCounts(s: EntityManager, photographerId: string) {
    const rows = await s
      .createQueryBuilder(EntitySchemas.feedbacks, 'f')
      .select('f.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('f.photographer_id = :photographerId', { photographerId })
      .andWhere('f.status = :visible', { visible: ReviewStatus.VISIBLE })
      .groupBy('f.rating')
      .getRawMany<{ rating: number; count: string }>();
    return rows.map((row) => ({
      rating: Number(row.rating),
      count: Number(row.count),
    }));
  }

  /**
   * Recalculate the review portion of a photographer's rating (average and number of visible reviews). Lock the rating row
   * before counting so concurrent review changes cannot overwrite one another.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Returns no value.
   */
  private async refreshReviewStats(s: EntityManager, photographerId: string) {
    await this.lockRating(s, photographerId);
    const summary = Review.summaryFromCounts(
      await this.ratingCounts(s, photographerId),
    );
    await this.writeRating(s, photographerId, {
      average_rating: summary.average_rating,
      total_feedbacks: summary.total_feedbacks,
    });
  }

  /**
   * The author edits a visible review within 7 days; mark it as edited, recalculate the photographer's review score,
   * and notify the photographer. The photographer's existing reply is kept; they can edit it separately if needed.
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer who wrote the review.
   * @param i Review ID and fields to update.
   * @returns Updated review; throws HTTP 400 if no fields were supplied, or HTTP 409 if the review is no longer visible or has already been edited.
   * after 7 days
   */
  async update(s: EntityManager, a: Actor, i: Inputs.ReviewUpdateCommandInput) {
    const { id, ...fields } = i,
      r = await this.lockedReview(s, id);
    await this.requireAuthor(s, a, r);
    Review.requireVisible(r.status);
    Review.requireEditWindow(r.created_at);
    Review.requireChanges(fields);
    const result = await updateEntity(s, EntitySchemas.feedbacks, id, {
      ...fields,
      is_edited: true,
    });
    await this.refreshReviewStats(s, r.photographer_id);
    const p = await required(s, 'photographers', r.photographer_id);
    await emit(s, 'review.updated', [p.user_id], {
      review_id: r.id,
      booking_id: r.booking_id,
      rating: result.rating,
    });
    return result;
  }

  /**
   * The author soft-deletes their own review; deleted reviews are excluded from ratings and cannot be restored.
   *
   * @param s EntityManager for the current transaction.
   * @param a Customer who wrote the review.
   * @param i ID review
   * @returns `{ deleted: true }`; throws HTTP 409 if the review was already deleted.
   */
  async remove(s: EntityManager, a: Actor, i: Inputs.ReviewRemoveCommandInput) {
    const r = await this.lockedReview(s, i.id);
    await this.requireAuthor(s, a, r);
    await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      status: Review.nextStatus('delete', r.status),
    });
    await this.refreshReviewStats(s, r.photographer_id);
    return { deleted: true };
  }

  /**
   * The photographer assigned to the booking replies to a visible review; a new reply replaces the previous one and updates `replied_at`.
   * Send a real-time notification to the customer.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer actor for the booking.
   * @param i Review ID and reply content.
   * @returns Review after the reply; throws HTTP 403 if the caller is not the booking photographer, or HTTP 409 if the review is no longer visible.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async reply(s: EntityManager, a: Actor, i: Inputs.ReviewReplyCommandInput) {
    const r = await this.lockedReview(s, i.id);
    ensure(
      (await photographer(s, a)).id === r.photographer_id,
      'Review access denied',
      'forbidden',
    );
    Review.requireVisible(r.status);
    const row = await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      photographer_reply: i.reply,
      replied_at: new Date().toISOString(),
    });
    const c = await required(s, 'customers', r.customer_id);
    await emit(s, 'review.replied', [c.user_id], {
      review_id: r.id,
      booking_id: r.booking_id,
    });
    return row;
  }

  /**
   * An admin hides a visible review with a reason, recalculates the photographer's rating, and notifies the author.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor (admin)
   * @param i Review ID and reason for hiding it.
   * @returns Review after hiding; throws HTTP 409 if the review is not currently visible.
   */
  async hide(s: EntityManager, a: Actor, i: Inputs.ReviewHideCommandInput) {
    role(a, 'admin');
    await currentUser(s, a);
    const r = await this.lockedReview(s, i.id);
    const row = await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      status: Review.nextStatus('hide', r.status),
      hidden_reason: i.reason,
    });
    await this.refreshReviewStats(s, r.photographer_id);
    const c = await required(s, 'customers', r.customer_id);
    await emit(s, 'review.hidden', [c.user_id], {
      review_id: r.id,
      booking_id: r.booking_id,
      reason: i.reason,
    });
    return row;
  }

  /**
   * An admin restores a review hidden by an admin (clearing the hide reason) and recalculates the photographer's rating. A review deleted by its customer
   * cannot be restored.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor (admin)
   * @param i ID review
   * @returns Review after restoring visibility; throws HTTP 409 if it was not hidden by an admin.
   */
  async restore(
    s: EntityManager,
    a: Actor,
    i: Inputs.ReviewRestoreCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const r = await this.lockedReview(s, i.id);
    const row = await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      status: Review.nextStatus('restore', r.status),
      hidden_reason: null,
    });
    await this.refreshReviewStats(s, r.photographer_id);
    return row;
  }

  /**
   * Read the review and lock its row until the transaction ends, so concurrent operations on the same review (edit and delete, reply
   * and hide, etc.) run sequentially, and each operation sees the state written by the previous one.
   *
   * @param s EntityManager for the current transaction.
   * @param id ID review
   * @returns Locked review; throws HTTP 404 if it does not exist.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  private async lockedReview(s: EntityManager, id: string) {
    const r = await s.findOne(EntitySchemas.feedbacks, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(r, 'feedbacks not found', 'missing');
    return r;
  }

  /**
   * Only the customer who wrote a review may edit or delete it. Compare the `customer_id` stored on the review instead of
   * reading the booking.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request.
   * @param r Review to transition.
   * @returns Returns no value; throws HTTP 403 if the caller did not write the review.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async requireAuthor(s: EntityManager, a: Actor, r: FeedbackEntity) {
    const user = await currentUser(s, a);
    const [c] = await s.findBy(EntitySchemas.customers, { user_id: user.id });
    ensure(c?.id === r.customer_id, 'Review access denied', 'forbidden');
  }

  /**
   * Retrieve rating statistics for multiple photographers in one query. The photographer module calls this port to display scores
   * on profiles and evaluate ranks and badges, rather than reading the `photographer_ratings` table directly.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerIds Photographer profile IDs.
   * @returns Map from photographer ID to statistics; all values are zero when a photographer has no rating record.
   */
  async ratingsOf(
    s: EntityManager,
    photographerIds: readonly string[],
  ): Promise<Record<string, PhotographerRatingStats>> {
    const rows = photographerIds.length
      ? await s.findBy(EntitySchemas.photographer_ratings, {
          photographer_id: In([...photographerIds]),
        })
      : [];
    return Object.fromEntries(
      photographerIds.map((id) => {
        const r = rows.find((row) => row.photographer_id === id);
        return [
          id,
          {
            average_rating: r?.average_rating ?? 0,
            total_feedbacks: r?.total_feedbacks ?? 0,
            total_bookings: r?.total_bookings ?? 0,
            return_customers: r?.return_customers ?? 0,
          },
        ];
      }),
    );
  }

  /**
   * A photographer's average punctuality score, based only on visible reviews. The photographer module calls this port
   * to evaluate the punctuality badge.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Average score, or 0 if there are no reviews.
   */
  async averagePunctuality(s: EntityManager, photographerId: string) {
    const row = await s
      .createQueryBuilder(EntitySchemas.feedbacks, 'f')
      .select('AVG(f.punctuality_rating)', 'punctuality')
      .where('f.photographer_id = :photographerId', { photographerId })
      .andWhere('f.status = :visible', { visible: ReviewStatus.VISIBLE })
      .getRawOne<{ punctuality: string | null }>();
    return Number(row?.punctuality ?? 0);
  }

  /**
   * Create an empty rating row (score 0) for a new photographer so their profile always has a rating record. If a rating row already exists,
   * do nothing. The photographer module calls this port when creating a profile instead of writing directly to `photographer_ratings`.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Returns no value.
   */
  async openRating(s: EntityManager, photographerId: string) {
    const [existing] = await s.findBy(EntitySchemas.photographer_ratings, {
      photographer_id: photographerId,
    });
    if (!existing)
      await s.save(EntitySchemas.photographer_ratings, {
        photographer_id: photographerId,
      });
  }

  /**
   * Write booking metrics to the photographer's rating (completed booking count and returning customer count).
   * The booking module counts these in its own tables and calls this port when a booking is completed, so the feedback module
   * does not need to read the `bookings` table. Update only these two columns, locking the rating row before writing.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param stats `completedBookings`, `returnCustomers`
   * @returns Returns no value.
   */
  async recordBookingStats(
    s: EntityManager,
    photographerId: string,
    stats: { completedBookings: number; returnCustomers: number },
  ) {
    await this.lockRating(s, photographerId);
    await this.writeRating(s, photographerId, {
      total_bookings: stats.completedBookings,
      return_customers: stats.returnCustomers,
    });
  }

  /**
   * Create the rating row if needed, then lock it until the transaction ends so two rating updates for the same
   * photographer (a review change and a booking completion) run sequentially.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @returns Returns no value.
   */
  private async lockRating(s: EntityManager, photographerId: string) {
    await this.openRating(s, photographerId);
    await s.findOne(EntitySchemas.photographer_ratings, {
      where: { photographer_id: photographerId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Write the photographer's calculated rating fields and update `updated_at`. Call this after `lockRating`.
   *
   * @param s EntityManager for the current transaction.
   * @param photographerId Photographer profile ID.
   * @param values Columns to write.
   * @returns Returns no value.
   */
  private async writeRating(
    s: EntityManager,
    photographerId: string,
    values: Partial<
      Pick<
        PhotographerRatingEntity,
        | 'average_rating'
        | 'total_feedbacks'
        | 'total_bookings'
        | 'return_customers'
      >
    >,
  ) {
    await s.update(
      EntitySchemas.photographer_ratings,
      { photographer_id: photographerId },
      { ...values, updated_at: new Date().toISOString() },
    );
  }
}
