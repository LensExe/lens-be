import {
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
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
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { RatingUpdaterPort } from './ports/rating-updater.port';
import {
  Booking,
  BookingActorRole,
  type BookingAction,
  type BookingStatus,
} from './booking.domain';
import { Collaboration, type CollaborationAction } from './collaborator.domain';
import type {
  BookingCollaboratorEntity,
  BookingEntity,
} from '@shared/database/entities';

/** Bên thực hiện ghi vào lịch sử; `userId` là `null` khi job nền (`role = 'system'`). */
type HistoryActor = { role: BookingActorRole; userId: string | null };

/** Bên của booking được làm hành động (không có trong bảng ⇒ khách, thợ hoặc admin/system). */
const ACTION_SIDE: Partial<Record<BookingAction, 'customer' | 'photographer'>> =
  {
    accept: 'photographer',
    reject: 'photographer',
    start: 'photographer',
    completeShoot: 'photographer',
    confirmReceipt: 'customer',
  };

@Injectable()
export class BookingUseCases {
  constructor(private readonly reviews: RatingUpdaterPort) {}

  /**
   * Khách đặt lịch với thợ theo một gói chụp. Khoá dòng thợ để hai khách không đặt trùng giờ.
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
      this.overlapping(p.id, input),
    );

    const bookings = await s.findBy(
      EntitySchemas.bookings,
      this.overlapping(p.id, input),
    );

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
      status: 'pending',
    });
    return booking;
  }

  /**
   * Chi tiết một booking; chỉ khách, thợ chính, admin hoặc system xem được.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor
   * @param input ID booking
   * @returns Booking; 403 nếu không liên quan, 404 nếu không có
   */
  async get(s: EntityManager, a: Actor, input: Inputs.BookingGetQueryInput) {
    return (await bookingAccess(s, a, input.id)).booking;
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
      ...(input.status && { status: input.status as BookingStatus }),
      ...(input.from && { from: MoreThanOrEqual(input.from) }),
      ...(input.to && { to: LessThanOrEqual(input.to) }),
    };
    const where = [
      ...(c ? [{ customer_id: c.id, ...filters }] : []),
      ...(p ? [{ photographer_id: p.id, ...filters }] : []),
    ];
    if (!where.length) return this.paged([], 0, input);
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
    return this.apply(
      s,
      b,
      action,
      {
        role: Booking.actorRole(
          user.id,
          customer.user_id,
          photographer.user_id,
          a.roles,
        ),
        userId: user.id,
      },
      input.reason ?? null,
      recipients,
    );
  }

  /**
   * Áp dụng một hành động lên booking đã được kiểm quyền: kiểm luật, lưu trạng thái,
   * ghi lịch sử, chạy hệ quả khi completed, bắn realtime. Dùng chung cho request và job nền.
   *
   * @param s EntityManager của transaction hiện tại
   * @param b Booking cần đổi
   * @param action Tên hành động trong máy trạng thái
   * @param actor Bên thực hiện; `userId` là `null` khi job nền (`role = 'system'`)
   * @param reason Lý do (reject / cancel), không có thì `null`
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
    const paid = await this.paidAmount(s, b.id);
    const status = new Booking(b.status).transition(
      action,
      paid >=
        (action === 'start'
          ? Number(b.deposit_amount)
          : Number(b.total_amount)),
      !!b.gallery_published_at,
    );
    const row = await updateEntity(s, EntitySchemas.bookings, b.id, { status });
    await this.recordHistory(s, b.id, b.status, status, actor, reason);
    if (status === 'completed') await this.afterCompleted(s, b);
    await emit(s, `booking.${status}`, recipients, {
      booking_id: b.id,
      status,
    });
    return row;
  }

  /**
   * Điều kiện "khoảng chặn / booking của thợ chồng lên khoảng mới" (khoảng nửa mở `[from, to)`),
   * để khi tạo booking chỉ đọc các dòng có thể trùng thay vì toàn bộ lịch sử của thợ.
   *
   * @param photographerId ID hồ sơ thợ
   * @param range Khoảng giờ của booking mới
   * @returns Điều kiện `where` cho `findBy`
   */
  private overlapping(
    photographerId: string,
    range: { from: string; to: string },
  ) {
    return {
      photographer_id: photographerId,
      to: MoreThan(new Date(range.from).toISOString()),
      from: LessThan(new Date(range.to).toISOString()),
    };
  }

  /**
   * Offset / limit của một trang, cùng mặc định với `page()`.
   *
   * @param query `limit`, `offset` từ query string
   * @returns `{ offset, limit }`
   */
  private pageWindow(query: { limit?: number; offset?: number }) {
    return { offset: query.offset ?? 0, limit: query.limit ?? 20 };
  }

  /**
   * Dạng response phân trang chuẩn của repo.
   *
   * @param items Các dòng của trang
   * @param total Tổng số dòng khớp điều kiện
   * @param query `limit`, `offset` từ query string
   * @returns `{ items, total, offset, limit }`
   */
  private paged<T>(
    items: T[],
    total: number,
    query: { limit?: number; offset?: number },
  ) {
    return { items, total, ...this.pageWindow(query) };
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
   * Tổng tiền khách đã trả cho booking (cọc + phần còn lại, chỉ giao dịch `paid`).
   *
   * @param s EntityManager của transaction hiện tại
   * @param bookingId ID booking
   * @returns Số tiền VND
   */
  private async paidAmount(s: EntityManager, bookingId: string) {
    return (
      await s.findBy(EntitySchemas.transactions, {
        reference_id: bookingId,
        status: 'paid',
      })
    )
      .filter((t) => ['deposit', 'remaining'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0);
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
    await this.reviews.recalculate(s, b.photographer_id);
  }

  /**
   * Thợ chính nhận booking: `pending → accepted`.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ chính)
   * @param i ID booking
   * @returns Booking sau khi đổi; 409 nếu sai trạng thái
   */
  accept(s: EntityManager, a: Actor, i: Inputs.BookingAcceptCommandInput) {
    return this.transition(s, a, i, 'accept');
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
   * chưa xác nhận. Booking chưa trả đủ thì bỏ qua, lần chạy sau xét lại.
   * Idempotent: booking đã completed không còn ở `shot` nên chạy lại không đổi gì.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Người gọi (phải có role `system`)
   * @returns `{ checked, completed }`: số booking tới hạn đã xét và số booking đã hoàn tất
   */
  async autoComplete(s: EntityManager, a: Actor) {
    role(a, 'system');
    const due = await s.find(EntitySchemas.bookings, {
      where: {
        status: 'shot',
        gallery_published_at: LessThanOrEqual(
          Booking.autoCompleteCutoff(Date.now()),
        ),
      },
      order: { gallery_published_at: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    let completed = 0;
    for (const b of due) {
      if ((await this.paidAmount(s, b.id)) < Number(b.total_amount)) continue;
      await this.apply(
        s,
        b,
        'complete',
        { role: BookingActorRole.SYSTEM, userId: null },
        null,
        await this.recipients(s, b),
      );
      completed++;
    }
    return { checked: due.length, completed };
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
    const { booking: b, photographer: owner } = await bookingAccess(
      s,
      a,
      input.id,
      'photographer',
    );
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
    const user = await currentUser(s, a),
      b = await required(s, 'bookings', input.id),
      c = await required(s, 'customers', b.customer_id),
      [mine] = await s.findBy(EntitySchemas.photographers, {
        user_id: user.id,
      });
    const invited =
      !!mine &&
      (await s.existsBy(EntitySchemas.booking_collaborators, {
        booking_id: b.id,
        photographer_id: mine.id,
      }));
    ensure(
      c.user_id === user.id ||
        mine?.id === b.photographer_id ||
        invited ||
        a.roles.includes('admin'),
      'Booking access denied',
      'forbidden',
    );
    return {
      items: await s.find(EntitySchemas.booking_collaborators, {
        where: { booking_id: b.id },
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Các lời mời liên kết gửi tới thợ đang đăng nhập, mới nhất trước.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ)
   * @returns `{ items }`
   */
  async myCollaborations(s: EntityManager, a: Actor) {
    role(a, 'photographer');
    const p = await ownPhotographer(s, a);
    return {
      items: await s.find(EntitySchemas.booking_collaborators, {
        where: { photographer_id: p.id },
        order: { created_at: 'DESC' },
      }),
    };
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
   * Lời mời (đã khoá dòng), booking của nó và hồ sơ thợ đang đăng nhập.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (thợ)
   * @param id ID lời mời
   * @returns `{ invitation, booking, me }`
   */
  private async invitation(s: EntityManager, a: Actor, id: string) {
    role(a, 'photographer');
    const me = await ownPhotographer(s, a);
    const invitation = await s.findOne(EntitySchemas.booking_collaborators, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(invitation, 'booking_collaborators not found', 'missing');
    const booking = await required(s, 'bookings', invitation.booking_id);
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
   * Lịch sử trạng thái của booking theo thời gian.
   *
   * @param s EntityManager của transaction hiện tại
   * @param a Actor (khách, thợ chính, admin hoặc system)
   * @param i ID booking
   * @returns `{ items }` các dòng lịch sử, cũ trước
   */
  async timeline(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingTimelineQueryInput,
  ) {
    const { booking } = await bookingAccess(s, a, i.id);
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
      input.status ? { status: input.status as BookingStatus } : {},
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
    const { offset, limit } = this.pageWindow(query);
    const [items, total] = await s.findAndCount(EntitySchemas.bookings, {
      where,
      order: { created_at: 'DESC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return this.paged(items, total, query);
  }
}
