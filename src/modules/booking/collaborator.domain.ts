import { ensure } from '@shared/domain/domain.error';
import { BookingCollaboratorStatus } from '@shared/database/entities/booking-collaborator.entity';
export { BookingCollaboratorStatus };

/** Trạng thái lời mời còn chiếm % (tính vào tổng ≤ 100). */
const HOLDING_SHARE: readonly string[] = [
  BookingCollaboratorStatus.INVITED,
  BookingCollaboratorStatus.ACCEPTED,
];

/** Trạng thái chặn mời lại cùng thợ: còn hiệu lực hoặc thợ đã từ chối. */
const BLOCKS_REINVITE: readonly string[] = [
  ...HOLDING_SHARE,
  BookingCollaboratorStatus.DECLINED,
];

/** Dữ kiện để tạo lời mời thợ liên kết. Thợ được mời đã được kiểm là thợ đã duyệt, active. */
export interface CollaborationInviteInput {
  bookingStatus: string;
  galleryPublished: boolean;
  ownerPhotographerId: string;
  inviteePhotographerId: string;
  sharePercent: number;
  /** Các lời mời đã có của booking (mọi trạng thái) */
  existing: readonly {
    photographer_id: string;
    status: string;
    share_percent: number;
  }[];
}

/** Hành động trên một lời mời đang chờ. */
export type CollaborationAction = 'accept' | 'decline' | 'revoke';

/** Quy tắc thợ liên kết của booking: mời, nhận/từ chối, rút; chia % phần thợ nhận. */
export class Collaboration {
  /**
   * Kiểm tra booking còn cho thay đổi thợ liên kết: đang accepted / in_progress và gallery chưa publish.
   *
   * @param booking Trạng thái booking và gallery đã publish chưa
   */
  static assertOpen(booking: {
    bookingStatus: string;
    galleryPublished: boolean;
  }) {
    ensure(
      ['accepted', 'in_progress'].includes(booking.bookingStatus) &&
        !booking.galleryPublished,
      'Booking is not open for collaborators',
      'conflict',
    );
  }

  /**
   * Tạo lời mời mới sau khi kiểm luật.
   *
   * @param input Dữ kiện booking, thợ được mời và các lời mời đã có
   * @returns Dữ liệu lời mời để lưu (`status = 'invited'`)
   */
  static invite(input: CollaborationInviteInput) {
    Collaboration.assertOpen(input);
    ensure(
      input.inviteePhotographerId !== input.ownerPhotographerId,
      'Cannot invite yourself',
    );
    ensure(
      Number.isInteger(input.sharePercent) &&
        input.sharePercent >= 1 &&
        input.sharePercent <= 100,
      'Share must be a whole percent from 1 to 100',
    );
    ensure(
      !input.existing.some(
        (c) =>
          c.photographer_id === input.inviteePhotographerId &&
          BLOCKS_REINVITE.includes(c.status),
      ),
      'Photographer already invited',
      'conflict',
    );
    const held = input.existing
      .filter((c) => HOLDING_SHARE.includes(c.status))
      .reduce((sum, c) => sum + c.share_percent, 0);
    ensure(
      held + input.sharePercent <= 100,
      'Total share cannot exceed 100%',
      'conflict',
    );
    return {
      photographer_id: input.inviteePhotographerId,
      share_percent: input.sharePercent,
      status: BookingCollaboratorStatus.INVITED,
    };
  }

  /**
   * Trả lời (accept / decline) hoặc rút (revoke) một lời mời; chỉ khi lời mời còn chờ và booking còn mở.
   *
   * @param status Trạng thái hiện tại của lời mời
   * @param action Hành động
   * @param booking Trạng thái booking và gallery đã publish chưa
   * @returns Trạng thái mới của lời mời
   */
  static respond(
    status: string,
    action: CollaborationAction,
    booking: { bookingStatus: string; galleryPublished: boolean },
  ): BookingCollaboratorStatus {
    ensure(
      status === BookingCollaboratorStatus.INVITED,
      'Invitation is no longer pending',
      'conflict',
    );
    Collaboration.assertOpen(booking);
    return {
      accept: BookingCollaboratorStatus.ACCEPTED,
      decline: BookingCollaboratorStatus.DECLINED,
      revoke: BookingCollaboratorStatus.REVOKED,
    }[action];
  }
}
