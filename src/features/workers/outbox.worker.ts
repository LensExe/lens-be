import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  UnitOfWork,
  RealtimePublisher,
  NotificationDelivery,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { NotificationUseCases } from '@modules/notification/application/notifications';

@Injectable()
export class OutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OutboxWorker.name);
  constructor(
    private readonly uow: UnitOfWork,
    private readonly notifications: NotificationUseCases,
    private readonly realtime: RealtimePublisher,
    private readonly delivery: NotificationDelivery,
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
            await this.notifications.consume(s, event);
            for (const userId of event.recipient_ids) {
              const user = await s.get('users', userId);
              if (!user || user.status !== 'active') continue;
              const devices = await s.find('device_tokens', {
                user_id: userId,
              });
              const { invalidTokens } = await this.delivery.send({
                eventId: event.id,
                userId,
                email: user.email,
                tokens: devices.map((d) => d.token),
                title:
                  typeof event.payload.title === 'string'
                    ? event.payload.title
                    : event.topic,
                body:
                  typeof event.payload.body === 'string'
                    ? event.payload.body
                    : JSON.stringify(event.payload),
              });
              for (const d of devices)
                if (invalidTokens.includes(d.token))
                  await s.delete('device_tokens', d.id);
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
