import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { Kafka, type Consumer } from 'kafkajs';
import type { ChatMessageCreatedEvent } from '@modules/ai-assistant';
import { AI_REPLY_QUEUE, type AiReplyJobData } from './ai-worker.constants';

@Injectable()
export class ChatEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatEventsConsumer.name);
  private consumer?: Consumer;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(AI_REPLY_QUEUE)
    private readonly queue: Queue<AiReplyJobData>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.readBoolean('AI_WORKER_ENABLED', false)) {
      this.logger.log(
        'AI worker is disabled; set AI_WORKER_ENABLED=true to start it',
      );
      return;
    }
    if (!this.readBoolean('KAFKA_ENABLED', false)) {
      this.logger.warn('AI worker is enabled but Kafka is disabled');
      return;
    }

    const brokers = this.value('KAFKA_BROKERS', 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    if (brokers.length === 0) {
      throw new Error('KAFKA_BROKERS must contain at least one broker');
    }

    const username = this.config.get<string>('KAFKA_USERNAME') || undefined;
    const password = this.config.get<string>('KAFKA_PASSWORD') || undefined;
    if (Boolean(username) !== Boolean(password)) {
      throw new Error(
        'Set both KAFKA_USERNAME and KAFKA_PASSWORD, or leave both unset',
      );
    }

    const kafka = new Kafka({
      clientId: this.value('AI_WORKER_CLIENT_ID', 'lens-ai-worker'),
      brokers,
      ssl: this.readBoolean('KAFKA_SSL', false),
      ...(username && password
        ? { sasl: { mechanism: 'plain' as const, username, password } }
        : {}),
    });
    const topic = this.value(
      'KAFKA_CHAT_EVENTS_TOPIC',
      'chat.conversation.events.v1',
    );
    const consumer = kafka.consumer({
      groupId: this.value('AI_WORKER_GROUP_ID', 'lens-ai-reply-worker'),
    });
    this.consumer = consumer;

    try {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ message }) => {
          const raw = message.value?.toString('utf8');
          if (!raw) return;

          let event: unknown;
          try {
            event = JSON.parse(raw);
          } catch {
            this.logger.warn('Ignoring invalid JSON on chat event topic');
            return;
          }

          const parsed = this.parseMessageCreatedEvent(event);
          if (!parsed) return;

          try {
            const jobId = `ai-${this.stableId(parsed.event_id)}`;
            const delayMs = this.readDelayMs();
            await this.queue.add(
              'auto-reply',
              { event: parsed, enqueuedAt: Date.now(), presenceChecks: 0 },
              {
                jobId,
                delay: delayMs,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10000 },
                removeOnFail: { age: 30 * 24 * 60 * 60 },
              },
            );
            this.logger.log(
              `AI event queued eventId=${parsed.event_id} messageId=${parsed.data.message.id} channelId=${parsed.data.channel_id} delayMs=${delayMs}`,
            );
          } catch (error) {
            this.logger.error(
              `AI event ${parsed.event_id} failed: ${this.errorMessage(error)}`,
            );
            // Infrastructure failures must leave the Kafka offset uncommitted.
            // Model failures are recorded by AiAssistantService as review rows.
            throw error;
          }
        },
      });
      this.running = true;
      this.logger.log(
        `Consuming ${topic} as ${this.value('AI_WORKER_GROUP_ID', 'lens-ai-reply-worker')} autoReplyEnabled=${this.readBoolean('AI_AUTO_REPLY_ENABLED', false)}`,
      );
    } catch (error) {
      await consumer.disconnect().catch(() => undefined);
      this.consumer = undefined;
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer && this.running) await this.consumer.stop();
    this.running = false;
    await this.consumer?.disconnect();
  }

  private parseMessageCreatedEvent(
    value: unknown,
  ): ChatMessageCreatedEvent | undefined {
    if (!value || typeof value !== 'object') {
      this.logger.warn('Ignoring chat event reason=invalid_event_shape');
      return undefined;
    }
    const event = value as Record<string, unknown>;
    const eventType =
      typeof event.event_type === 'string' ? event.event_type : 'unknown';
    const eventId =
      typeof event.event_id === 'string' ? event.event_id : 'unknown';
    if (
      event.event_type !== 'chat.message.created.v1' ||
      event.schema_version !== 1 ||
      event.producer !== 'chat-service' ||
      event.aggregate_type !== 'channel' ||
      typeof event.event_id !== 'string' ||
      !event.data ||
      typeof event.data !== 'object'
    ) {
      this.logger.log(
        `AI event ignored eventType=${eventType} eventId=${eventId} reason=unsupported_event_envelope`,
      );
      return undefined;
    }

    const data = event.data as Record<string, unknown>;
    const message = data.message as Record<string, unknown> | undefined;
    if (
      typeof data.channel_id !== 'string' ||
      !Array.isArray(data.participant_ids) ||
      !data.participant_ids.every(
        (participant) => typeof participant === 'string',
      ) ||
      !message ||
      typeof message.id !== 'string' ||
      typeof message.sender_id !== 'string' ||
      typeof message.content !== 'string' ||
      typeof message.type !== 'string' ||
      typeof message.seq !== 'number' ||
      !Number.isInteger(message.seq) ||
      message.seq < 1 ||
      (message.sender_kind !== undefined &&
        typeof message.sender_kind !== 'string')
    ) {
      this.logger.warn(
        `AI event ignored eventType=${eventType} eventId=${eventId} reason=malformed_payload`,
      );
      return undefined;
    }

    return value as ChatMessageCreatedEvent;
  }

  private value(name: string, fallback: string): string {
    return this.config.get<string>(name)?.trim() || fallback;
  }

  private readBoolean(name: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(name)?.trim().toLowerCase();
    if (!raw) return fallback;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`${name} must be true or false`);
  }

  private readDelayMs(): number {
    const raw = this.config.get<string>('AI_OFFLINE_REPLY_DELAY_MS');
    const value = raw ? Number(raw) : 15000;
    if (!Number.isInteger(value) || value < 0 || value > 300000) {
      throw new Error('AI_OFFLINE_REPLY_DELAY_MS must be between 0 and 300000');
    }
    return value;
  }

  private stableId(eventId: string): string {
    return createHash('sha256').update(eventId).digest('hex');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
