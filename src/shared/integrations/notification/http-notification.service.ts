import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosService } from '../axios/axios.service';
import { NotificationPort, type OtpEmail } from './notification.port';

/** Thời gian chờ tối đa một lần gọi notification service (ms). */
const NOTIFICATION_TIMEOUT_MS = 5000;

/** Gọi notification service qua HTTP (`notification.serviceUrl`). */
@Injectable()
export class HttpNotificationService extends NotificationPort {
  private readonly logger = new Logger(HttpNotificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly axiosService: AxiosService,
  ) {
    super();
  }

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
