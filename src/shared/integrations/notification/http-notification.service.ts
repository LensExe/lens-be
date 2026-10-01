import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosService } from '../axios/axios.service';
import { NotificationPort, type OtpEmail } from './notification.port';

/** Maximum wait time for a single notification service request (ms). */
const NOTIFICATION_TIMEOUT_MS = 5000;

/** Call the notification service over HTTP (`notification.serviceUrl`). */
@Injectable()
export class HttpNotificationService extends NotificationPort {
  private readonly logger = new Logger(HttpNotificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly axiosService: AxiosService,
  ) {
    super();
  }

  /**
   * Send an email containing an OTP to the supplied address.
   *
   * @param email Email address associated with the operation.
   * @returns No value is returned.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  async sendOtpEmail(email: OtpEmail): Promise<void> {
    const client = this.client();
    try {
      await client.post('/api/v1/emails/send-otp', {
        to: email.to,
        otp: email.otp,
        event: email.event,
        expired_in_minutes: email.expiresInMinutes,
      });
    } catch (error) {
      this.logger.error(
        `Send OTP email failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Notification service is unavailable',
      );
    }
  }

  /**
   * Get the configured HTTP client for the notification service.
   *
   * @returns Result returned by `create`.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  private client() {
    const baseURL = this.config.get<string>('notification.serviceUrl');
    if (!baseURL) {
      throw new ServiceUnavailableException(
        'Notification service is not configured',
      );
    }
    return this.axiosService.create({
      key: 'notification',
      config: {
        baseURL: baseURL.replace(/\/$/, ''),
        timeout: NOTIFICATION_TIMEOUT_MS,
      },
    });
  }
}
