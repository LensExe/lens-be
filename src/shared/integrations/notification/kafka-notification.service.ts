import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { KafkaNotificationProducer } from './kafka-notification.producer';
import { NotificationPort, type OtpEmail } from './notification.port';

/** Sends transactional email commands to Notification through Kafka. */
@Injectable()
export class KafkaNotificationService extends NotificationPort {
  constructor(
    private readonly producer: KafkaNotificationProducer,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async sendOtpEmail(email: OtpEmail): Promise<void> {
    const to = email.to.trim().toLowerCase();
    try {
      await this.producer.publishMailCommand(
        {
          eventId: `lens-backend:otp:${randomUUID()}`,
          eventType: 'auth.otp.requested.v1',
          jobName: 'send-otp-email',
          to,
          variables: {
            appName: this.config.get<string>('MAIL_APP_NAME', 'Lens'),
            userName: email.userName?.trim() || 'bạn',
            otpCode: email.otp,
            expiresInMinutes: String(email.expiresInMinutes),
            year: String(new Date().getUTCFullYear()),
            event: email.event,
          },
        },
        createHash('sha256').update(to).digest('hex'),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        `Notification Kafka is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
