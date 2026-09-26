import {
  In,
  type SelectQueryBuilder,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { EntitySchemas, overlapWhere, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  photographer as ownPhotographer,
  publicPhotographer,
  required,
  bookingAccess,
  emit,
  paged,
  pageWindow,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { WorkSchedule, type WorkingShift } from '@shared/domain/work-schedule';
import { RatingUpdaterPort } from './ports/rating-updater.port';
import { PaidAmountsPort } from './ports/paid-amounts.port';
import type { PendingBookingsPort } from '@modules/calendar/ports/pending-bookings.port';
import {
  Booking,
  BookingActorRole,
  BookingStatus,
  OCCUPIED_BOOKING_STATUSES,
  type BookingAction,
} from './booking.domain';
import {
  BookingCollaboratorStatus,
  Collaboration,
  type CollaborationAction,
} from './collaborator.domain';
import type {
  BookingCollaboratorEntity,
  BookingEntity,
} from '@shared/database/entities';

/** Số booking mỗi trang khi job duyệt danh sách tới hạn, và số trang tối đa mỗi lần chạy. */
const JOB_BATCH_SIZE = 100;
const JOB_MAX_PAGES = 10;

/** Lý do ghi khi booking bị huỷ vì khách không trả cọc kịp. */
const UNPAID_REASON = 'Deposit not paid in time';

/** Lý do ghi khi yêu cầu pending hết hạn vì thợ không trả lời kịp. */
const EXPIRED_REASON = 'Photographer did not respond in time';

/** Lý do ghi cho các yêu cầu pending bị từ chối tự động khi thợ nhận một booking chồng giờ. */
const TURNED_DOWN_REASON = 'Photographer accepted another booking at this time';

/** Bên thực hiện ghi vào lịch sử; `userId` là `null` khi job nền (`role = 'system'`). */
type HistoryActor = { role: BookingActorRole; userId: string | null };

/** Bên của booking được làm hành động (không có trong bảng ⇒ khách, thợ hoặc admin/system). */
const ACTION_SIDE: Partial<Record<BookingAction, 'customer' | 'photographer'>> =
  {
    reject: 'photographer',
    start: 'photographer',
    completeShoot: 'photographer',
    confirmReceipt: 'customer',
  };

@Injectable()
export class BookingUseCases implements PendingBookingsPort {
  constructor(
    private readonly reviews: RatingUpdaterPort,
    private readonly payments: PaidAmountsPort,
  ) {}

  /**
   * Khách đặt lịch với thợ theo một gói chụp. Khoá dòng thợ để không đua với lúc thợ nhận booking
   * hoặc chặn lịch (hai việc đó đọc danh sách yêu cầu chồng giờ để từ chối).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách, phải có hồ sơ customer)
   * @param input Thợ, gói, địa điểm, khoảng giờ `from`–`to`
   * @returns Booking `pending`; 404 thợ chưa duyệt, 400 sai thời lượng, 409 ngoài ca làm / trùng lịch
   */
  async create(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCreateCommandInput,
  ) {
    role(a, 'customer');
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id });
    ensure(c, 'Customer profile required', 'forbidden');

    const p = await s.findOne(EntitySchemas.photographers, {
      where: { id: input.photographer_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(p, 'photographers not found', 'missing');

    const pu = await required(s, 'users', p.user_id),
      plan = await required(s, 'booking_plans', input.plan_id);

    const schedule = await s.findBy(EntitySchemas.working_hours, {
      photographer_id: p.id,
    });

    const blockedTimes = await s.findBy(
      EntitySchemas.offline_slots,
      overlapWhere(p.id, input),
    );

    const bookings = [
      ...(await s.findBy(EntitySchemas.bookings, overlapWhere(p.id, input))),
      ...(await this.collaborationTimes(s, p.id, input)),
    ];

    const draft = Booking.prepare({
      customerId: c.id,
      customerUserId: u.id,
      photographerId: p.id,
      photographerUserId: p.user_id,
      photographerStatus: pu.status,
      photographerVerified: p.verification_status === 'verified',
      photographerAvailable: p.is_available,
      planId: plan.id,
      planPhotographerId: plan.photographer_id,
      planActive: plan.is_active,
      planPrice: Number(plan.price),
      planDurationMinutes: plan.duration_minutes,
      location: input.location,
      from: input.from,
      to: input.to,
      schedule,
      blockedTimes,
      bookings,
      openRequestsWithPhotographer: await s.countBy(EntitySchemas.bookings, {
        customer_id: c.id,
        photographer_id: p.id,
        status: BookingStatus.PENDING,
      }),
      openRequests: await s.countBy(EntitySchemas.bookings, {
        customer_id: c.id,
        status: BookingStatus.PENDING,
      }),
      now: Date.now(),
    });

    const booking = await s.save(EntitySchemas.bookings, draft);
    await this.recordHistory(
      s,
      booking.id,
      null,
      booking.status,
      { role: BookingActorRole.CUSTOMER, userId: u.id },
      null,
    );
    await emit(s, 'booking.created', [u.id, p.user_id], {
      booking_id: booking.id,
      status: booking.status,
    });
    return booking;
  }

  /**
   * Chi tiết một booking; khách, thợ chính, thợ liên kết đã nhận lời và admin xem được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor
   * @param input ID booking
   * @returns Booking; 403 nếu không liên quan, 404 nếu không có
   */
  async get(s: EntityManager, a: Actor, input: Inputs.BookingGetQueryInput) {
    return this.viewable(s, a, input.id, [BookingCollaboratorStatus.ACCEPTED]);
  }

  /**
   * Booking của tôi: là khách hoặc là thợ chính, mới tạo trước. Lọc và phân trang bằng SQL.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor
   * @param input Lọc `status`, `from` (bắt đầu từ), `to` (kết thúc trước), `limit`, `offset`
   * @returns `{ items, total, offset, limit }`
   */
  async list(s: EntityManager, a: Actor, input: Inputs.BookingListQueryInput) {
    const u = await currentUser(s, a),
      [c] = await s.findBy(EntitySchemas.customers, { user_id: u.id }),
      [p] = await s.findBy(EntitySchemas.photographers, { user_id: u.id });
    const filters = {
      ...(input.status && { status: input.status }),
      ...(input.from && { from: MoreThanOrEqual(input.from) }),
      ...(input.to && { to: LessThanOrEqual(input.to) }),
    };
    const where = [
      ...(c ? [{ customer_id: c.id, ...filters }] : []),
      ...(p ? [{ photographer_id: p.id, ...filters }] : []),
    ];
    if (!where.length) return paged([], 0, input);
    return this.pageOfBookings(s, where, input);
  }

  /**
   * Chuyển trạng thái theo yêu cầu của người dùng: kiểm quyền trên booking rồi áp dụng.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor gửi request
   * @param input ID booking và lý do (reject / cancel)
   * @param action Tên hành động trong máy trạng thái
   * @returns Booking sau khi đổi trạng thái
   */
  private async transition(
    s: EntityManager,
    a: Actor,
    input: { id: string; reason?: string },
    action: BookingAction,
  ) {
    const side = ACTION_SIDE[action];
    if (action === 'complete') role(a, 'admin', 'system');
    const {
      booking: b,
      user,
      customer,
      photographer,
      recipients,
    } = await bookingAccess(s, a, input.id, side);
    const actorRole = Booking.actorRole(
      user.id,
      customer.user_id,
      photographer.user_id,
      a.roles,
    );
    // huỷ thường chỉ dành cho khách hoặc thợ của booking; admin huỷ qua route admin riêng
    if (action === 'cancel')
      ensure(
        actorRole === BookingActorRole.CUSTOMER ||
          actorRole === BookingActorRole.PHOTOGRAPHER,
        'Booking access denied',
        'forbidden',
      );
    return this.apply(
      s,
      b,
      action,
      { role: actorRole, userId: user.id },
      input.reason ?? null,
      recipients,
    );
  }

  /**
   * Áp dụng một hành động lên booking đã được kiểm quyền: kiểm luật, lưu trạng thái,
   * ghi lịch sử, chạy hệ quả khi completed, bắn realtime. Dùng chung cho request và job nền.
   * Ném 409 nếu booking đã bị người khác đổi trạng thái kể từ lúc đọc.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking cần đổi (bản đã đọc)
   * @param action Hành động trong máy trạng thái
   * @param actor Bên thực hiện; `userId` là `null` khi job nền (`role = 'system'`)
   * @param reason Lý do (reject / cancel / system), không có thì `null`
   * @param recipients User nhận realtime (khách và thợ)
   * @returns Booking sau khi đổi trạng thái
   */
  private async apply(
    s: EntityManager,
    b: BookingEntity,
    action: BookingAction,
    actor: HistoryActor,
    reason: string | null,
    recipients: string[],
  ) {
    const row = await this.tryApply(s, b, action, actor, reason, recipients);
    ensure(
      row,
      'Booking was changed by someone else, reload and try again',
      'conflict',
    );
    return row;
  }

  /**
   * Như `apply` nhưng trả `null` thay vì ném lỗi khi booking đã bị đổi trạng thái kể từ lúc đọc.
   * Dùng cho việc hàng loạt (job, từ chối các pending chồng giờ) để bỏ qua dòng vừa đổi.
   * Câu UPDATE kèm điều kiện trạng thái cũ nên hai thao tác đồng thời không ghi đè nhau.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking cần đổi (bản đã đọc)
   * @param action Hành động trong máy trạng thái
   * @param actor Bên thực hiện
   * @param reason Lý do, không có thì `null`
   * @param recipients User nhận realtime
   * @returns Booking sau khi đổi, hoặc `null` nếu trạng thái đã khác lúc đọc
   */
  private async tryApply(
    s: EntityManager,
    b: BookingEntity,
    action: BookingAction,
    actor: HistoryActor,
    reason: string | null,
    recipients: string[],
  ) {
    const status = new Booking(b.status).transition(action, {
      paidAmount: Booking.needsPayment(action)
        ? (await this.payments.paidAmounts(s, [b.id]))[b.id]
        : 0,
      depositAmount: Number(b.deposit_amount),
      totalAmount: Number(b.total_amount),
      galleryPublished: !!b.gallery_published_at,
    });
    const updatedAt = new Date().toISOString();
    const { affected } = await s.update(
      EntitySchemas.bookings,
      { id: b.id, status: b.status },
      {
        status,
        updated_at: updatedAt,
        ...(status === BookingStatus.ACCEPTED && { accepted_at: updatedAt }),
      },
    );
    if (affected !== 1) return null;
    await this.recordHistory(s, b.id, b.status, status, actor, reason);
    if (status === BookingStatus.COMPLETED) await this.afterCompleted(s, b);
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return {
      ...b,
      status,
      updated_at: updatedAt,
      ...(status === BookingStatus.ACCEPTED && { accepted_at: updatedAt }),
    };
  }

  /**
   * Ghi 1 dòng lịch sử trạng thái booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param bookingId ID booking
   * @param from Trạng thái trước; `null` ở dòng tạo booking
   * @param to Trạng thái sau
   * @param actor Bên thực hiện; `userId` là `null` khi job nền
   * @param reason Lý do (reject / cancel), không có thì `null`
   */
  private async recordHistory(
    s: EntityManager,
    bookingId: string,
    from: BookingStatus | null,
    to: BookingStatus,
    actor: HistoryActor,
    reason: string | null,
  ) {
    await s.save(EntitySchemas.booking_status_history, {
      booking_id: bookingId,
      from_status: from,
      to_status: to,
      actor_role: actor.role,
      actor_user_id: actor.userId,
      reason,
    });
  }

  /**
   * Các việc phải chạy cùng transaction khi booking vừa completed (admin chốt,
   * khách xác nhận, job tự hoàn tất đều đi qua đây). Việc không cần cùng transaction
   * thì nghe event outbox `booking.completed` thay vì thêm vào đây.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking vừa completed
   */
  private async afterCompleted(s: EntityManager, b: BookingEntity) {
    // khoá dòng thợ để hai booking của cùng thợ hoàn tất cùng lúc không đếm thiếu nhau
    await s.findOne(EntitySchemas.photographers, {
      where: { id: b.photographer_id },
      lock: { mode: 'pessimistic_write' },
    });
    await this.reviews.recordBookingStats(
      s,
      b.photographer_id,
      await this.completionStats(s, b.photographer_id),
    );
  }

  /**
   * Số booking đã hoàn tất của thợ và số khách đã hoàn tất từ 2 booking trở lên (khách quay lại).
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @returns `{ completedBookings, returnCustomers }`
   */
  private async completionStats(s: EntityManager, photographerId: string) {
    const completedBookings = await s.countBy(EntitySchemas.bookings, {
      photographer_id: photographerId,
      status: BookingStatus.COMPLETED,
    });
    const row = await s
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(
        (sub) =>
          sub
            .select('b.customer_id')
            .from(EntitySchemas.bookings, 'b')
            .where('b.photographer_id = :photographerId', { photographerId })
            .andWhere('b.status = :status', {
              status: BookingStatus.COMPLETED,
            })
            .groupBy('b.customer_id')
            .having('COUNT(*) > 1'),
        'returning',
      )
      .getRawOne<{ count: string }>();
    return { completedBookings, returnCustomers: Number(row?.count ?? 0) };
  }

  /**
   * Thợ chính nhận booking: `pending → accepted`. Kiểm lại giờ đó chưa có booking đã nhận
   * hay khoảng chặn, rồi tự từ chối các yêu cầu `pending` khác chồng giờ (ghi lý do, bắn realtime).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID booking
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái hoặc giờ đó đã bị giữ
   */
  async accept(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingAcceptCommandInput,
  ) {
    const access = await bookingAccess(s, a, i.id, 'photographer');
    // khoá thợ để hai lần nhận chồng giờ không cùng lọt; đọc lại booking sau khi khoá
    await s.findOne(EntitySchemas.photographers, {
      where: { id: access.photographer.id },
      lock: { mode: 'pessimistic_write' },
    });
    const b = await required(s, 'bookings', i.id);
    if (b.status === BookingStatus.PENDING)
      Booking.assertStillPending(b, Date.now());
    const overlap = overlapWhere(b.photographer_id, b);
    const others = (await s.findBy(EntitySchemas.bookings, overlap)).filter(
      (o) => o.id !== b.id,
    );
    Booking.assertCanAccept(
      b,
      await s.findBy(EntitySchemas.offline_slots, overlap),
      [...others, ...(await this.collaborationTimes(s, b.photographer_id, b))],
    );
    const row = await this.apply(
      s,
      b,
      'accept',
      {
        role: Booking.actorRole(
          access.user.id,
          access.customer.user_id,
          access.photographer.user_id,
          a.roles,
        ),
        userId: access.user.id,
      },
      null,
      access.recipients,
    );
    await this.turnDownOverlapping(s, b.photographer_id, b, TURNED_DOWN_REASON);
    return row;
  }

  /**
   * Từ chối mọi booking `pending` của thợ chồng lên khoảng giờ (system làm, kèm lý do).
   * Dùng khi thợ nhận một booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ vừa bị giữ
   * @param reason Lý do ghi vào lịch sử
   * @returns Số yêu cầu đã từ chối
   */
  private async turnDownOverlapping(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
    reason: string,
  ) {
    const pending = await this.pendingOverlapping(s, photographerId, range);
    return this.decline(
      s,
      pending.map((b) => b.id),
      reason,
    );
  }

  /**
   * Yêu cầu `pending` của thợ chồng lên khoảng giờ (để thợ xem trước khi chặn lịch).
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ sắp bị chặn
   * @returns Các yêu cầu bị ảnh hưởng, xếp theo giờ bắt đầu
   */
  pendingOverlapping(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ) {
    return s.find(EntitySchemas.bookings, {
      where: {
        ...overlapWhere(photographerId, range),
        status: BookingStatus.PENDING,
      },
      order: { from: 'ASC' },
    });
  }

  /**
   * Yêu cầu `pending` của thợ không còn nằm trọn một ca theo lịch tuần mới
   * (để thợ xem trước khi đổi giờ làm).
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param schedule Lịch tuần mới (rỗng ⇒ giờ mặc định)
   * @returns Các yêu cầu bị ảnh hưởng, xếp theo giờ bắt đầu
   */
  async pendingOutside(
    s: EntityManager,
    photographerId: string,
    schedule: readonly WorkingShift[],
  ) {
    return (
      await s.find(EntitySchemas.bookings, {
        where: {
          photographer_id: photographerId,
          status: BookingStatus.PENDING,
        },
        order: { from: 'ASC' },
      })
    ).filter((b) => !WorkSchedule.fits(b, schedule));
  }

  /**
   * Từ chối các yêu cầu còn `pending` (system làm, kèm lý do, ghi lịch sử, bắn realtime).
   * Yêu cầu đã được trả lời trong lúc đó thì bỏ qua.
   *
   * @param s EntityManager của transaction hiện tại
   * @param bookingIds ID các yêu cầu cần từ chối
   * @param reason Lý do ghi vào lịch sử
   * @returns Số yêu cầu đã từ chối
   */
  async decline(
    s: EntityManager,
    bookingIds: readonly string[],
    reason: string,
  ) {
    if (!bookingIds.length) return 0;
    const pending = await s.findBy(EntitySchemas.bookings, {
      id: In([...bookingIds]),
      status: BookingStatus.PENDING,
    });
    let declined = 0;
    for (const b of pending)
      if (
        await this.tryApply(
          s,
          b,
          'reject',
          { role: BookingActorRole.SYSTEM, userId: null },
          reason,
          await this.recipients(s, b),
        )
      )
        declined++;
    return declined;
  }

  /**
   * Thợ chính từ chối booking kèm lý do: `pending → rejected`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID booking và lý do
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái
   */
  reject(s: EntityManager, a: Actor, i: Inputs.BookingRejectCommandInput) {
    return this.transition(s, a, i, 'reject');
  }

  /**
   * Khách hoặc thợ chính huỷ booking kèm lý do: `pending | accepted → cancelled`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách hoặc thợ của booking)
   * @param i ID booking và lý do
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái
   */
  cancel(s: EntityManager, a: Actor, i: Inputs.BookingCancelCommandInput) {
    return this.transition(s, a, i, 'cancel');
  }

  /**
   * Thợ chính bắt đầu buổi chụp: `accepted → in_progress`, cần đã trả đủ cọc.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID booking
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái hoặc chưa trả cọc
   */
  start(s: EntityManager, a: Actor, i: Inputs.BookingStartCommandInput) {
    return this.transition(s, a, i, 'start');
  }

  /**
   * Thợ chính báo đã chụp xong: `in_progress → shot`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID booking
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái
   */
  completeShoot(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCompleteShootCommandInput,
  ) {
    return this.transition(s, a, i, 'completeShoot');
  }

  /**
   * Admin / system chốt hoàn tất: `shot → completed`, cần đã trả đủ và gallery đã publish.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin hoặc system)
   * @param i ID booking
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái hoặc chưa đủ điều kiện
   */
  complete(s: EntityManager, a: Actor, i: Inputs.BookingCompleteCommandInput) {
    return this.transition(s, a, i, 'complete');
  }

  /**
   * Khách của booking xác nhận đã nhận ảnh: `shot → completed`, cùng điều kiện với `complete`
   * (đã trả đủ và gallery đã publish).
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách của booking; người khác 403)
   * @param i ID booking
   * @returns Booking sau khi completed; 409 nếu sai trạng thái hoặc chưa đủ điều kiện
   */
  confirmReceipt(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingConfirmReceiptCommandInput,
  ) {
    return this.transition(s, a, i, 'confirmReceipt');
  }

  /**
   * Job nền (role `system`): tự hoàn tất booking `shot` đã publish gallery đủ 7 ngày mà khách
   * chưa xác nhận. Booking chưa trả đủ thì bỏ qua (hỏi payment qua port), lần chạy sau xét lại.
   * Idempotent: booking đã completed không còn ở `shot` nên chạy lại không đổi gì.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người gọi (phải có role `system`)
   * @returns `{ checked, completed }`: số booking tới hạn đã xét và số booking đã hoàn tất
   */
  async autoComplete(s: EntityManager, a: Actor) {
    role(a, 'system');
    const cutoff = Booking.autoCompleteCutoff(Date.now());
    let checked = 0,
      completed = 0;
    await this.inDuePages(
      s,
      (qb) =>
        qb
          .where('b.status = :status', { status: BookingStatus.SHOT })
          .andWhere('b.gallery_published_at <= :cutoff', { cutoff }),
      'gallery_published_at',
      async (page, paid) => {
        for (const b of page) {
          checked++;
          if (paid[b.id] < Number(b.total_amount)) continue;
          if (
            await this.tryApply(
              s,
              b,
              'complete',
              { role: BookingActorRole.SYSTEM, userId: null },
              null,
              await this.recipients(s, b),
            )
          )
            completed++;
        }
      },
    );
    return { checked, completed };
  }

  /**
   * User của khách và thợ chính của booking (người nhận realtime).
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking
   * @returns `[customerUserId, photographerUserId]`
   */
  private async recipients(s: EntityManager, b: BookingEntity) {
    const customer = await required(s, 'customers', b.customer_id),
      photographer = await required(s, 'photographers', b.photographer_id);
    return [customer.user_id, photographer.user_id];
  }

  /**
   * Job nền (role `system`): cho hết hạn các yêu cầu pending thợ chưa trả lời, ở mốc tới trước
   * trong hai mốc: 24 giờ sau khi gửi, hoặc lúc bắt đầu buổi chụp. Idempotent: booking đã
   * hết hạn không còn `pending` nên chạy lại không đổi gì.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người gọi (phải có role `system`)
   * @returns `{ expired }`: số yêu cầu vừa hết hạn
   */
  async expirePending(s: EntityManager, a: Actor) {
    role(a, 'system');
    const now = Date.now();
    const due = await s.find(EntitySchemas.bookings, {
      where: [
        {
          status: BookingStatus.PENDING,
          created_at: LessThanOrEqual(Booking.pendingExpiryCutoff(now)),
        },
        {
          status: BookingStatus.PENDING,
          from: LessThanOrEqual(new Date(now).toISOString()),
        },
      ],
      order: { created_at: 'ASC', id: 'ASC' },
      take: JOB_BATCH_SIZE,
      lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
    });
    let expired = 0;
    for (const b of due)
      if (
        await this.tryApply(
          s,
          b,
          'expire',
          { role: BookingActorRole.SYSTEM, userId: null },
          EXPIRED_REASON,
          await this.recipients(s, b),
        )
      )
        expired++;
    return { expired };
  }

  /**
   * Job nền (role `system`): huỷ booking đã được nhận mà khách chưa trả đủ cọc, ở mốc tới trước
   * trong hai mốc: 24 giờ sau khi thợ nhận, hoặc lúc bắt đầu buổi chụp. Nhả lịch cho thợ.
   * Idempotent: booking đã huỷ không còn `accepted` nên chạy lại không đổi gì.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người gọi (phải có role `system`)
   * @returns `{ cancelled }`: số booking vừa huỷ
   */
  async cancelUnpaid(s: EntityManager, a: Actor) {
    role(a, 'system');
    const now = Date.now();
    let cancelled = 0;
    await this.inDuePages(
      s,
      (qb) =>
        qb
          .where('b.status = :status', { status: BookingStatus.ACCEPTED })
          .andWhere('(b.accepted_at <= :cutoff OR b."from" <= :now)', {
            cutoff: Booking.paymentDueCutoff(now),
            now: new Date(now).toISOString(),
          }),
      'accepted_at',
      async (page, paid) => {
        for (const b of page) {
          if (paid[b.id] >= Number(b.deposit_amount)) continue;
          if (
            await this.tryApply(
              s,
              b,
              'cancel',
              { role: BookingActorRole.SYSTEM, userId: null },
              UNPAID_REASON,
              await this.recipients(s, b),
            )
          )
            cancelled++;
        }
      },
    );
    return { cancelled };
  }

  /**
   * Duyệt các booking tới hạn của job theo từng trang (khoá dòng, bỏ qua dòng đang bị khoá), hỏi
   * payment số tiền đã trả cho cả trang một lần. Đi hết danh sách tới hạn chứ không chỉ trang đầu,
   * nên booking chưa đủ tiền không chặn các booking phía sau; tối đa `JOB_MAX_PAGES` trang mỗi lần chạy.
   *
   * @param s EntityManager của transaction hiện tại
   * @param filter Điều kiện tới hạn trên alias `b`
   * @param orderField Cột thời gian để xếp và đi trang (kèm `id` cho ổn định)
   * @param visit Xử lý một trang, kèm Map ID booking → số tiền đã trả
   */
  private async inDuePages(
    s: EntityManager,
    filter: (
      qb: SelectQueryBuilder<BookingEntity>,
    ) => SelectQueryBuilder<BookingEntity>,
    orderField: 'gallery_published_at' | 'accepted_at',
    visit: (
      page: BookingEntity[],
      paid: Record<string, number>,
    ) => Promise<void>,
  ) {
    let cursor: { at: string; id: string } | null = null;
    for (let pageNo = 0; pageNo < JOB_MAX_PAGES; pageNo++) {
      const qb = filter(s.createQueryBuilder(EntitySchemas.bookings, 'b'));
      if (cursor) qb.andWhere(`(b.${orderField}, b.id) > (:at, :id)`, cursor);
      const page = await qb
        .orderBy(`b.${orderField}`, 'ASC')
        .addOrderBy('b.id', 'ASC')
        .limit(JOB_BATCH_SIZE)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
      if (!page.length) return;
      await visit(
        page,
        await this.payments.paidAmounts(
          s,
          page.map((b) => b.id),
        ),
      );
      if (page.length < JOB_BATCH_SIZE) return;
      const last = page[page.length - 1];
      cursor = { at: last[orderField]!, id: last.id };
    }
  }

  /**
   * Thợ chính mời thợ khác làm thợ liên kết. Khoá booking trước để hai lời mời
   * cùng lúc không vượt tổng 100%.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính của booking)
   * @param input ID booking, thợ được mời, % chia
   * @returns Lời mời vừa tạo
   */
  async inviteCollaborator(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorInviteCommandInput,
  ) {
    role(a, 'photographer');
    await s.findOne(EntitySchemas.bookings, {
      where: { id: input.id },
      lock: { mode: 'pessimistic_write' },
    });
    const {
      booking: b,
      customer,
      photographer: owner,
    } = await bookingAccess(s, a, input.id, 'photographer');
    // chỉ mời thợ đã duyệt, tài khoản active; không thì 404
    const { photographer: invitee } = await publicPhotographer(
      s,
      input.photographer_id,
    );
    const draft = Collaboration.invite({
      bookingStatus: b.status,
      galleryPublished: !!b.gallery_published_at,
      ownerPhotographerId: owner.id,
      inviteePhotographerId: invitee.id,
      sharePercent: input.share_percent,
      inviteeIsCustomer: invitee.user_id === customer.user_id,
      existing: await s.findBy(EntitySchemas.booking_collaborators, {
        booking_id: b.id,
      }),
    });
    const row = await s.save(EntitySchemas.booking_collaborators, {
      booking_id: b.id,
      ...draft,
      responded_at: null,
    });
    await emit(s, 'booking.collaborator_invited', [invitee.user_id], {
      booking_id: b.id,
      collaborator_id: row.id,
      share_percent: row.share_percent,
    });
    return row;
  }

  /**
   * Danh sách thợ liên kết của booking (mọi trạng thái, theo thời gian mời).
   * Xem được: khách, thợ chính, admin, và thợ có lời mời trong booking này.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor
   * @param input ID booking
   * @returns `{ items }`
   */
  async collaborators(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorListQueryInput,
  ) {
    const b = await this.viewable(s, a, input.id, [
      BookingCollaboratorStatus.INVITED,
      BookingCollaboratorStatus.ACCEPTED,
    ]);
    return {
      items: await s.find(EntitySchemas.booking_collaborators, {
        where: { booking_id: b.id },
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Booking mà actor được xem: khách, thợ chính, admin/system, hoặc thợ liên kết có lời mời
   * ở một trong các trạng thái cho phép. Một chỗ duy nhất quyết định ai xem được booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor
   * @param id ID booking
   * @param collaboratorStatuses Trạng thái lời mời liên kết được tính là được xem
   * @returns Booking; 403 nếu không liên quan, 404 nếu không có
   */
  private async viewable(
    s: EntityManager,
    a: Actor,
    id: string,
    collaboratorStatuses: BookingCollaboratorStatus[],
  ) {
    const user = await currentUser(s, a),
      b = await required(s, 'bookings', id),
      c = await required(s, 'customers', b.customer_id),
      [mine] = await s.findBy(EntitySchemas.photographers, {
        user_id: user.id,
      });
    const collaborator =
      !!mine &&
      (await s.existsBy(EntitySchemas.booking_collaborators, {
        booking_id: b.id,
        photographer_id: mine.id,
        status: In(collaboratorStatuses),
      }));
    ensure(
      c.user_id === user.id ||
        mine?.id === b.photographer_id ||
        collaborator ||
        a.roles.some((r) => ['admin', 'system'].includes(r)),
      'Booking access denied',
      'forbidden',
    );
    return b;
  }

  /**
   * Các lời mời liên kết gửi tới thợ đang đăng nhập, mới nhất trước, phân trang bằng SQL.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ)
   * @param input `limit`, `offset`
   * @returns `{ items, total, offset, limit }`
   */
  async myCollaborations(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingCollaboratorMeQueryInput,
  ) {
    role(a, 'photographer');
    const p = await ownPhotographer(s, a);
    const { offset, limit } = pageWindow(input);
    const [items, total] = await s.findAndCount(
      EntitySchemas.booking_collaborators,
      {
        where: { photographer_id: p.id },
        order: { created_at: 'DESC', id: 'ASC' },
        skip: offset,
        take: limit,
      },
    );
    return paged(items, total, input);
  }

  /**
   * Thợ được mời nhận hoặc từ chối lời mời còn chờ; báo cho thợ chính.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ được mời)
   * @param id ID lời mời
   * @param action 'accept' | 'decline'
   * @returns Lời mời sau khi đổi
   */
  private async respondCollaboration(
    s: EntityManager,
    a: Actor,
    id: string,
    action: 'accept' | 'decline',
  ) {
    const { invitation, booking, me } = await this.invitation(s, a, id);
    ensure(
      invitation.photographer_id === me.id,
      'Invitation access denied',
      'forbidden',
    );
    if (action === 'accept') await this.assertCanJoin(s, me.id, booking);
    const owner = await required(s, 'photographers', booking.photographer_id);
    return this.changeCollaboration(
      s,
      invitation,
      booking,
      action,
      owner.user_id,
    );
  }

  /**
   * Thợ liên kết chỉ nhận lời khi giờ chụp còn trống trên lịch của chính họ: không có khoảng
   * chặn, booking đang giữ lịch, hay buổi liên kết khác đã nhận chồng giờ. Khoá dòng thợ để
   * không đua với việc thợ đó nhận booking hoặc chặn lịch cùng lúc.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ được mời
   * @param booking Booking được mời tham gia
   * @returns Không trả gì; 409 nếu trùng lịch
   */
  private async assertCanJoin(
    s: EntityManager,
    photographerId: string,
    booking: BookingEntity,
  ) {
    await s.findOne(EntitySchemas.photographers, {
      where: { id: photographerId },
      lock: { mode: 'pessimistic_write' },
    });
    const overlap = overlapWhere(photographerId, booking);
    Booking.assertCanAccept(
      booking,
      await s.findBy(EntitySchemas.offline_slots, overlap),
      [
        ...(await s.findBy(EntitySchemas.bookings, overlap)),
        ...(await this.collaborationTimes(s, photographerId, booking)),
      ],
    );
  }

  /**
   * Các buổi thợ đi chụp liên kết (lời mời đã nhận, booking còn giữ lịch) chồng lên khoảng giờ.
   * Những buổi này chiếm lịch của thợ liên kết như booking của chính họ. Calendar gọi qua
   * `CollaborationTimesPort` để trừ khỏi lịch trống và chặn lịch.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ cần xét
   * @returns Các khoảng `{ from, to, status }` của booking mà thợ tham gia
   */
  async collaborationTimes(
    s: EntityManager,
    photographerId: string,
    range: { from: string; to: string },
  ) {
    const joined = await s.findBy(EntitySchemas.booking_collaborators, {
      photographer_id: photographerId,
      status: BookingCollaboratorStatus.ACCEPTED,
    });
    if (!joined.length) return [];
    return s.findBy(EntitySchemas.bookings, {
      id: In(joined.map((c) => c.booking_id)),
      status: In([...OCCUPIED_BOOKING_STATUSES]),
      to: MoreThan(new Date(range.from).toISOString()),
      from: LessThan(new Date(range.to).toISOString()),
    });
  }

  /**
   * Thợ chính rút lời mời còn chờ (thợ được mời chưa trả lời); báo cho thợ được mời.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID lời mời
   * @returns Lời mời sau khi đổi
   */
  async revokeCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorRevokeCommandInput,
  ) {
    const { invitation, booking, me } = await this.invitation(s, a, i.id);
    ensure(
      booking.photographer_id === me.id,
      'Invitation access denied',
      'forbidden',
    );
    const invitee = await required(
      s,
      'photographers',
      invitation.photographer_id,
    );
    return this.changeCollaboration(
      s,
      invitation,
      booking,
      'revoke',
      invitee.user_id,
    );
  }

  /**
   * Thợ được mời nhận lời mời còn chờ.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ được mời; người khác 403)
   * @param i ID lời mời
   * @returns Lời mời với `status = 'accepted'`; 409 nếu lời mời hết chờ hoặc booking đã đóng
   */
  acceptCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorAcceptCommandInput,
  ) {
    return this.respondCollaboration(s, a, i.id, 'accept');
  }

  /**
   * Thợ được mời từ chối lời mời còn chờ; sau đó thợ chính không mời lại thợ này được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ được mời; người khác 403)
   * @param i ID lời mời
   * @returns Lời mời với `status = 'declined'`; 409 nếu lời mời hết chờ hoặc booking đã đóng
   */
  declineCollaboration(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingCollaboratorDeclineCommandInput,
  ) {
    return this.respondCollaboration(s, a, i.id, 'decline');
  }

  /**
   * Lời mời, booking của nó và hồ sơ thợ đang đăng nhập; khoá booking rồi mới khoá lời mời
   * (cùng thứ tự với lúc mời) để trả lời lời mời không đua với huỷ booking hay lời mời khác.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ)
   * @param id ID lời mời
   * @returns `{ invitation, booking, me }`
   */
  private async invitation(s: EntityManager, a: Actor, id: string) {
    role(a, 'photographer');
    const me = await ownPhotographer(s, a);
    const { booking_id } = await required(s, 'booking_collaborators', id);
    const booking = await s.findOne(EntitySchemas.bookings, {
      where: { id: booking_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(booking, 'bookings not found', 'missing');
    const invitation = await s.findOne(EntitySchemas.booking_collaborators, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(invitation, 'booking_collaborators not found', 'missing');
    return { invitation, booking, me };
  }

  /**
   * Đổi trạng thái lời mời theo luật domain, lưu và bắn realtime.
   *
   * @param s EntityManager của transaction hiện tại
   * @param invitation Lời mời
   * @param booking Booking của lời mời
   * @param action 'accept' | 'decline' | 'revoke'
   * @param notifyUserId User nhận realtime
   * @returns Lời mời sau khi đổi
   */
  private async changeCollaboration(
    s: EntityManager,
    invitation: BookingCollaboratorEntity,
    booking: BookingEntity,
    action: CollaborationAction,
    notifyUserId: string,
  ) {
    const status = Collaboration.respond(invitation.status, action, {
      bookingStatus: booking.status,
      galleryPublished: !!booking.gallery_published_at,
    });
    const row = await updateEntity(
      s,
      EntitySchemas.booking_collaborators,
      invitation.id,
      {
        status,
        responded_at: action === 'revoke' ? null : new Date().toISOString(),
      },
    );
    await emit(s, `booking.collaborator_${status}`, [notifyUserId], {
      booking_id: booking.id,
      collaborator_id: invitation.id,
      status,
    });
    return row;
  }

  /**
   * Booking của thợ (mọi trạng thái) chồng lên khung giờ, xếp theo giờ bắt đầu. Module calendar gọi
   * qua port để dựng lịch trống, lịch của thợ và kiểm chặn lịch, thay vì đọc thẳng bảng `bookings`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param photographerId ID hồ sơ thợ
   * @param window `from` / `to` ISO, đều tuỳ chọn
   * @returns Các booking chồng lên khung giờ
   */
  bookingsOverlapping(
    s: EntityManager,
    photographerId: string,
    window: { from?: string; to?: string },
  ) {
    return s.find(EntitySchemas.bookings, {
      where: overlapWhere(photographerId, window),
      order: { from: 'ASC' },
    });
  }

  /**
   * Số booking đang dùng một gói chụp (mọi trạng thái). Module photographer gọi qua port để không
   * cho xoá gói đã có booking.
   *
   * @param s EntityManager của transaction hiện tại
   * @param planId ID gói chụp
   * @returns Số booking
   */
  bookingCountForPlan(s: EntityManager, planId: string) {
    return s.countBy(EntitySchemas.bookings, { booking_plan_id: planId });
  }

  /**
   * Admin huỷ booking ở mọi trạng thái chưa xong (chờ, đã nhận, đang chụp, đã chụp), bắt buộc lý do.
   * Dùng khi phải can thiệp, ví dụ thợ bị khoá tài khoản giữa chừng. Việc hoàn tiền nối ở module payment.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param i ID booking và lý do
   * @returns Booking sau khi huỷ; 409 nếu đã kết thúc (completed, rejected, cancelled, expired)
   */
  async adminCancel(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingAdminCancelCommandInput,
  ) {
    role(a, 'admin');
    const user = await currentUser(s, a),
      b = await required(s, 'bookings', i.id);
    return this.apply(
      s,
      b,
      'adminCancel',
      { role: BookingActorRole.ADMIN, userId: user.id },
      i.reason,
      await this.recipients(s, b),
    );
  }

  /**
   * Lịch sử trạng thái của booking theo thời gian.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách, thợ chính, thợ liên kết đã nhận lời hoặc admin)
   * @param i ID booking
   * @returns `{ items }` các dòng lịch sử, cũ trước
   */
  async timeline(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingTimelineQueryInput,
  ) {
    const booking = await this.viewable(s, a, i.id, [
      BookingCollaboratorStatus.ACCEPTED,
    ]);
    return {
      items: await s.find(EntitySchemas.booking_status_history, {
        where: { booking_id: booking.id },
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Khách hoặc thợ chính khiếu nại booking: tạo report `target_type = booking`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (bên liên quan tới booking)
   * @param input ID booking và lý do
   * @returns Report vừa tạo
   */
  async dispute(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingDisputeCommandInput,
  ) {
    const { user } = await bookingAccess(s, a, input.id);
    return s.save(EntitySchemas.reports, {
      user_id: user.id,
      target_type: 'booking',
      target_id: input.id,
      reason: input.reason,
    });
  }

  /**
   * Admin xem mọi booking, mới tạo trước, lọc theo trạng thái. Lọc và phân trang bằng SQL.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (admin)
   * @param input Lọc `status`, `limit`, `offset`
   * @returns `{ items, total, offset, limit }`
   */
  async admin(
    s: EntityManager,
    a: Actor,
    input: Inputs.BookingAdminQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return this.pageOfBookings(
      s,
      input.status ? { status: input.status } : {},
      input,
    );
  }

  /**
   * Một trang booking theo điều kiện, mới tạo trước; DB chỉ trả đúng số dòng của trang.
   *
   * @param s EntityManager của transaction hiện tại
   * @param where Điều kiện TypeORM (mảng = OR)
   * @param query `limit` (mặc định 20), `offset` (mặc định 0)
   * @returns `{ items, total, offset, limit }`
   */
  private async pageOfBookings(
    s: EntityManager,
    where: FindOptionsWhere<BookingEntity> | FindOptionsWhere<BookingEntity>[],
    query: { limit?: number; offset?: number },
  ) {
    const { offset, limit } = pageWindow(query);
    const [items, total] = await s.findAndCount(EntitySchemas.bookings, {
      where,
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return paged(items, total, query);
  }
}
