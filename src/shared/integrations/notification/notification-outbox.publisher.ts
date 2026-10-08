import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import { LensGateway } from '@features/socketio/socketio.gateway';
import { KafkaNotificationProducer } from './kafka-notification.producer';

interface NotificationDraft {
  type: 'order_placed' | 'payment_success';
  title: string;
  message: string;
  data: Record<string, unknown>;
}

/** Routes supported notification types to Kafka and keeps legacy events on Socket.IO. */
@Injectable()
export class NotificationOutboxPublisher extends RealtimePublisher {
  constructor(
    private readonly dataSource: DataSource,
    private readonly kafka: KafkaNotificationProducer,
    private readonly legacy: LensGateway,
  ) {
    super();
  }

  async publish(
    userIds: string[],
    topic: string,
    payload: unknown,
  ): Promise<void> {
    const data = this.asRecord(payload);
    const draft = this.notificationDraft(topic, data);
    if (!this.kafka.enabled || !draft) {
      await this.legacy.publish(userIds, topic, payload);
      return;
    }

    const recipientIds = [...new Set(userIds)];
    if (recipientIds.length === 0) return;

    const outboxEventId = data.event_id;
    if (typeof outboxEventId !== 'string' || outboxEventId.length === 0) {
      throw new Error('Outbox notification is missing its stable event_id');
    }

    const users = await this.dataSource.manager.findBy(EntitySchemas.users, {
      id: In(recipientIds),
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    const events = recipientIds.map((recipientId) => {
      const user = usersById.get(recipientId);
      if (!user?.keycloak_id) {
        throw new Error(
          `Cannot map notification recipient ${recipientId} to a Keycloak subject`,
        );
      }

      const eventId = `lens-backend:${outboxEventId}:${user.keycloak_id}`;
      if (eventId.length > 256) {
        throw new Error('Notification eventId exceeds the 256-character limit');
      }

      return {
        key: user.keycloak_id,
        event: {
          eventId,
          eventType: topic,
          priority: 'instant' as const,
          notification: {
            userId: user.keycloak_id,
            title: draft.title,
            message: draft.message,
            type: draft.type,
            data: draft.data,
          },
        },
      };
    });

    for (const { event, key } of events) {
      await this.kafka.publish(event, key);
    }
  }

  private notificationDraft(
    topic: string,
    payload: Record<string, unknown>,
  ): NotificationDraft | undefined {
    switch (topic) {
      case 'booking.created':
        return {
          type: 'order_placed',
          title: 'Yêu cầu đặt lịch mới',
          message: 'Một yêu cầu đặt lịch chụp mới đã được tạo.',
          data: this.pick(payload, ['booking_id', 'status']),
        };
      case 'payment.received':
        return {
          type: 'payment_success',
          title: 'Đã nhận thanh toán',
          message: 'Thanh toán cho lịch chụp đã được ghi nhận.',
          data: this.pick(payload, ['booking_id', 'transaction_id']),
        };
      case 'payment.wallet_topped_up':
        return {
          type: 'payment_success',
          title: 'Nạp ví thành công',
          message: 'Khoản nạp vào ví đã được ghi nhận.',
          data: this.pick(payload, ['transaction_id', 'amount']),
        };
      case 'payment.subscription':
        return {
          type: 'payment_success',
          title: 'Thanh toán gói thành công',
          message: 'Thanh toán cho gói photographer đã được ghi nhận.',
          data: this.pick(payload, ['subscription_id', 'transaction_id']),
        };
      default:
        return undefined;
    }
  }

  private pick(
    source: Record<string, unknown>,
    fields: string[],
  ): Record<string, unknown> {
    return Object.fromEntries(
      fields
        .filter((field) => source[field] !== undefined)
        .map((field) => [field, source[field]]),
    );
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return {};
    return value as Record<string, unknown>;
  }
}
