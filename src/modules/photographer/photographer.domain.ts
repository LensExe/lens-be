import { VerificationStatus } from '@shared/domain/values/photographer.values';
import { ensure } from '@shared/domain/domain.error';
import {
  isPhotographyStyle,
  type PhotographyStyle,
} from '@shared/domain/values/photography-style.values';

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
   * Admin không tự duyệt / từ chối hồ sơ thợ của chính mình.
   *
   * @param applicantUserId User đã gửi hồ sơ
   * @param reviewerUserId User admin đang duyệt
   * @returns Không trả gì; 403 nếu là cùng một người
   */
  static assertNotOwnApplication(
    applicantUserId: string,
    reviewerUserId: string,
  ) {
    ensure(
      applicantUserId !== reviewerUserId,
      'Cannot review your own application',
      'forbidden',
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

/** Quy tắc sửa hồ sơ thợ sau khi đã gửi. */
export class PhotographerProfile {
  static readonly MAX_STYLES = 200;

  /** Chuẩn hoá và kiểm tra style trước khi ghi vào hồ sơ photographer. */
  static normalizeStyles(styles: string[]): PhotographyStyle[] {
    ensure(
      styles.length <= PhotographerProfile.MAX_STYLES,
      `Maximum ${PhotographerProfile.MAX_STYLES} styles allowed`,
      'conflict',
    );

    const normalized = styles.map((style) => style.trim().toLowerCase());
    ensure(
      normalized.every(Boolean),
      'Photographer styles must not be empty',
      'invalid',
    );
    ensure(
      normalized.every(isPhotographyStyle),
      'Unsupported photography style',
      'invalid',
    );
    ensure(
      new Set(normalized).size === normalized.length,
      'Photographer styles must be unique',
      'invalid',
    );

    return normalized;
  }

  /**
   * Mã số thuế khoá sau khi hồ sơ được duyệt (liên quan thuế và tiền trả cho thợ); đổi phải qua admin.
   * Mô tả, phong cách, khu vực vẫn sửa tự do.
   *
   * @param status Trạng thái duyệt hiện tại
   * @param current Mã số thuế đang lưu
   * @param next Mã số thuế gửi lên; `undefined` nếu không đổi
   * @returns Không trả gì; 400 nếu hồ sơ đã duyệt mà mã số thuế khác
   */
  static assertTaxCodeEditable(
    status: VerificationStatus,
    current: string | null,
    next: string | undefined,
  ) {
    ensure(
      status !== VerificationStatus.VERIFIED ||
        next === undefined ||
        next === current,
      'Tax code cannot be changed after approval; contact support',
    );
  }
}
