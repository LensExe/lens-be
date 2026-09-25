import { ensure } from '@shared/domain/domain.error';

/** Quy tắc của gói chụp (booking plan) thợ tự niêm yết. */
export class BookingPlan {
  /**
   * Số ảnh retouch không được vượt số ảnh bàn giao.
   *
   * @param photoCount Số ảnh thợ cam kết giao
   * @param retouchedPhotoCount Số ảnh được chỉnh sửa kỹ
   * @returns Không trả gì; ném lỗi `invalid` (400) nếu retouch lớn hơn số ảnh giao
   */
  static assertPhotoCounts(photoCount: number, retouchedPhotoCount: number) {
    ensure(
      retouchedPhotoCount <= photoCount,
      'retouched_photo_count cannot exceed photo_count',
    );
  }

  /**
   * Gói đã có booking thì chỉ được tắt (`is_active = false`), không được xoá.
   *
   * @param bookingCount Số booking đang tham chiếu tới gói
   * @returns Không trả gì; ném lỗi `conflict` (409) nếu gói đã có booking
   */
  static assertRemovable(bookingCount: number) {
    ensure(
      bookingCount === 0,
      'Booking plan has bookings; deactivate it instead',
      'conflict',
    );
  }
}
