import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import { KafkaProducer } from './kafka.producer';

interface NotificationDraft {
  type:
    'order_placed' | 'payment_success' | 'order_cancelled' | 'booking_update';
  title: string;
  message: string;
  data: Record<string, unknown>;
  realtimeEventType?: string;
}

/** Routes supported notification events to the notification service through Kafka. */
@Injectable()
export class NotificationOutboxPublisher extends RealtimePublisher {
  constructor(
    private readonly dataSource: DataSource,
    private readonly kafka: KafkaProducer,
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
    if (!draft) throw new Error(`Unsupported notification topic: ${topic}`);
    if (!this.kafka.enabled)
      throw new Error('Kafka notification publishing is disabled');

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
          eventType: draft.realtimeEventType ?? topic,
          priority: 'instant' as const,
          notification: {
            userId: user.keycloak_id,
            title: draft.title,
            message: draft.message,
            type: draft.type,
            data: {
              ...draft.data,
              ...(draft.realtimeEventType
                ? {
                    event_id: eventId,
                    event_type: draft.realtimeEventType,
                    ...(typeof data.occurred_at === 'string'
                      ? { occurred_at: data.occurred_at }
                      : {}),
                  }
                : {}),
            },
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
          realtimeEventType: 'booking.created',
        };
      case 'booking.cancelled':
        return {
          type: 'order_cancelled',
          title: 'Đặt lịch đã bị hủy',
          message: 'Yêu cầu đặt lịch chụp đã bị hủy.',
          data: this.pick(payload, ['booking_id', 'status']),
          realtimeEventType: 'booking.cancelled',
        };
      case 'payment.received':
        if (payload.payment_phase === 'deposit')
          return {
            type: 'payment_success',
            title: 'Đã nhận tiền cọc',
            message: 'Khoản tiền cọc cho lịch chụp đã được ghi nhận.',
            data: this.pick(payload, [
              'booking_id',
              'transaction_id',
              'payment_phase',
              'amount',
              'status',
            ]),
            realtimeEventType: 'booking.deposit_paid',
          };
        if (payload.payment_phase === 'remaining')
          return {
            type: 'payment_success',
            title: 'Đã thanh toán phần còn lại',
            message: 'Khoản thanh toán còn lại cho lịch chụp đã được ghi nhận.',
            data: this.pick(payload, [
              'booking_id',
              'transaction_id',
              'payment_phase',
              'amount',
              'status',
            ]),
            realtimeEventType: 'booking.remaining_paid',
          };
        return {
          type: 'payment_success',
          title: 'Đã nhận thanh toán',
          message: 'Thanh toán cho lịch chụp đã được ghi nhận.',
          data: this.pick(payload, [
            'booking_id',
            'transaction_id',
            'amount',
            'status',
          ]),
          realtimeEventType: 'booking.payment_received',
        };
      case 'booking.accepted':
        return {
          type: 'booking_update',
          title: 'Thợ đã chấp nhận lịch chụp',
          message: 'Yêu cầu đặt lịch của bạn đã được chấp nhận.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.accepted',
        };
      case 'booking.in_progress':
        return {
          type: 'booking_update',
          title: 'Buổi chụp đã bắt đầu',
          message: 'Buổi chụp trong lịch đặt đã bắt đầu.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.in_progress',
        };
      case 'booking.shot':
        return {
          type: 'booking_update',
          title: 'Buổi chụp đã hoàn tất',
          message: 'Buổi chụp đã hoàn tất.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.shot',
        };
      case 'booking.completed':
        return {
          type: 'booking_update',
          title: 'Booking đã hoàn tất',
          message: 'Lịch chụp đã hoàn tất.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.completed',
        };
      case 'booking.rejected':
        return {
          type: 'booking_update',
          title: 'Yêu cầu đặt lịch bị từ chối',
          message: 'Yêu cầu đặt lịch chụp đã bị từ chối.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.rejected',
        };
      case 'booking.expired':
        return {
          type: 'booking_update',
          title: 'Yêu cầu đặt lịch đã hết hạn',
          message: 'Yêu cầu đặt lịch chụp đã hết hạn.',
          data: this.pick(payload, [
            'booking_id',
            'from_status',
            'status',
            'updated_at',
          ]),
          realtimeEventType: 'booking.expired',
        };
      case 'gallery.ready':
        return {
          type: 'booking_update',
          title: 'Ảnh đã được giao',
          message: 'Bộ ảnh của lịch chụp đã sẵn sàng.',
          data: this.pick(payload, ['booking_id', 'status']),
          realtimeEventType: 'booking.gallery_ready',
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
