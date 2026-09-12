import { EntitySchemas, updateEntity } from '@shared/database';
import { DataSource, IsNull } from 'typeorm';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';

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
          where: { processed_at: IsNull() },
          order: { created_at: 'ASC', id: 'ASC' },
          take: 50,
        },
      );
      for (const candidate of pending) {
        try {
          const e = await this.dataSource.transaction(async (s) => {
            const event = await s.findOneBy(EntitySchemas.outbox_events, {
              id: candidate.id,
            });
            if (!event || event.processed_at) return null;
            await updateEntity(s, EntitySchemas.outbox_events, event.id, {
              processed_at: new Date().toISOString(),
            });
            return event;
          });
          if (e)
            this.realtime.publish(e.recipient_ids, e.topic, {
              event_id: e.id,
              ...e.payload,
            });
        } catch {
          this.logger.warn(
            `Outbox event ${candidate.id} failed; it remains pending`,
          );
        }
      }
    } catch {
      this.logger.error(
        'Outbox processing failed; pending events will be retried',
      );
    } finally {
      this.running = false;
    }
  }
}
