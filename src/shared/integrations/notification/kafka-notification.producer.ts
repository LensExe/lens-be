import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Producer } from 'kafkajs';
import type { KafkaConfig } from '@shared/platform/env/types';

export interface NotificationKafkaEvent {
  eventId: string;
  eventType: string;
  priority: 'instant' | 'emergency';
  notification: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, unknown>;
  };
}

/** Publishes notification events to the notification service's Kafka topic. */
@Injectable()
export class KafkaNotificationProducer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(KafkaNotificationProducer.name);
  private readonly settings: KafkaConfig;
  private readonly producer?: Producer;
  private connecting?: Promise<void>;
  private connected = false;

  constructor(config: ConfigService) {
    this.settings = config.get<KafkaConfig>('kafka') ?? {
      enabled: false,
      brokers: ['localhost:9092'],
      clientId: 'lens-backend',
      notificationEventsTopic: 'notification.events',
      ssl: false,
    };

    if (!this.settings.enabled) return;
    if (this.settings.brokers.length === 0) {
      throw new Error('KAFKA_BROKERS must contain at least one broker');
    }
    if (Boolean(this.settings.username) !== Boolean(this.settings.password)) {
      throw new Error(
        'Set both KAFKA_USERNAME and KAFKA_PASSWORD, or leave both unset',
      );
    }

    const sasl =
      this.settings.username && this.settings.password
        ? {
            mechanism: 'plain' as const,
            username: this.settings.username,
            password: this.settings.password,
          }
        : undefined;
    const kafka = new Kafka({
      clientId: this.settings.clientId,
      brokers: this.settings.brokers,
      ssl: this.settings.ssl,
      ...(sasl ? { sasl } : {}),
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
  }

  get enabled(): boolean {
    return this.settings.enabled;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Kafka notification publishing is disabled');
      return;
    }
    try {
      await this.ensureConnected();
      this.logger.log(
        `Connected to Kafka topic ${this.settings.notificationEventsTopic}`,
      );
    } catch (error) {
      this.logger.error(
        `Kafka is unavailable; the outbox will retry notification events: ${this.errorMessage(error)}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.producer || !this.connected) return;
    try {
      await this.producer.disconnect();
    } catch (error) {
      this.logger.warn(`Kafka disconnect failed: ${this.errorMessage(error)}`);
    } finally {
      this.connected = false;
    }
  }

  async publish(event: NotificationKafkaEvent, key: string): Promise<void> {
    if (!this.enabled || !this.producer) {
      throw new Error('Kafka notification publishing is disabled');
    }
    await this.ensureConnected();
    await this.producer.send({
      topic: this.settings.notificationEventsTopic,
      acks: -1,
      messages: [{ key, value: JSON.stringify(event) }],
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    const producer = this.producer;
    if (!producer) throw new Error('Kafka producer is not configured');

    if (!this.connecting) {
      const connection = producer.connect().then(() => {
        this.connected = true;
      });
      this.connecting = connection;
      try {
        await connection;
      } finally {
        if (this.connecting === connection) this.connecting = undefined;
      }
      return;
    }
    await this.connecting;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
