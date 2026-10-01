import { ensure } from '@shared/domain/domain.error';
import {
  BookingStatus,
  BookingActorRole,
  OCCUPIED_BOOKING_STATUSES,
} from '@shared/domain/values/booking.values';
import { isOccupied } from '@shared/domain/rules/booking.rules';
import { money } from '@shared/domain/rules/money.rules';
import { interval, overlaps } from '@shared/domain/rules/time-range.rules';
import { WorkSchedule } from '@shared/domain/rules/work-schedule.rules';
import type { WorkingShift } from '@shared/domain/types/work-schedule.types';
export { BookingStatus, OCCUPIED_BOOKING_STATUSES, BookingActorRole };

export interface BookingDraftInput {
  customerId: string;
  customerUserId: string;
  /** The single photographer responsible for this booking. */
  photographerId: string;
  photographerUserId: string;
  photographerStatus: string;
  /** Photographer approved by an admin (`verification_status = 'verified'`). */
  photographerVerified: boolean;
  photographerAvailable: boolean;
  planId: string;
  planPhotographerId: string;
  planActive: boolean;
  planPrice: number;
  /** Plan duration; the `from`–`to` interval must be exactly this many minutes. */
  planDurationMinutes: number;
  location: string;
  from: string;
  to: string;
  /** Photographer weekly schedule; an empty schedule uses the default 08:00–20:00 hours. */
  schedule: readonly WorkingShift[];
  blockedTimes: readonly { from: string; to: string }[];
  /** Other photographer bookings that overlap the time range (`customer_id` identifies duplicate requests from the same customer). */
  bookings: readonly {
    from: string;
    to: string;
    status: string;
    customer_id?: string;
  }[];
  /** Number of pending requests this customer has with this photographer. */
  openRequestsWithPhotographer: number;
  /** Total number of pending requests this customer has. */
  openRequests: number;
  now: number;
}

/** Number of days after gallery publication before a booking is auto-completed if the customer has not confirmed receipt. */
export const AUTO_COMPLETE_AFTER_DAYS = 7;

/** Actions supported by the booking state machine. */
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

/** Hours the photographer has to respond to a request; it expires after that or when the photo shoot starts. */
export const PENDING_EXPIRES_AFTER_HOURS = 24;

/** Booking payment data used by the domain to decide whether the shoot can start or the booking can complete. */
export interface BookingPayment {
  /** Total amount paid by the customer (deposit plus remaining balance, for `paid` transactions). */
  paidAmount: number;
  depositAmount: number;
  totalAmount: number;
  galleryPublished: boolean;
}

/** Hours the customer has to pay the deposit after acceptance; the booking expires after that or when the shoot starts. */
export const PAYMENT_DUE_AFTER_HOURS = 24;

/** Maximum number of pending requests a customer may have with one photographer and across all photographers. */
export const MAX_OPEN_REQUESTS_PER_PHOTOGRAPHER = 3;
export const MAX_OPEN_REQUESTS = 10;

export class Booking {
  /** @param status Current booking status. */
  constructor(public status: BookingStatus) {}

  /**
   * Validate booking creation for exactly one photographer and calculate payment: the deposit is the total plan price rounded up to 30%.
   *
   * @param input Customer, photographer, plan, schedule, and blocked or overlapping booking intervals.
   * @returns Pending booking data to save; throws HTTP 400, 404, or 409 when business rules are violated.
   * @throws {DomainError} Thrown when required data or a resource is missing, input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
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
   * Available time range for holding a booking: it must not overlap a blocked range or an existing booking that
   * occupies the photographer’s schedule (`pending` requests do not count). Used during booking creation and acceptance.
   *
   * @param range Booking time range.
   * @param blockedTimes Photographer’s blocked time ranges.
   * @param bookings Other bookings belonging to the photographer.
   * @returns Returns no value; throws HTTP 409 if the time conflicts.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
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
   * Actor performing the booking action, recorded in the status history.
   * Prefer the customer or photographer role associated with the booking, then fall back to system roles.
   *
   * @param userId User performing the operation.
   * @param customerUserId Customer user ID for the booking.
   * @param photographerUserId Photographer user ID for the booking.
   * @param roles Actor roles from the token.
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
   * Pending request expiration cutoff: requests created at or before this time have gone unanswered for more than 24 hours.
   * A request also expires when the photo shoot starts (`from <= now`); the use case applies that condition.
   *
   * @param now Current time in milliseconds.
   * @returns ISO UTC time calculated by subtracting `PENDING_EXPIRES_AFTER_HOURS` from `now`.
   */
  static pendingExpiryCutoff(now: number) {
    return new Date(now - PENDING_EXPIRES_AFTER_HOURS * 36e5).toISOString();
  }

  /**
   * A request is still eligible for acceptance if it was sent within the last 24 hours and the photo shoot has not started.
   * Uses the same rule as the expiration job, so a photographer cannot accept an expired request while the job is waiting to run.
   *
   * @param booking Booking `created_at` time (when submitted) and `from` time (when the photo shoot starts).
   * @param now Current time in milliseconds.
   * @returns Returns no value; throws HTTP 409 if the booking has expired.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
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
   * Payment deadline: a booking accepted at or before this time is overdue if the deposit has not been paid in full.
   * A booking is also overdue when the photo shoot starts (`from <= now`); the use case applies that condition.
   *
   * @param now Current time in milliseconds.
   * @returns ISO UTC time calculated by subtracting `PAYMENT_DUE_AFTER_HOURS` from `now`.
   */
  static paymentDueCutoff(now: number) {
    return new Date(now - PAYMENT_DUE_AFTER_HOURS * 36e5).toISOString();
  }

  /**
   * Auto-completion cutoff: a booking with a gallery published at or before this time is due.
   * The `shot` status and full-payment requirement are still checked by `transition('complete')`.
   *
   * @param now Current time in milliseconds.
   * @returns ISO UTC time calculated by subtracting `AUTO_COMPLETE_AFTER_DAYS` from `now`.
   */
  static autoCompleteCutoff(now: number) {
    return new Date(now - AUTO_COMPLETE_AFTER_DAYS * 864e5).toISOString();
  }

  /**
   * Whether this action needs to know how much the customer has paid (starting a shoot requires the deposit; completion requires full payment).
   * The use case reads transactions only when needed.
   *
   * @param action Action to perform.
   * @returns `true` if the amount paid must be checked.
   */
  static needsPayment(action: BookingAction) {
    return ['start', 'complete', 'confirmReceipt'].includes(action);
  }

  /**
   * Transition to the next status for the requested action. The domain determines payment thresholds: starting the shoot requires the deposit,
   * and completion requires full payment and a published gallery.
   *
   * @param action Action to perform.
   * @param payment Amount paid, deposit, total amount, and whether the gallery has been published.
   * @returns New status; throws HTTP 409 if the action is invalid for the current status or its prerequisites are not met.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
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
