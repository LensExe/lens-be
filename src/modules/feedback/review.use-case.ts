import { In, type EntityManager } from 'typeorm';
import type { RatingEntity } from '@shared/database/entities/rating.entity';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Review } from './review.domain';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  emit,
  paged,
  pageWindow,
  publicPhotographer,
  required,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';

@Injectable()
export class ReviewUseCases implements RatingUpdaterPort {
  async recalculate(s: EntityManager, pid: string) {
    const bookings = await s.findBy(EntitySchemas.bookings, {
        photographer_id: pid,
      }),
      ids = new Set(bookings.map((x) => x.id));
    const reviews = (
      await s.findBy(EntitySchemas.feedbacks, { is_visible: true })
    ).filter((r) => ids.has(r.booking_id));
    const completed = bookings.filter((b) => b.status === 'completed'),
      counts = new Map<string, number>();
    for (const b of completed)
      counts.set(b.customer_id, (counts.get(b.customer_id) ?? 0) + 1);
    const summary = Review.summary(reviews.map((r) => r.rating));
    const values = {
      average_rating: summary.average_rating,
      total_feedbacks: summary.total_feedbacks,
      total_bookings: completed.length,
      return_customers: [...counts.values()].filter((n) => n > 1).length,
    };
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: pid,
    });
    if (rating) await updateEntity(s, EntitySchemas.ratings, rating.id, values);
    else
      await s.save(EntitySchemas.ratings, { photographer_id: pid, ...values });
  }

  async create(s: EntityManager, a: Actor, i: Inputs.ReviewCreateCommandInput) {
    const { id, ...values } = i,
      { booking: b } = await bookingAccess(s, a, id, 'customer');
    Review.requireCompletedBooking(b.status);
    const r = await s.save(EntitySchemas.feedbacks, {
      ...values,
      booking_id: b.id,
      customer_id: b.customer_id,
      photographer_id: b.photographer_id,
    });
    await this.refreshReviewStats(s, b.photographer_id);
    const p = await required(s, 'photographers', b.photographer_id);
    await emit(s, 'review.created', [p.user_id], {
      review_id: r.id,
      booking_id: b.id,
      rating: r.rating,
    });
    return r;
  }

  /**
   * Review đang hiện của một thợ, mới trước, phân trang bằng SQL. Thợ chưa duyệt / bị khoá thì 404.
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param i ID hồ sơ thợ, `limit`, `offset`
   * @returns `{ items, total, offset, limit }`
   */
  async list(s: EntityManager, _a: Actor, i: Inputs.ReviewListQueryInput) {
    const { photographer: p } = await publicPhotographer(s, i.id);
    const { offset, limit } = pageWindow(i);
    const [items, total] = await s.findAndCount(EntitySchemas.feedbacks, {
      where: { photographer_id: p.id, is_visible: true },
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(items, total, i);
  }

  /**
   * Tổng điểm public của thợ: trung bình điểm tổng và phân bố 1–5 của review đang hiện, gom bằng SQL.
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param i ID hồ sơ thợ
   * @returns `{ average_rating, total_feedbacks, distribution }`; 404 nếu thợ không public
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
   * Số review đang hiện của thợ theo từng mức điểm.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Mỗi mức điểm có review và số lượng
   */
  private async ratingCounts(s: EntityManager, photographerId: string) {
    const rows = await s
      .createQueryBuilder(EntitySchemas.feedbacks, 'f')
      .select('f.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('f.photographer_id = :photographerId', { photographerId })
      .andWhere('f.is_visible = true')
      .groupBy('f.rating')
      .getRawMany<{ rating: number; count: string }>();
    return rows.map((row) => ({
      rating: Number(row.rating),
      count: Number(row.count),
    }));
  }

  /**
   * Tính lại phần điểm review trong rating của thợ (trung bình, số review đang hiện). Khoá dòng
   * rating trước khi đếm để hai thay đổi review cùng lúc không ghi đè nhau.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Không trả gì
   */
  private async refreshReviewStats(s: EntityManager, photographerId: string) {
    await this.openRating(s, photographerId);
    await s.findOne(EntitySchemas.ratings, {
      where: { photographer_id: photographerId },
      lock: { mode: 'pessimistic_write' },
    });
    const summary = Review.summaryFromCounts(
      await this.ratingCounts(s, photographerId),
    );
    await s.update(
      EntitySchemas.ratings,
      { photographer_id: photographerId },
      {
        average_rating: summary.average_rating,
        total_feedbacks: summary.total_feedbacks,
        updated_at: new Date().toISOString(),
      },
    );
  }

  async update(s: EntityManager, a: Actor, i: Inputs.ReviewUpdateCommandInput) {
    const { id, ...fields } = i,
      r = await required(s, 'feedbacks', id),
      { booking: b } = await bookingAccess(s, a, r.booking_id, 'customer');
    Review.requireEditWindow(r.created_at);
    const result = await updateEntity(s, EntitySchemas.feedbacks, id, {
      ...fields,
      is_edited: true,
    });
    await this.refreshReviewStats(s, b.photographer_id);
    return result;
  }

  async remove(s: EntityManager, a: Actor, i: Inputs.ReviewRemoveCommandInput) {
    await currentUser(s, a);
    const r = await required(s, 'feedbacks', i.id),
      { booking: b } = await bookingAccess(
        s,
        a,
        r.booking_id,
        a.roles.includes('admin') ? undefined : 'customer',
      );
    await updateEntity(s, EntitySchemas.feedbacks, r.id, { is_visible: false });
    await this.refreshReviewStats(s, b.photographer_id);
    return { deleted: true };
  }

  /**
   * Thợ của booking trả lời review đang hiện; trả lời lại thì ghi đè và cập nhật `replied_at`.
   * Báo realtime cho khách.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ của booking)
   * @param i ID review và nội dung trả lời
   * @returns Review sau khi trả lời; 403 nếu không phải thợ của booking, 409 nếu review đang ẩn
   */
  async reply(s: EntityManager, a: Actor, i: Inputs.ReviewReplyCommandInput) {
    const r = await required(s, 'feedbacks', i.id),
      { customer } = await bookingAccess(s, a, r.booking_id, 'photographer');
    Review.requireVisible(r.is_visible);
    const row = await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      photographer_reply: i.reply,
      replied_at: new Date().toISOString(),
    });
    await emit(s, 'review.replied', [customer.user_id], {
      review_id: r.id,
      booking_id: r.booking_id,
    });
    return row;
  }

  /**
   * Admin hiện lại review đã ẩn và tính lại điểm của thợ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param i ID review
   * @returns Review sau khi hiện lại; 409 nếu review đang hiện
   */
  async restore(
    s: EntityManager,
    a: Actor,
    i: Inputs.ReviewRestoreCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const r = await required(s, 'feedbacks', i.id);
    ensure(!r.is_visible, 'Review is already visible', 'conflict');
    const row = await updateEntity(s, EntitySchemas.feedbacks, r.id, {
      is_visible: true,
    });
    await this.refreshReviewStats(s, r.photographer_id);
    return row;
  }

  /**
   * Rating tổng hợp của nhiều thợ trong một query. Module photographer gọi qua port để hiện điểm
   * trên hồ sơ và xét huy hiệu, thay vì đọc thẳng bảng `ratings`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerIds ID hồ sơ các thợ
   * @returns Map ID thợ → bản ghi rating, `null` nếu thợ chưa có rating
   */
  async ratingsOf(s: EntityManager, photographerIds: readonly string[]) {
    const ratings: Record<string, RatingEntity | null> = Object.fromEntries(
      photographerIds.map((id) => [id, null]),
    );
    if (!photographerIds.length) return ratings;
    for (const r of await s.findBy(EntitySchemas.ratings, {
      photographer_id: In([...photographerIds]),
    }))
      ratings[r.photographer_id] = r;
    return ratings;
  }

  /**
   * Điểm đúng giờ trung bình của thợ, chỉ tính review đang hiện. Module photographer gọi qua port
   * để xét huy hiệu đúng giờ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Điểm trung bình, 0 nếu chưa có review
   */
  async averagePunctuality(s: EntityManager, photographerId: string) {
    const row = await s
      .createQueryBuilder(EntitySchemas.feedbacks, 'f')
      .innerJoin(EntitySchemas.bookings, 'b', 'b.id = f.booking_id')
      .select('AVG(f.punctuality_rating)', 'punctuality')
      .where('b.photographer_id = :photographerId', { photographerId })
      .andWhere('f.is_visible = true')
      .getRawOne<{ punctuality: string | null }>();
    return Number(row?.punctuality ?? 0);
  }

  /**
   * Tạo dòng rating rỗng (điểm 0) cho thợ mới, để hồ sơ luôn có đối tượng rating. Gọi lại khi đã có
   * thì không làm gì. Module photographer gọi qua port lúc tạo hồ sơ, thay vì ghi thẳng bảng `ratings`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Không trả gì
   */
  async openRating(s: EntityManager, photographerId: string) {
    const [existing] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: photographerId,
    });
    if (!existing)
      await s.save(EntitySchemas.ratings, { photographer_id: photographerId });
  }

  /**
   * Ghi phần số liệu booking trong rating của thợ (số booking hoàn tất, số khách quay lại).
   * Module booking tự đếm trên bảng của mình rồi gọi qua port khi có booking hoàn tất, nên feedback
   * không phải đọc bảng `bookings`. Chỉ đổi hai cột này, khoá dòng rating trước khi ghi.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param stats `completedBookings`, `returnCustomers`
   * @returns Không trả gì
   */
  async recordBookingStats(
    s: EntityManager,
    photographerId: string,
    stats: { completedBookings: number; returnCustomers: number },
  ) {
    await this.openRating(s, photographerId);
    await s.findOne(EntitySchemas.ratings, {
      where: { photographer_id: photographerId },
      lock: { mode: 'pessimistic_write' },
    });
    await s.update(
      EntitySchemas.ratings,
      { photographer_id: photographerId },
      {
        total_bookings: stats.completedBookings,
        return_customers: stats.returnCustomers,
        updated_at: new Date().toISOString(),
      },
    );
  }
}
