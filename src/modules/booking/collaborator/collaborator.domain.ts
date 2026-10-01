import { ensure } from '@shared/domain/domain.error';
import { BookingCollaboratorStatus } from '@shared/domain/values/booking.values';
export { BookingCollaboratorStatus };

/** Invitation status that still counts toward the percentage total (maximum 100%). */
const HOLDING_SHARE: readonly string[] = [
  BookingCollaboratorStatus.INVITED,
  BookingCollaboratorStatus.ACCEPTED,
];

/** Status that blocks reinviting the same photographer: the invitation is still active or the photographer declined it. */
const BLOCKS_REINVITE: readonly string[] = [
  ...HOLDING_SHARE,
  BookingCollaboratorStatus.DECLINED,
];

/** Data for creating a booking collaboration invitation. The invitee must be an approved, active photographer. */
export interface CollaborationInviteInput {
  bookingStatus: string;
  galleryPublished: boolean;
  ownerPhotographerId: string;
  inviteePhotographerId: string;
  sharePercent: number;
  /** The invitee is also the booking customer (one account can act as both a customer and a photographer). */
  inviteeIsCustomer: boolean;
  /** Existing invitations for the booking, in any status. */
  existing: readonly {
    photographer_id: string;
    status: string;
    share_percent: number;
  }[];
}

/** Action to apply to a pending invitation. */
export type CollaborationAction = 'accept' | 'decline' | 'revoke';

/** Maximum number of times a photographer can be invited to the same booking, including withdrawn invitations. */
export const MAX_INVITES_PER_PHOTOGRAPHER = 3;

/** Booking collaboration rules: invite, accept or decline, revoke, and split the photographer’s share. */
export class Collaboration {
  /**
   * Check whether the booking still allows photographer changes: it must be `accepted` or `in_progress`, and the gallery must not be published.
   *
   * @param booking Booking status and whether its gallery has been published.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
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
   * Create a new invitation after validating the rules.
   *
   * @param input Booking, invited photographer, and existing invitations used to create the new invitation.
   * @returns Invitation data to save with `status = 'invited'`.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static invite(input: CollaborationInviteInput) {
    Collaboration.assertOpen(input);
    ensure(
      input.inviteePhotographerId !== input.ownerPhotographerId,
      'Cannot invite yourself',
    );
    ensure(
      !input.inviteeIsCustomer,
      'Cannot invite the customer of this booking',
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
    ensure(
      input.existing.filter(
        (c) => c.photographer_id === input.inviteePhotographerId,
      ).length < MAX_INVITES_PER_PHOTOGRAPHER,
      'Photographer invited too many times for this booking',
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
   * Accept, decline, or revoke an invitation only while it is pending and the booking remains open.
   *
   * @param status Current invitation status.
   * @param action Action to perform.
   * @param booking Booking status and whether its gallery has been published.
   * @returns New invitation status.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
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
