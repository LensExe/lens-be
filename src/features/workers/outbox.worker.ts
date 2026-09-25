import { EntitySchemas, updateEntity } from '@shared/database';
import { DataSource, IsNull } from 'typeorm';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';

/** Số lần publish thất bại tối đa trước khi đưa sự kiện vào dead-letter (`failed_at`). */
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
  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.tick(), 2000);
    this.timer.unref();
  }
  onApplicationShutdown() {
    clearInterval(this.timer);
  }
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
   * Publish một sự kiện rồi mới đánh dấu `processed_at` (at-least-once; client khử trùng bằng `event_id`).
   * Dòng bị khoá `FOR UPDATE SKIP LOCKED` nên nhiều instance không gửi trùng cùng lúc.
   * Publish lỗi: tăng `attempts`; đủ `MAX_OUTBOX_ATTEMPTS` thì ghi `failed_at` (dead-letter).
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
