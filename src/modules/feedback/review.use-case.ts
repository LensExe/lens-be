import { In, type EntityManager } from 'typeorm';
import type { PhotographerRatingEntity } from '@shared/database/entities/photographer-rating.entity';
import {
  ReviewStatus,
  type FeedbackEntity,
} from '@shared/database/entities/feedback.entity';
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

/** Nghiệp vụ review: viết, sửa, ẩn / hiện lại, thợ trả lời, điểm tổng của thợ. */
@Injectable()
export class ReviewUseCases implements RatingUpdaterPort {
  /**
   * Khách của booking viết review sau khi booking hoàn tất (mỗi booking một review); tính lại điểm
   * review của thợ và báo thợ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách của booking)
   * @param i ID booking, điểm tổng / đúng giờ / thái độ, bình luận
   * @returns Review vừa tạo; 409 nếu booking chưa hoàn tất hoặc đã có review
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
   * Review đang hiện của một thợ, mới trước, phân trang bằng SQL. Thợ chưa duyệt / bị khoá thì 404.
   * Chỉ trả phần người ngoài được xem: điểm, bình luận, trả lời, tên và ảnh đại diện của khách; không
   * trả ID khách / booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param _a Người đang gọi API (không dùng; API public)
   * @param i ID hồ sơ thợ, `limit`, `offset`
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
   * Admin xem mọi review (kể cả đã xoá / bị ẩn), lọc theo trạng thái và thợ, mới trước, phân trang
   * bằng SQL. Dùng để tìm review cần ẩn hoặc hiện lại.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param i `status`, `photographer_id`, `limit`, `offset`
   * @returns `{ items, total, offset, limit }`, mỗi item là bản ghi review đầy đủ
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
   * Đổi một trang review sang bản public, lấy tên và ảnh đại diện của khách bằng hai query cho cả
   * trang (không query theo từng review).
   *
   * @param s EntityManager của transaction hiện tại
   * @param rows Các review của trang
   * @returns Review bản public, giữ nguyên thứ tự
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
      .andWhere('f.status = :visible', { visible: ReviewStatus.VISIBLE })
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
   * Người viết sửa review đang hiện trong 7 ngày, đánh dấu đã sửa, tính lại điểm review của thợ và
   * báo thợ (câu trả lời cũ của thợ giữ nguyên, thợ tự sửa nếu muốn).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách đã viết)
   * @param i ID review và các trường cần đổi
   * @returns Review sau khi sửa; 400 nếu không có trường nào, 409 nếu review không còn hiện hoặc đã
   * quá 7 ngày
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
   * Người viết tự xoá review (xoá mềm); review đã xoá không tính vào điểm và không hiện lại được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách đã viết)
   * @param i ID review
   * @returns `{ deleted: true }`; 409 nếu review đã xoá
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
   * Thợ của booking trả lời review đang hiện; trả lời lại thì ghi đè và cập nhật `replied_at`.
   * Báo realtime cho khách.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ của booking)
   * @param i ID review và nội dung trả lời
   * @returns Review sau khi trả lời; 403 nếu không phải thợ của booking, 409 nếu review không còn hiện
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
   * Admin ẩn review đang hiện kèm lý do, tính lại điểm của thợ và báo khách đã viết.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param i ID review và lý do ẩn
   * @returns Review sau khi ẩn; 409 nếu review không đang hiện
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
   * Admin hiện lại review do admin ẩn (xoá lý do ẩn) và tính lại điểm của thợ. Review khách tự xoá
   * không hiện lại được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param i ID review
   * @returns Review sau khi hiện lại; 409 nếu review không do admin ẩn
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
   * Đọc review và khoá dòng đến hết transaction, để hai lệnh đổi cùng một review (sửa và xoá, trả lời
   * và ẩn...) chạy lần lượt và lệnh sau thấy trạng thái lệnh trước đã ghi.
   *
   * @param s EntityManager của transaction hiện tại
   * @param id ID review
   * @returns Review đã khoá; 404 nếu không có
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
   * Chỉ khách đã viết review được sửa / xoá nó. So bằng `customer_id` lưu trên review, không phải
   * đọc booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor đang gọi
   * @param r Review cần đổi
   * @returns Không trả gì; 403 nếu người gọi không phải khách đã viết
   */
  private async requireAuthor(s: EntityManager, a: Actor, r: FeedbackEntity) {
    const user = await currentUser(s, a);
    const [c] = await s.findBy(EntitySchemas.customers, { user_id: user.id });
    ensure(c?.id === r.customer_id, 'Review access denied', 'forbidden');
  }

  /**
   * Rating tổng hợp của nhiều thợ trong một query. Module photographer gọi qua port để hiện điểm
   * trên hồ sơ và xét huy hiệu, thay vì đọc thẳng bảng `photographer_ratings`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerIds ID hồ sơ các thợ
   * @returns Map ID thợ → bản ghi rating, `null` nếu thợ chưa có rating
   */
  async ratingsOf(s: EntityManager, photographerIds: readonly string[]) {
    const ratings: Record<string, PhotographerRatingEntity | null> =
      Object.fromEntries(photographerIds.map((id) => [id, null]));
    if (!photographerIds.length) return ratings;
    for (const r of await s.findBy(EntitySchemas.photographer_ratings, {
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
      .select('AVG(f.punctuality_rating)', 'punctuality')
      .where('f.photographer_id = :photographerId', { photographerId })
      .andWhere('f.status = :visible', { visible: ReviewStatus.VISIBLE })
      .getRawOne<{ punctuality: string | null }>();
    return Number(row?.punctuality ?? 0);
  }

  /**
   * Tạo dòng rating rỗng (điểm 0) cho thợ mới, để hồ sơ luôn có đối tượng rating. Gọi lại khi đã có
   * thì không làm gì. Module photographer gọi qua port lúc tạo hồ sơ, thay vì ghi thẳng bảng `photographer_ratings`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Không trả gì
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
    await this.lockRating(s, photographerId);
    await this.writeRating(s, photographerId, {
      total_bookings: stats.completedBookings,
      return_customers: stats.returnCustomers,
    });
  }

  /**
   * Tạo dòng rating nếu chưa có rồi khoá nó đến hết transaction, để hai lần ghi rating của cùng một
   * thợ (review đổi, booking hoàn tất) chạy lần lượt.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns Không trả gì
   */
  private async lockRating(s: EntityManager, photographerId: string) {
    await this.openRating(s, photographerId);
    await s.findOne(EntitySchemas.photographer_ratings, {
      where: { photographer_id: photographerId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Ghi các cột rating đã tính của thợ và cập nhật `updated_at`. Gọi sau `lockRating`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param values Các cột cần ghi
   * @returns Không trả gì
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
