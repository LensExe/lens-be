import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  UnitOfWork,
  RealtimePublisher,
} from '@shared/database/unit-of-work/unit-of-work.port';

@Injectable()
export class OutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OutboxWorker.name);
  constructor(
    private readonly uow: UnitOfWork,
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
      const pending = await this.uow.read((s) =>
        s.find('outbox_events', { processed_at: null }, { limit: 50 }),
      );
      for (const candidate of pending) {
        try {
          const e = await this.uow.write(async (s) => {
            const event = await s.get('outbox_events', candidate.id);
            if (!event || event.processed_at) return null;
            // Fan-out: write one in-app notification row per recipient
            for (const user_id of event.recipient_ids) {
              const [existing] = await s.find('notifications', {
                user_id,
                event_id: event.id,
              });
              if (!existing)
                await s.insert('notifications', {
                  user_id,
                  event_id: event.id,
                  title: event.topic,
                  body: JSON.stringify(event.payload),
                });
            }
            await s.update('outbox_events', event.id, {
              processed_at: new Date().toISOString(),
            });
            return event;
          });
          if (e)
            this.realtime.publish(e.recipient_ids, 'notification.created', {
              event_id: e.id,
              topic: e.topic,
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
