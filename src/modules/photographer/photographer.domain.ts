import { VerificationStatus } from '@shared/database/entities/photographer.entity';
import { ensure } from '@shared/domain/domain.error';

/**
 * Quy tắc duyệt hồ sơ thợ: customer gửi hồ sơ → `pending` → admin duyệt `verified` hoặc từ chối `rejected`.
 */
export class PhotographerApplication {
  /**
   * Kiểm tra customer có được gửi (hoặc gửi lại) hồ sơ làm thợ không.
   *
   * @param current Trạng thái hồ sơ hiện có của user; `undefined` nếu chưa từng gửi
   * @returns Không trả gì; ném `conflict` (409) nếu hồ sơ đang chờ duyệt hoặc đã được duyệt
   */
  static assertCanSubmit(current: VerificationStatus | undefined) {
    ensure(
      current !== VerificationStatus.PENDING,
      'Photographer application is pending review',
      'conflict',
    );
    ensure(
      current !== VerificationStatus.VERIFIED,
      'User is already a verified photographer',
      'conflict',
    );
  }

  /**
   * Kiểm tra admin có được duyệt / từ chối hồ sơ không. Chỉ hồ sơ `pending` mới xử lý được.
   *
   * @param current Trạng thái hồ sơ hiện tại
   * @returns Không trả gì; ném `conflict` (409) nếu hồ sơ không ở `pending`
   */
  static assertReviewable(current: VerificationStatus) {
    ensure(
      current === VerificationStatus.PENDING,
      `Cannot review photographer application in ${current}`,
      'conflict',
    );
  }
}
