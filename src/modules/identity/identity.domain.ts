import { ensure } from '@shared/domain/domain.error';
import { UserStatus } from '@shared/domain/values/user.values';

/** User state rules; the use case handles lookup, authorization and persistence. */
export class Identity {
  /**
   * Check whether the current status allows account registration.
   *
   * @param existingStatus Existing status, of type `UserStatus`.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  static assertCanRegister(existingStatus: UserStatus) {
    ensure(
      existingStatus === UserStatus.ACTIVE,
      'Account suspended',
      'forbidden',
    );
  }

  /**
   * Validate and apply an account status change requested by an administrator.
   *
   * @param adminUserId Admin user ID.
   * @param targetUserId Target user ID.
   * @param currentStatus Current status, of type `UserStatus`.
   * @param requestedStatus Requested status, of type `UserStatus`.
   * @returns Processed requestedStatus value.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static adminUpdateStatus(
    adminUserId: string,
    targetUserId: string,
    currentStatus: UserStatus,
    requestedStatus: UserStatus,
  ): UserStatus {
    ensure(
      adminUserId !== targetUserId,
      requestedStatus === UserStatus.BANNED
        ? 'Cannot ban own admin account'
        : 'Cannot change own admin status',
    );
    ensure(
      currentStatus !== UserStatus.BANNED ||
        requestedStatus === UserStatus.BANNED,
      'Banned account cannot be reactivated',
      'conflict',
    );
    return requestedStatus;
  }
}
