import { ensure } from '@shared/domain/domain.error';
import { interval, money, overlaps } from '@shared/domain/booking-values';
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
  bookings: readonly { from: string; to: string; status: string }[];
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
  | 'confirmReceipt';

export class Booking {
  constructor(public status: BookingStatus) {}

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
    ensure(
      !input.blockedTimes.some((blocked) => overlaps(range, blocked)),
      'Photographer is unavailable at this time',
      'conflict',
    );
    ensure(
      !input.bookings.some(
        (booking) =>
          (OCCUPIED_BOOKING_STATUSES as readonly string[]).includes(
            booking.status,
          ) && overlaps(booking, range),
      ),
      'Photographer already booked or blocked',
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
   * Mốc tự hoàn tất: booking publish gallery từ mốc này trở về trước là tới hạn.
   * Trạng thái `shot` và điều kiện trả đủ vẫn do `transition('complete')` kiểm.
   *
   * @param now Thời điểm hiện tại (ms)
   * @returns Thời điểm ISO UTC = `now` trừ `AUTO_COMPLETE_AFTER_DAYS` ngày
   */
  static autoCompleteCutoff(now: number) {
    return new Date(now - AUTO_COMPLETE_AFTER_DAYS * 864e5).toISOString();
  }

  transition(
    action: BookingAction,
    paid: boolean,
    delivered: boolean,
  ): BookingStatus {
    const transitions: Record<BookingAction, [BookingStatus[], BookingStatus]> =
      {
        accept: [['pending'], 'accepted'],
        reject: [['pending'], 'rejected'],
        cancel: [['pending', 'accepted'], 'cancelled'],
        start: [['accepted'], 'in_progress'],
        completeShoot: [['in_progress'], 'shot'],
        complete: [['shot'], 'completed'],
        confirmReceipt: [['shot'], 'completed'],
      };
    const rule = transitions[action];
    ensure(
      rule[0].includes(this.status),
      `Cannot ${action} booking in ${this.status}`,
      'conflict',
    );
    if (action === 'start')
      ensure(paid, 'Deposit must be paid before starting', 'conflict');
    if (action === 'complete' || action === 'confirmReceipt')
      ensure(
        paid && delivered,
        'Full payment and published gallery required',
        'conflict',
      );
    return (this.status = rule[1]);
  }
}
