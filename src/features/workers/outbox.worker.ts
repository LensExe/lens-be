import { EntitySchemas, updateEntity } from '@shared/database';
import { DataSource, IsNull } from 'typeorm';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';

/** Maximum number of failed publish attempts before moving an event to the dead-letter queue (`failed_at`). */
export const MAX_OUTBOX_ATTEMPTS = 5;

@Injectable()
export class OutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OutboxWorker.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimePublisher,
  ) {}

  /**
   * Start the background task after the application finishes starting.
   *
   * @returns No value is returned.
   */
  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.tick(), 2000);
    this.timer.unref();
  }

  /**
   * Release resources when the application shuts down.
   *
   * @returns No value is returned.
   */
  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /**
   * Run one processing cycle for the outbox workers.
   *
   * @returns No value is returned.
   */
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.dataSource.manager.find(
        EntitySchemas.outbox_events,
        {
          where: { processed_at: IsNull(), failed_at: IsNull() },
          order: { created_at: 'ASC', id: 'ASC' },
          take: 50,
        },
      );
      for (const candidate of pending) await this.deliver(candidate.id);
    } catch {
      this.logger.error(
        'Outbox processing failed; pending events will be retried',
      );
    } finally {
      this.running = false;
    }
  }

  /**
   * Publish an event before setting `processed_at` (at-least-once delivery; clients deduplicate by `event_id`).
   * The row is locked with `FOR UPDATE SKIP LOCKED`, preventing multiple instances from sending it at the same time.
   * On publish failure, increment `attempts`; set `failed_at` (dead letter) once `MAX_OUTBOX_ATTEMPTS` is reached.
   *
   * @param id ID of the record to process.
   * @returns No value is returned.
   */
  private async deliver(id: string) {
    try {
      await this.dataSource.transaction(async (s) => {
        const event = await s.findOne(EntitySchemas.outbox_events, {
          where: { id, processed_at: IsNull(), failed_at: IsNull() },
          lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
        });
        if (!event) return;
        try {
          await this.realtime.publish(event.recipient_ids, event.topic, {
            event_id: event.id,
            ...event.payload,
          });
        } catch (error) {
          const attempts = event.attempts + 1;
          const deadLetter = attempts >= MAX_OUTBOX_ATTEMPTS;
          await updateEntity(s, EntitySchemas.outbox_events, event.id, {
            attempts,
            last_error: error instanceof Error ? error.message : String(error),
            failed_at: deadLetter ? new Date().toISOString() : null,
          });
          this.logger.warn(
            deadLetter
              ? `Outbox event ${event.id} dead-lettered after ${attempts} attempts`
              : `Outbox event ${event.id} publish failed (attempt ${attempts}); will retry`,
          );
          return;
        }
        await updateEntity(s, EntitySchemas.outbox_events, event.id, {
          processed_at: new Date().toISOString(),
        });
      });
    } catch {
      this.logger.warn(`Outbox event ${id} failed; it remains pending`);
    }
  }
}
