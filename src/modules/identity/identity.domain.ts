import { ensure } from '@shared/domain/domain.error';
import { UserStatus } from '@shared/database';

/** User state rules; the use case handles lookup, authorization and persistence. */
export class Identity {
  static assertCanRegister(existingStatus: UserStatus) {
    ensure(
      existingStatus === UserStatus.ACTIVE,
      'Account suspended',
      'forbidden',
    );
  }

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
