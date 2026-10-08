/** OTP email content sent through the notification service. */
export interface OtpEmail {
  /** Recipient email address. */
  to: string;
  /** One-time password (OTP). */
  otp: string;
  /** Event used by the notification service to select a template, for example `FORGOT_PASSWORD` or `VERIFY_EMAIL`. */
  event: string;
  /** Number of minutes the OTP remains valid, shown in the email. */
  expiresInMinutes: number;
}

/**
 * Port for sending notifications to external services (email; push and SMS may be added later).
 *
 * Business modules inject `NotificationPort` instead of making HTTP calls directly.
 * Current adapter: `HttpNotificationService`.
 */
export abstract class NotificationPort {
  /**
   * Send an OTP email. Throw `ServiceUnavailableException` if no service is configured or the service does not respond.
   *
   * @param email Email address associated with the operation.
   * @returns Result of the operation described above.
   */
  abstract sendOtpEmail(email: OtpEmail): Promise<void>;
}
