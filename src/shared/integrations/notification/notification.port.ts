/** Nội dung email OTP gửi qua notification service. */
export interface OtpEmail {
  /** Email người nhận */
  to: string;
  /** Mã OTP */
  otp: string;
  /** Sự kiện để notification service chọn template, ví dụ `FORGOT_PASSWORD`, `VERIFY_EMAIL` */
  event: string;
  /** Số phút OTP còn hiệu lực, hiển thị trong email */
  expiresInMinutes: number;
}

/**
 * Cổng gửi thông báo ra service bên ngoài (email, sau này thêm push/SMS).
 *
 * Module nghiệp vụ inject `NotificationPort`, không gọi HTTP trực tiếp.
 * Adapter hiện tại: `HttpNotificationService`.
 */
export abstract class NotificationPort {
  /** Gửi email OTP. Ném `ServiceUnavailableException` khi chưa cấu hình hoặc service không phản hồi. */
  abstract sendOtpEmail(email: OtpEmail): Promise<void>;
}
