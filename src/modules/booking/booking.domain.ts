import { ensure } from '@shared/domain/domain.error';
import {
  interval,
  isOccupied,
  money,
  overlaps,
} from '@shared/domain/booking-values';
import { WorkSchedule, type WorkingShift } from '@shared/domain/work-schedule';
import {
  BookingStatus,
  OCCUPIED_BOOKING_STATUSES,
} from '@shared/database/entities/booking.entity';
import { BookingActorRole } from '@shared/database/entities/booking-status-history.entity';
export { BookingStatus, OCCUPIED_BOOKING_STATUSES, BookingActorRole };

export interface BookingDraftInput {
  customerId: string;
  customerUserId: string;
  photographerId: string;
  photographerUserId: string;
  photographerStatus: string;
  /** Thợ đã được admin duyệt (`verification_status = 'verified'`) */
  photographerVerified: boolean;
  photographerAvailable: boolean;
  planId: string;
  planPhotographerId: string;
  planActive: boolean;
  planPrice: number;
  /** Thời lượng gói; khoảng `from`–`to` phải dài đúng bằng số phút này */
  planDurationMinutes: number;
  location: string;
  from: string;
  to: string;
  /** Lịch tuần thợ đã khai (rỗng ⇒ giờ mặc định 08:00–20:00) */
  schedule: readonly WorkingShift[];
  blockedTimes: readonly { from: string; to: string }[];
  /** Booking khác của thợ chồng giờ (`customer_id` để nhận ra yêu cầu trùng của chính khách này) */
  bookings: readonly {
    from: string;
    to: string;
    status: string;
    customer_id?: string;
  }[];
  /** Số yêu cầu pending khách này đang có với thợ này */
  openRequestsWithPhotographer: number;
  /** Tổng số yêu cầu pending khách này đang có */
  openRequests: number;
  now: number;
}

/** Số ngày sau khi publish gallery thì system tự hoàn tất booking nếu khách chưa xác nhận. */
export const AUTO_COMPLETE_AFTER_DAYS = 7;

/** Hành động trên máy trạng thái booking. */
export type BookingAction =
  | 'accept'
  | 'reject'
  | 'cancel'
  | 'start'
  | 'completeShoot'
  | 'complete'
  | 'confirmReceipt'
  | 'expire'
  | 'adminCancel';

/** Số giờ thợ có để trả lời một yêu cầu; quá hạn (hoặc tới giờ chụp) thì yêu cầu hết hạn. */
export const PENDING_EXPIRES_AFTER_HOURS = 24;

/** Tiền của booking để domain quyết định có được bắt đầu / hoàn tất không. */
export interface BookingPayment {
  /** Tổng khách đã trả (cọc + phần còn lại, giao dịch `paid`) */
  paidAmount: number;
  depositAmount: number;
  totalAmount: number;
  galleryPublished: boolean;
}

/** Số giờ khách có để trả cọc sau khi thợ nhận; quá hạn (hoặc tới giờ chụp) thì booking bị huỷ. */
export const PAYMENT_DUE_AFTER_HOURS = 24;

/** Số yêu cầu pending tối đa một khách được mở cùng lúc với một thợ, và tổng cộng. */
export const MAX_OPEN_REQUESTS_PER_PHOTOGRAPHER = 3;
export const MAX_OPEN_REQUESTS = 10;

export class Booking {
  /** @param status Trạng thái hiện tại của booking */
  constructor(public status: BookingStatus) {}

  /**
   * Kiểm luật tạo booking và tính tiền: cọc = làm tròn lên 30% tổng giá gói.
   *
   * @param input Dữ kiện khách, thợ, gói, lịch và các booking/khoảng chặn chồng giờ
   * @returns Dữ liệu booking `pending` để lưu; ném 400/404/409 khi sai luật
   */
  static prepare(input: BookingDraftInput) {
    ensure(input.photographerVerified, 'Photographer not found', 'missing');
    ensure(
      input.photographerStatus === 'active' &&
        input.photographerAvailable &&
        input.planActive &&
        input.planPhotographerId === input.photographerId,
      'Photographer or plan unavailable',
      'conflict',
    );
    ensure(
      input.photographerUserId !== input.customerUserId,
      'Cannot book yourself',
    );
    ensure(
      input.openRequestsWithPhotographer < MAX_OPEN_REQUESTS_PER_PHOTOGRAPHER &&
        input.openRequests < MAX_OPEN_REQUESTS,
      'Too many open requests, wait for answers or cancel some',
      'conflict',
    );
    const range = interval(input.from, input.to);
    ensure(Date.parse(range.from) > input.now, 'Booking must start in future');
    ensure(
      Date.parse(range.to) - Date.parse(range.from) ===
        input.planDurationMinutes * 60_000,
      'Booking length must match plan duration',
    );
    ensure(
      WorkSchedule.fits(range, input.schedule),
      'Booking must be within working hours',
      'conflict',
    );
    Booking.assertCanAccept(range, input.blockedTimes, input.bookings);
    ensure(
      !input.bookings.some(
        (booking) =>
          booking.customer_id === input.customerId &&
          booking.status === BookingStatus.PENDING &&
          overlaps(booking, range),
      ),
      'You already requested this time',
      'conflict',
    );
    const total = money(input.planPrice);
    return {
      customer_id: input.customerId,
      photographer_id: input.photographerId,
      booking_plan_id: input.planId,
      location: input.location,
      ...range,
      total_amount: total,
      deposit_amount: Math.ceil(total * 0.3),
      status: BookingStatus.PENDING,
    };
  }

  /**
   * Khoảng giờ còn trống để giữ lịch: không chồng khoảng chặn và không chồng booking đang
   * chiếm lịch (đã nhận trở đi; yêu cầu `pending` không tính). Dùng khi tạo và khi thợ nhận.
   *
   * @param range Khoảng giờ của booking
   * @param blockedTimes Các khoảng thợ đã chặn
   * @param bookings Các booking khác của thợ
   * @returns Không trả gì; 409 nếu trùng
   */
  static assertCanAccept(
    range: { from: string; to: string },
    blockedTimes: readonly { from: string; to: string }[],
    bookings: readonly { from: string; to: string; status: string }[],
  ) {
    ensure(
      !blockedTimes.some((blocked) => overlaps(range, blocked)),
      'Photographer is unavailable at this time',
      'conflict',
    );
    ensure(
      !bookings.some(
        (booking) => isOccupied(booking.status) && overlaps(booking, range),
      ),
      'Photographer already booked or blocked',
      'conflict',
    );
  }

  /**
   * Bên đang thao tác trên booking, để ghi vào lịch sử trạng thái.
   * Ưu tiên vai trò trong booking (khách / thợ của booking), sau đó mới tới role hệ thống.
   *
   * @param userId User đang thao tác
   * @param customerUserId User của khách trong booking
   * @param photographerUserId User của thợ trong booking
   * @param roles Role của actor (từ token)
   * @returns 'customer' | 'photographer' | 'admin' | 'system'
   */
  static actorRole(
    userId: string,
    customerUserId: string,
    photographerUserId: string,
    roles: readonly string[],
  ): BookingActorRole {
    if (userId === customerUserId) return BookingActorRole.CUSTOMER;
    if (userId === photographerUserId) return BookingActorRole.PHOTOGRAPHER;
    return roles.includes('admin')
      ? BookingActorRole.ADMIN
      : BookingActorRole.SYSTEM;
  }

  /**
   * Mốc hết hạn của yêu cầu pending: gửi từ mốc này trở về trước là quá 24 giờ chưa được trả lời.
   * Yêu cầu cũng hết hạn khi tới giờ chụp (`from <= now`), điều kiện đó do use case lọc.
   *
   * @param now Thời điểm hiện tại (ms)
   * @returns Thời điểm ISO UTC = `now` trừ `PENDING_EXPIRES_AFTER_HOURS` giờ
   */
  static pendingExpiryCutoff(now: number) {
    return new Date(now - PENDING_EXPIRES_AFTER_HOURS * 36e5).toISOString();
  }

  /**
   * Yêu cầu còn hạn để thợ nhận: gửi chưa quá 24 giờ và buổi chụp chưa bắt đầu.
   * Cùng luật với job hết hạn, nên thợ không nhận được yêu cầu đã quá hạn trong lúc job chưa chạy.
   *
   * @param booking `created_at` (lúc gửi) và `from` (lúc bắt đầu chụp)
   * @param now Thời điểm hiện tại (ms)
   * @returns Không trả gì; 409 nếu đã quá hạn
   */
  static assertStillPending(
    booking: { created_at: string; from: string },
    now: number,
  ) {
    ensure(
      Date.parse(booking.created_at) >
        Date.parse(Booking.pendingExpiryCutoff(now)) &&
        Date.parse(booking.from) > now,
      'Booking request has expired',
      'conflict',
    );
  }

  /**
   * Mốc hạn thanh toán: booking được nhận từ mốc này trở về trước mà chưa trả đủ cọc là quá hạn.
   * Cũng quá hạn khi tới giờ chụp (`from <= now`), điều kiện đó do use case lọc.
   *
   * @param now Thời điểm hiện tại (ms)
   * @returns Thời điểm ISO UTC = `now` trừ `PAYMENT_DUE_AFTER_HOURS` giờ
   */
  static paymentDueCutoff(now: number) {
    return new Date(now - PAYMENT_DUE_AFTER_HOURS * 36e5).toISOString();
  }

  /**
   * Mốc tự hoàn tất: booking publish gallery từ mốc này trở về trước là tới hạn.
   * Trạng thái `shot` và điều kiện trả đủ vẫn do `transition('complete')` kiểm.
   *
   * @param now Thời điểm hiện tại (ms)
   * @returns Thời điểm ISO UTC = `now` trừ `AUTO_COMPLETE_AFTER_DAYS` ngày
   */
  static autoCompleteCutoff(now: number) {
    return new Date(now - AUTO_COMPLETE_AFTER_DAYS * 864e5).toISOString();
  }

  /**
   * Hành động này có cần biết khách đã trả bao nhiêu không (bắt đầu chụp cần cọc, hoàn tất cần đủ).
   * Use case chỉ đọc giao dịch khi cần.
   *
   * @param action Hành động
   * @returns `true` nếu cần số tiền đã trả
   */
  static needsPayment(action: BookingAction) {
    return ['start', 'complete', 'confirmReceipt'].includes(action);
  }

  /**
   * Chuyển trạng thái theo hành động. Domain tự quyết ngưỡng tiền: bắt đầu chụp cần đủ cọc,
   * hoàn tất cần trả đủ tổng tiền và gallery đã publish.
   *
   * @param action Hành động
   * @param payment Số đã trả, tiền cọc, tổng tiền, gallery đã publish chưa
   * @returns Trạng thái mới; 409 nếu hành động không hợp lệ ở trạng thái hiện tại hoặc chưa đủ điều kiện
   */
  transition(action: BookingAction, payment: BookingPayment): BookingStatus {
    const transitions: Record<BookingAction, [BookingStatus[], BookingStatus]> =
      {
        accept: [['pending'], 'accepted'],
        reject: [['pending'], 'rejected'],
        cancel: [['pending', 'accepted'], 'cancelled'],
        start: [['accepted'], 'in_progress'],
        completeShoot: [['in_progress'], 'shot'],
        complete: [['shot'], 'completed'],
        confirmReceipt: [['shot'], 'completed'],
        expire: [['pending'], 'expired'],
        adminCancel: [
          ['pending', 'accepted', 'in_progress', 'shot'],
          'cancelled',
        ],
      };
    const rule = transitions[action];
    ensure(
      rule[0].includes(this.status),
      `Cannot ${action} booking in ${this.status}`,
      'conflict',
    );
    if (action === 'start')
      ensure(
        payment.paidAmount >= payment.depositAmount,
        'Deposit must be paid before starting',
        'conflict',
      );
    if (action === 'complete' || action === 'confirmReceipt')
      ensure(
        payment.paidAmount >= payment.totalAmount && payment.galleryPublished,
        'Full payment and published gallery required',
        'conflict',
      );
    return (this.status = rule[1]);
  }
}
